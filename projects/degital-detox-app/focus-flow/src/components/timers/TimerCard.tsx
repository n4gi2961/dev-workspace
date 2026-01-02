import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box, 
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  PlayArrow as PlayIcon, 
  Pause as PauseIcon, 
  Stop as StopIcon, 
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTimer } from '../../hooks/useTimer';
import { TimerType, PomodoroState } from '../../types/timer';

const TimerCardContainer = styled(Card)<{ timerColor: string }>(({ theme, timerColor }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'visible',
  border: `2px solid ${timerColor}20`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.custom.shadowMedium,
  },
  transition: 'all 0.2s ease',
}));

const TimerIcon = styled(Box)<{ timerColor: string }>(({ timerColor }) => ({
  fontSize: '2rem',
  textAlign: 'center',
  marginBottom: '8px',
  background: `linear-gradient(135deg, ${timerColor}, ${timerColor}80)`,
  borderRadius: '50%',
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
}));

const TimerDisplay = styled(Typography)<{ timerColor: string }>(({ timerColor }) => ({
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: timerColor,
  textAlign: 'center',
  fontFamily: 'monospace',
}));

const ControlButton = styled(Button)<{ controlvariant: 'play' | 'pause' | 'stop' | 'reset' }>(({ theme, controlvariant }) => {
  const colors = {
    play: '#4CAF50',
    pause: '#FF9800',
    stop: '#F44336',
    reset: '#757575'
  };
  
  return {
    minWidth: 'auto',
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: colors[controlvariant],
    color: 'white',
    '&:hover': {
      backgroundColor: colors[controlvariant],
      opacity: 0.8,
    },
  };
});

const ProgressBar = styled(LinearProgress)<{ timerColor: string }>(({ timerColor }) => ({
  height: 4,
  borderRadius: 2,
  backgroundColor: `${timerColor}20`,
  '& .MuiLinearProgress-bar': {
    backgroundColor: timerColor,
  },
}));

interface TimerCardProps {
  type: TimerType;
  customDuration?: number;
  onDurationChange?: (duration: number) => void;
}

export const TimerCard: React.FC<TimerCardProps> = ({ 
  type, 
  customDuration, 
  onDurationChange 
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempDuration, setTempDuration] = useState(customDuration || 0);
  
  const { 
    state, 
    startTimer, 
    pauseTimer, 
    stopTimer, 
    resetTimer, 
    formattedTime, 
    progress, 
    config 
  } = useTimer({ 
    type, 
    customDuration,
    onComplete: () => {
      // タイマー完了時の処理
      console.log(`${config.name}タイマーが完了しました！`);
    }
  });

  const handleSettingsOpen = () => {
    setTempDuration(customDuration || config.defaultDuration);
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleDurationSave = () => {
    if (tempDuration > 0) {
      onDurationChange?.(tempDuration);
    }
    setSettingsOpen(false);
  };

  const getStatusText = () => {
    if (!state.isActive) return '停止中';
    if (state.isPaused) return '一時停止';
    if ('isBreak' in state && state.isBreak) return '休憩中';
    return '実行中';
  };

  const getTimerTitle = () => {
    if (type === 'pomodoro' && 'isBreak' in state && 'cycle' in state) {
      const pomodoroState = state as PomodoroState;
      return `${config.name} ${pomodoroState.isBreak ? '(休憩)' : '(集中)'} - サイクル${pomodoroState.cycle}`;
    }
    return config.name;
  };

  return (
    <>
      <TimerCardContainer timerColor={config.color}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              {getTimerTitle()}
            </Typography>
            <IconButton 
              size="small" 
              onClick={handleSettingsOpen}
              sx={{ color: config.color }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>

          <TimerIcon timerColor={config.color}>
            {config.icon}
          </TimerIcon>

          <TimerDisplay timerColor={config.color} sx={{ mb: 1 }}>
            {formattedTime}
          </TimerDisplay>

          <Typography 
            variant="caption" 
            sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}
          >
            {getStatusText()}
          </Typography>

          <ProgressBar 
            variant="determinate" 
            value={progress} 
            timerColor={config.color}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 'auto' }}>
            {state.isActive && (
              <>
                <ControlButton 
                  controlvariant={state.isPaused ? 'play' : 'pause'}
                  onClick={state.isPaused ? startTimer : pauseTimer}
                >
                  {state.isPaused ? <PlayIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                </ControlButton>
                <ControlButton controlvariant="stop" onClick={stopTimer}>
                  <StopIcon fontSize="small" />
                </ControlButton>
              </>
            )}
            {!state.isActive && (
              <>
                <ControlButton controlvariant="play" onClick={startTimer}>
                  <PlayIcon fontSize="small" />
                </ControlButton>
                <ControlButton controlvariant="reset" onClick={resetTimer}>
                  <RefreshIcon fontSize="small" />
                </ControlButton>
              </>
            )}
          </Box>
        </CardContent>
      </TimerCardContainer>

      <Dialog open={settingsOpen} onClose={handleSettingsClose}>
        <DialogTitle>{config.name}の設定</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="時間（分）"
            type="number"
            fullWidth
            variant="outlined"
            value={tempDuration}
            onChange={(e) => setTempDuration(parseInt(e.target.value) || 0)}
            inputProps={{ min: 1, max: 120 }}
            sx={{ mt: 2 }}
          />
          {type === 'pomodoro' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ポモドーロタイマーは集中時間のみ設定できます。休憩時間は5分固定です。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose}>キャンセル</Button>
          <Button onClick={handleDurationSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};