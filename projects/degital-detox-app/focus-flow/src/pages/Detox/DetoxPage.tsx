import React, { useState } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
import { SelfImprovement as DetoxIcon } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { useDetoxTimer } from '../../hooks/useDetoxTimer';
import { getRandomTip } from '../../utils';
import { DETOX_TIPS } from '../../constants';
import { DetoxEndDialog } from '../../components/dialogs';
import { DetoxResultPage } from './DetoxResultPage';

const DetoxContainer = styled(Box)({
  textAlign: 'center',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

const DetoxButton = styled(Button)<{ isActive: boolean }>(({ theme, isActive }) => ({
  width: 200,
  height: 200,
  borderRadius: '50%',
  background: isActive 
    ? 'linear-gradient(135deg, #E76F51, #F4A261)' 
    : theme.custom.detoxGradient,
  color: 'white',
  fontSize: '1.125rem',
  fontWeight: 'bold',
  boxShadow: theme.custom.shadowMedium,
  transition: 'all 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  margin: '0 auto',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 10px 30px rgba(38, 70, 83, 0.3)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

const TipsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  marginTop: theme.spacing(3),
  maxWidth: 400,
  margin: '24px auto 0',
}));

const TimerDisplay = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  marginTop: theme.spacing(2),
}));

export const DetoxPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { isActive, formattedTime, elapsedTime, startTimer, stopTimer, resetTimer } = useDetoxTimer();
  const [currentTip] = React.useState(() => getRandomTip(DETOX_TIPS));
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  const handleDetoxStart = () => {
    startTimer();
    dispatch({ type: 'START_DETOX' });
  };

  const handleDetoxStop = () => {
    setShowEndDialog(true);
  };

  const handleEndDialogClose = () => {
    setShowEndDialog(false);
  };

  const handleEndDialogConfirm = () => {
    const duration = stopTimer();
    setSessionDuration(duration);
    setShowEndDialog(false);
    setShowResult(true);
    
    // AppContextのデトックスセッションを更新
    dispatch({ type: 'END_DETOX' });
    
    // ユーザーの統計を更新
    if (state.user) {
      const updatedUser = {
        ...state.user,
        stats: {
          ...state.user.stats,
          detoxTime: state.user.stats.detoxTime + duration,
          focusSessions: state.user.stats.focusSessions + 1,
        },
        detoxSessions: [
          ...state.user.detoxSessions,
          {
            id: Date.now().toString(),
            startTime: new Date(Date.now() - duration),
            endTime: new Date(),
            duration,
            completed: true,
          }
        ]
      };
      dispatch({ type: 'SET_USER', payload: updatedUser });
    }
  };

  const handleResultClose = () => {
    setShowResult(false);
    setSessionDuration(0);
  };

  const handleDetoxToggle = () => {
    if (isActive) {
      handleDetoxStop();
    } else {
      handleDetoxStart();
    }
  };

  if (showResult) {
    return (
      <DetoxResultPage
        sessionDuration={sessionDuration}
        onClose={handleResultClose}
      />
    );
  }

  return (
    <Box sx={{ mt: 8 }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          mb: 3,
          textAlign: 'center',
          color: 'text.primary',
          fontWeight: 600,
        }}
      >
        デジタルデトックス
      </Typography>

      <DetoxContainer>
        <DetoxButton
          isActive={isActive}
          onClick={handleDetoxToggle}
          aria-label={isActive ? 'デジタルデトックスを停止' : 'デジタルデトックスを開始'}
        >
          <DetoxIcon sx={{ fontSize: 60 }} />
          <span>{isActive ? '停止' : '開始'}</span>
        </DetoxButton>

        {isActive && (
          <TimerDisplay>
            {formattedTime}
          </TimerDisplay>
        )}

        <TipsCard>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              今日のTips
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentTip}
            </Typography>
          </CardContent>
        </TipsCard>
      </DetoxContainer>

      <DetoxEndDialog
        open={showEndDialog}
        onClose={handleEndDialogClose}
        onConfirm={handleEndDialogConfirm}
        currentDuration={formattedTime}
      />
    </Box>
  );
};