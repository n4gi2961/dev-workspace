import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Paper,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  PlayArrow as PlayIcon, 
  Pause as PauseIcon, 
  Stop as StopIcon, 
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTimer } from '../../hooks/useTimer';
import { TimerType } from '../../types/timer';

const TimerRowContainer = styled(Paper)<{ 
  timerColor: string; 
  isSelected: boolean; 
  isActive: boolean; 
  isPaused: boolean;
  isCompleted: boolean;
}>(({ theme, timerColor, isSelected, isActive, isPaused, isCompleted }) => {
  let borderStyle = isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`;
  let boxShadow = isSelected ? theme.custom.shadowMedium : theme.custom.shadowLight;
  let animation = '';

  if (isActive && !isPaused) {
    // 実行中：光らせる
    borderStyle = `2px solid ${theme.palette.primary.main}`;
    boxShadow = `0 0 20px ${theme.palette.primary.main}40, ${theme.custom.shadowMedium}`;
    animation = 'glow 2s ease-in-out infinite alternate';
  } else if (isActive && isPaused) {
    if (isCompleted && timerColor === '#E76F51') { // ポモドーロのみ点滅
      // タイマー終了後の一時停止：ゆっくり点滅で強調
      borderStyle = `2px solid ${theme.palette.success.main}`;
      boxShadow = `0 0 15px ${theme.palette.success.main}40, ${theme.custom.shadowMedium}`;
      animation = 'completedBlink 3s ease-in-out infinite';
    } else {
      // 通常の一時停止：実行中より目立たない配色
      borderStyle = `2px solid ${theme.palette.warning.main}60`;
      boxShadow = `0 0 8px ${theme.palette.warning.main}20, ${theme.custom.shadowLight}`;
    }
  }

  return {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1),
    borderRadius: 12,
    background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
    border: borderStyle,
    boxShadow: boxShadow,
    transition: 'all 0.2s ease',
    animation: animation,
    position: 'relative', // 絶対配置の基準点として設定
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: isActive && !isPaused ? 
        `0 0 25px ${theme.palette.primary.main}50, ${theme.custom.shadowMedium}` : 
        theme.custom.shadowMedium,
    },
    '@keyframes glow': {
      '0%': {
        boxShadow: `0 0 10px ${theme.palette.primary.main}30, ${theme.custom.shadowMedium}`,
      },
      '100%': {
        boxShadow: `0 0 20px ${theme.palette.primary.main}60, ${theme.custom.shadowMedium}`,
      },
    },
    '@keyframes completedBlink': {
      '0%, 60%': {
        opacity: 1,
        boxShadow: `0 0 15px ${theme.palette.success.main}40, ${theme.custom.shadowMedium}`,
      },
      '70%, 100%': {
        opacity: 0.7,
        boxShadow: `0 0 25px ${theme.palette.success.main}60, ${theme.custom.shadowMedium}`,
      },
    },
  };
});

const TimerIcon = styled(Box)(({ theme }) => ({
  fontSize: '1.5rem',
  marginRight: '12px',
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.main}80)`,
  borderRadius: '50%',
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const TimerName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  minWidth: 80,
  marginRight: theme.spacing(2),
  fontSize: '0.95rem',
}));

const TimerDisplay = styled(Typography)(({ theme }) => ({
  fontSize: '1.1rem',
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  fontFamily: 'monospace',
  minWidth: 60,
  marginRight: '12px',
}));

const CircularProgressContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(2),
}));

const CircularProgressBar = styled(CircularProgress)(({ theme }) => ({
  color: theme.palette.primary.main,
  '& .MuiCircularProgress-circle': {
    strokeLinecap: 'round',
  },
}));

const CircularProgressBackground = styled(CircularProgress)(({ theme }) => ({
  color: `${theme.palette.primary.main}20`,
  position: 'absolute',
  '& .MuiCircularProgress-circle': {
    strokeLinecap: 'round',
  },
}));

const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  minWidth: 108, // 固定幅でボタン位置を統一 (32px * 3 + 6px * 2 margin)
  justifyContent: 'flex-start',
  marginLeft: -16, // 再生ボタンの半分のピクセル分左に移動 (32px / 2 = 16px)
}));

const SettingsButtonContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 10, // 設定ボタンを固定位置に配置（16px - 6px = 10px）
}));

const ControlButton = styled(IconButton)<{ controlvariant: 'play' | 'pause' | 'stop' }>(({ theme, controlvariant }) => {
  const getColor = () => {
    switch (controlvariant) {
      case 'play':
        return '#4CAF50';
      case 'pause':
        return '#FF9800';
      case 'stop':
        return '#F44336';
      default:
        return theme.palette.primary.main;
    }
  };
  
  const color = getColor();
  
  return {
    width: 32,
    height: 32,
    marginRight: theme.spacing(0.25), // 間隔を詰める
    backgroundColor: color,
    color: 'white',
    '&:hover': {
      backgroundColor: color,
      opacity: 0.8,
    },
  };
});

interface TimerRowProps {
  type: TimerType;
  customDuration?: number;
  customBreakDuration?: number;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onDurationChange?: (duration: number) => void;
  onBreakDurationChange?: (breakDuration: number) => void;
  onStateChange?: (isActive: boolean, isPaused: boolean) => void;
  onRegisterControl?: (type: TimerType, control: { start: () => void; pause: () => void; stop: () => void }) => void;
}

export const TimerRow: React.FC<TimerRowProps> = ({ 
  type, 
  customDuration,
  customBreakDuration,
  isSelected,
  onSelectionChange,
  onDurationChange,
  onBreakDurationChange,
  onStateChange,
  onRegisterControl
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempDuration, setTempDuration] = useState(customDuration || 0);
  const [tempBreakDuration, setTempBreakDuration] = useState(customBreakDuration || 5);
  
  const { 
    state, 
    startTimer, 
    pauseTimer, 
    stopTimer, 
    formattedTime, 
    progress, 
    config 
  } = useTimer({ 
    type, 
    customDuration,
    customBreakDuration,
    onComplete: () => {
      console.log(`${config.name}タイマーが完了しました！`);
    }
  });

  const handleStart = useCallback(() => {
    startTimer();
  }, [startTimer]);

  const handlePause = useCallback(() => {
    pauseTimer();
  }, [pauseTimer]);

  const handleStop = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  // 状態変更を親に通知
  useEffect(() => {
    onStateChange?.(state.isActive, state.isPaused);
  }, [state.isActive, state.isPaused, onStateChange]);

  // 一括操作用のコントロールを登録
  useEffect(() => {
    onRegisterControl?.(type, {
      start: handleStart,
      pause: handlePause,
      stop: handleStop,
    });
  }, [type, handleStart, handlePause, handleStop, onRegisterControl]);

  const handleSettingsOpen = () => {
    setTempDuration(customDuration || config.defaultDuration);
    if (type === 'pomodoro' && 'breakDuration' in state) {
      setTempBreakDuration((state as any).breakDuration || 5);
    }
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleDurationSave = () => {
    if (tempDuration > 0) {
      onDurationChange?.(tempDuration);
      if (type === 'pomodoro' && onBreakDurationChange) {
        onBreakDurationChange(tempBreakDuration);
      }
    }
    setSettingsOpen(false);
  };


  const getTimerTitle = () => {
    return config.name;
  };

  return (
    <>
      <TimerRowContainer 
        timerColor={config.color} 
        isSelected={isSelected}
        isActive={state.isActive}
        isPaused={state.isPaused}
        isCompleted={state.isCompleted || false}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', marginLeft: '-12px' }}>
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelectionChange(e.target.checked)}
            sx={{ 
              color: (theme) => theme.palette.primary.main,
              '&.Mui-checked': { color: (theme) => theme.palette.primary.main }
            }}
          />
          
          <TimerIcon>
            {config.icon}
          </TimerIcon>
          
          <TimerName>
            {getTimerTitle()}
          </TimerName>
          
          <CircularProgressContainer>
            <CircularProgressBackground
              variant="determinate"
              value={100}
              size={48}
              thickness={4}
            />
            <CircularProgressBar
              variant="determinate"
              value={progress}
              size={48}
              thickness={4}
            />
          </CircularProgressContainer>
          
          <TimerDisplay>
            {formattedTime}
          </TimerDisplay>
          
          <ControlsContainer>
            {state.isActive ? (
              <>
                <ControlButton 
                  controlvariant={state.isPaused ? 'play' : 'pause'}
                  onClick={state.isPaused ? handleStart : handlePause}
                  size="small"
                >
                  {state.isPaused ? <PlayIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                </ControlButton>
                <ControlButton controlvariant="stop" onClick={handleStop} size="small">
                  <StopIcon fontSize="small" />
                </ControlButton>
              </>
            ) : (
              <ControlButton controlvariant="play" onClick={handleStart} size="small">
                <PlayIcon fontSize="small" />
              </ControlButton>
            )}
          </ControlsContainer>
        </Box>
        
        <SettingsButtonContainer>
          <IconButton 
            onClick={handleSettingsOpen}
            sx={{ 
              color: (theme) => theme.palette.primary.main,
              width: 32,
              height: 32
            }}
            size="small"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </SettingsButtonContainer>
      </TimerRowContainer>

      <Dialog open={settingsOpen} onClose={handleSettingsClose}>
        <DialogTitle>{config.name}の設定</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={type === 'pomodoro' ? "集中時間（分）" : "時間（分）"}
            type="number"
            fullWidth
            variant="outlined"
            value={tempDuration}
            onChange={(e) => setTempDuration(parseInt(e.target.value) || 0)}
            inputProps={{ min: 1, max: 120 }}
            sx={{ mt: 2 }}
          />
          {type === 'pomodoro' && (
            <>
              <TextField
                margin="dense"
                label="休憩時間（分）"
                type="number"
                fullWidth
                variant="outlined"
                value={tempBreakDuration}
                onChange={(e) => setTempBreakDuration(parseInt(e.target.value) || 5)}
                inputProps={{ min: 1, max: 30 }}
                sx={{ mt: 2 }}
              />
            </>
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