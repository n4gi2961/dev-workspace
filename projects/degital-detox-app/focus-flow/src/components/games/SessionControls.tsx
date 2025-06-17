import React from 'react';
import { Box, Typography, IconButton, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { SessionState, SESSION_STATES } from '../../constants/breathing';

const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(3),
  marginTop: theme.spacing(4),
}));

const StatsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  width: '100%',
  maxWidth: 300,
}));

const ControlButtonsRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
}));

const PrimaryControlButton = styled(IconButton)(({ theme }) => ({
  width: 64,
  height: 64,
  background: theme.custom.focusGradient,
  color: 'white',
  '&:hover': {
    background: theme.custom.accentGradient,
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease',
  boxShadow: theme.custom.shadowMedium,
}));

const SecondaryControlButton = styled(IconButton)(({ theme }) => ({
  width: 48,
  height: 48,
  background: theme.palette.mode === 'dark' ? '#3A3A3A' : '#F5F5F5',
  color: theme.palette.text.primary,
  '&:hover': {
    background: theme.palette.mode === 'dark' ? '#4A4A4A' : '#E5E5E5',
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease',
}));

const StatItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 0),
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#3A3A3A' : '#F0F0F0'}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

interface SessionControlsProps {
  sessionState: SessionState;
  onPauseResume: () => void;
  onStop: () => void;
  breathCount: number;
  currentPhase?: string;
  phaseProgress?: number;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  sessionState,
  onPauseResume,
  onStop,
  breathCount,
  currentPhase = '',
  phaseProgress = 0,
}) => {
  const isActive = sessionState === SESSION_STATES.ACTIVE;
  const isPaused = sessionState === SESSION_STATES.PAUSED;
  const isPreparing = sessionState === SESSION_STATES.PREPARING;

  const getStateText = () => {
    switch (sessionState) {
      case SESSION_STATES.PREPARING:
        return '準備中...';
      case SESSION_STATES.ACTIVE:
        return '瞑想中';
      case SESSION_STATES.PAUSED:
        return '一時停止中';
      default:
        return '';
    }
  };

  return (
    <ControlsContainer>
      {/* セッション統計カード */}
      <StatsCard>
        <CardContent>
          <Typography
            variant="h6"
            sx={{ textAlign: 'center', mb: 2, fontWeight: 600 }}
          >
            {getStateText()}
          </Typography>

          <StatItem>
            <Typography variant="body2" color="text.secondary">
              呼吸回数
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {breathCount}回
            </Typography>
          </StatItem>

          {currentPhase && (
            <StatItem>
              <Typography variant="body2" color="text.secondary">
                現在のフェーズ
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {currentPhase}
              </Typography>
            </StatItem>
          )}

          {phaseProgress > 0 && (
            <StatItem>
              <Typography variant="body2" color="text.secondary">
                フェーズ進捗
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {Math.round(phaseProgress)}%
              </Typography>
            </StatItem>
          )}
        </CardContent>
      </StatsCard>

      {/* コントロールボタン */}
      {!isPreparing && (
        <ControlButtonsRow>
          <SecondaryControlButton onClick={onStop} aria-label="停止">
            <StopIcon />
          </SecondaryControlButton>

          <PrimaryControlButton onClick={onPauseResume} aria-label={isActive ? '一時停止' : '再開'}>
            {isActive ? <PauseIcon sx={{ fontSize: 32 }} /> : <PlayIcon sx={{ fontSize: 32 }} />}
          </PrimaryControlButton>
        </ControlButtonsRow>
      )}

      {/* セッション状態に応じたヒント */}
      {isPaused && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', fontStyle: 'italic' }}
        >
          リラックスして、準備ができたら再開ボタンを押してください
        </Typography>
      )}

      {isActive && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', fontStyle: 'italic' }}
        >
          深く、ゆっくりと呼吸に集中しましょう
        </Typography>
      )}

      {isPreparing && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', fontStyle: 'italic' }}
        >
          心地よい姿勢で座り、準備を整えてください
        </Typography>
      )}
    </ControlsContainer>
  );
};