import React from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  TouchApp as TouchIcon,
  Looks as NumberIcon,
  Clear as NeitherIcon
} from '@mui/icons-material';
import { ResponseType, SessionStats, DNBGameState, DNB_GAME_STATES } from '../../types/dnb';
import { DNB_COLORS, formatDNBLevel } from '../../constants/dnb';

const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  width: '100%',
  maxWidth: 400,
  margin: '0 auto',
}));

const ResponseButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  justifyContent: 'center',
}));

const ResponseButton = styled(Button)<{ 
  canRespond: boolean;
  buttonType: 'position' | 'number' | 'both' | 'neither';
}>(({ theme, canRespond, buttonType }) => {
  const getButtonColor = () => {
    if (!canRespond) return DNB_COLORS.BUTTON_DISABLED;
    switch (buttonType) {
      case 'position': return DNB_COLORS.GRID_ACTIVE;     // #2A9D8F (teal)
      case 'number': return DNB_COLORS.LEVEL_BACKGROUND;  // #E76F51 (orange-red)
      case 'both': return DNB_COLORS.CORRECT_FEEDBACK;    // #4CAF50 (green)
      case 'neither': return DNB_COLORS.BUTTON_PRIMARY;   // #264653 (dark blue-green)
      default: return DNB_COLORS.BUTTON_DISABLED;
    }
  };

  const getHoverColor = () => {
    if (!canRespond) return DNB_COLORS.BUTTON_DISABLED;
    switch (buttonType) {
      case 'position': return '#248A7D';  // Darker teal
      case 'number': return '#D85F42';    // Darker orange-red
      case 'both': return '#43A047';      // Darker green
      case 'neither': return '#1E4A56';   // Darker blue-green
      default: return DNB_COLORS.BUTTON_DISABLED;
    }
  };

  return {
    flex: 1,
    minHeight: 60,
    borderRadius: 20,
    fontSize: '0.9rem',
    fontWeight: 600,
    backgroundColor: getButtonColor(),
    color: DNB_COLORS.BUTTON_TEXT,
    border: 'none',
    boxShadow: canRespond 
      ? theme.custom?.shadowMedium || '0 4px 12px rgba(0,0,0,0.15)'
      : 'none',
    transition: 'all 0.2s ease-in-out',
    
    '&:hover': {
      backgroundColor: getHoverColor(),
      transform: canRespond ? 'translateY(-2px)' : 'none',
      boxShadow: canRespond 
        ? theme.custom?.shadowMedium || '0 6px 16px rgba(0,0,0,0.2)'
        : 'none',
    },
    
    '&:disabled': {
      backgroundColor: DNB_COLORS.BUTTON_DISABLED,
      color: '#FFFFFF',
      opacity: 0.6,
    }
  };
});

const StatsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom?.shadowLight || '0 2px 8px rgba(0,0,0,0.1)',
}));

const StatItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0.5, 0),
}));

const ControlButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(1),
}));

const ControlButton = styled(IconButton)(({ theme }) => ({
  width: 48,
  height: 48,
  backgroundColor: theme.palette.mode === 'dark' ? '#3A3A3A' : '#F5F5F5',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? '#4A4A4A' : '#E5E5E5',
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease',
}));

interface DNBControlsProps {
  canRespond: boolean;
  onResponse: (type: ResponseType) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  gameState: DNBGameState;
  sessionStats: SessionStats;
  currentTrialIndex: number;
  totalTrials: number;
  nLevel: number;
  feedback?: 'correct' | 'incorrect' | null;
}

export const DNBControls: React.FC<DNBControlsProps> = ({
  canRespond,
  onResponse,
  onPause,
  onResume,
  onStop,
  gameState,
  sessionStats,
  currentTrialIndex,
  totalTrials,
  nLevel,
  feedback
}) => {
  const isPlaying = gameState === DNB_GAME_STATES.PLAYING ||
                   gameState === DNB_GAME_STATES.STIMULUS_SHOW ||
                   gameState === DNB_GAME_STATES.INTERVAL;

  const isPaused = gameState === DNB_GAME_STATES.PAUSED;
  
  // 応答可能な試行数（N個目以降の試行数）
  const responsiveTrials = Math.max(0, totalTrials - nLevel);
  const progress = responsiveTrials > 0 ? (sessionStats.responseCount / responsiveTrials) * 100 : 0;
  
  const correctTotal = sessionStats.correctPositions + sessionStats.correctNumbers + sessionStats.correctBoth + sessionStats.correctNeither;
  const accuracy = sessionStats.responseCount > 0 
    ? ((sessionStats.responseCount - sessionStats.falsePositives) / sessionStats.responseCount) * 100 
    : 0;

  return (
    <ControlsContainer>
      {/* レベル表示 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <Chip
          label={formatDNBLevel(nLevel)}
          sx={{
            backgroundColor: DNB_COLORS.LEVEL_BACKGROUND,
            color: DNB_COLORS.LEVEL_TEXT,
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}
        />
      </Box>

      {/* プログレス表示 */}
      {totalTrials > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Response {sessionStats.responseCount} / {responsiveTrials}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundColor: DNB_COLORS.GRID_ACTIVE,
              },
            }}
          />
        </Box>
      )}

      {/* 応答ボタン */}
      {isPlaying && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ResponseButtonsContainer>
            <ResponseButton
              canRespond={canRespond}
              buttonType="position"
              onClick={() => onResponse('position')}
              disabled={!canRespond}
              startIcon={<TouchIcon />}
            >
              位置が同じ
            </ResponseButton>
            <ResponseButton
              canRespond={canRespond}
              buttonType="number"
              onClick={() => onResponse('number')}
              disabled={!canRespond}
              startIcon={<NumberIcon />}
            >
              数字が同じ
            </ResponseButton>
          </ResponseButtonsContainer>
          <ResponseButtonsContainer>
            <ResponseButton
              canRespond={canRespond}
              buttonType="both"
              onClick={() => onResponse('both')}
              disabled={!canRespond}
              startIcon={<TouchIcon />}
            >
              すべて同じ
            </ResponseButton>
            <ResponseButton
              canRespond={canRespond}
              buttonType="neither"
              onClick={() => onResponse('neither')}
              disabled={!canRespond}
              startIcon={<NeitherIcon />}
            >
              すべて異なる
            </ResponseButton>
          </ResponseButtonsContainer>
        </Box>
      )}

      {/* フィードバック表示 */}
      {feedback && (
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Typography
            variant="h6"
            sx={{
              color: feedback === 'correct' 
                ? DNB_COLORS.CORRECT_FEEDBACK 
                : DNB_COLORS.INCORRECT_FEEDBACK,
              fontWeight: 'bold'
            }}
          >
            {feedback === 'correct' ? '正解！' : '不正解'}
          </Typography>
        </Box>
      )}

      {/* 応答可能状態の説明 */}
      {isPlaying && !canRespond && (
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {currentTrialIndex < nLevel 
              ? `${nLevel - currentTrialIndex}試行後から応答可能`
              : '刺激表示中は応答できません'
            }
          </Typography>
        </Box>
      )}

      {/* 統計情報 */}
      {sessionStats.responseCount > 0 && (
        <StatsCard>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              現在の成績
            </Typography>
            <StatItem>
              <Typography variant="body2">正答率:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {accuracy.toFixed(1)}%
              </Typography>
            </StatItem>
            <StatItem>
              <Typography variant="body2">正解数:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {correctTotal}
              </Typography>
            </StatItem>
            <StatItem>
              <Typography variant="body2">応答数:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {sessionStats.responseCount}
              </Typography>
            </StatItem>
            {sessionStats.responseCount > 0 && (
              <StatItem>
                <Typography variant="body2">平均反応時間:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {(sessionStats.totalResponseTime / sessionStats.responseCount).toFixed(0)}ms
                </Typography>
              </StatItem>
            )}
          </CardContent>
        </StatsCard>
      )}

      {/* コントロールボタン */}
      <ControlButtonsContainer>
        {isPaused ? (
          <ControlButton onClick={onResume} title="再開">
            <PlayIcon />
          </ControlButton>
        ) : isPlaying ? (
          <ControlButton onClick={onPause} title="一時停止">
            <PauseIcon />
          </ControlButton>
        ) : null}
        
        {(isPlaying || isPaused) && (
          <ControlButton onClick={onStop} title="停止" sx={{ ml: 1 }}>
            <StopIcon />
          </ControlButton>
        )}
      </ControlButtonsContainer>
    </ControlsContainer>
  );
};