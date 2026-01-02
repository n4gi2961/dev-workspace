import React, { useState, useCallback, useMemo } from 'react';
import { Box, Typography, Button, Divider, Checkbox } from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  PlayArrow as PlayIcon, 
  Pause as PauseIcon, 
  Stop as StopIcon 
} from '@mui/icons-material';
import { TimerRow } from './TimerRow';
import { TimerType } from '../../types/timer';
import { TIMER_CONFIGS } from '../../constants/timers';
import { useBulkTimerControl } from '../../hooks/useBulkTimerControl';

const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  background: theme.palette.mode === 'dark' ? '#1A1A1A' : '#F5F5F5',
  borderRadius: 12,
}));

const BulkControlButton = styled(Button)<{ controlvariant: 'play' | 'pause' | 'stop' }>(({ theme, controlvariant }) => {
  const colors = {
    play: '#4CAF50',
    pause: '#FF9800',
    stop: '#F44336'
  };
  
  return {
    minWidth: 80,
    height: 36,
    borderRadius: 8,
    padding: '6px 16px',
    backgroundColor: colors[controlvariant],
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: 500,
    '&:hover': {
      backgroundColor: colors[controlvariant],
      opacity: 0.8,
    },
    '&:disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
    },
  };
});

interface TimerDurations {
  pomodoro: number;
  water: number;
  stand: number;
}

interface BreakDurations {
  pomodoro: number;
}

interface TimerStates {
  pomodoro: { isActive: boolean; isPaused: boolean };
  water: { isActive: boolean; isPaused: boolean };
  stand: { isActive: boolean; isPaused: boolean };
}

export const TimerList: React.FC = () => {
  const { registerTimerControl, bulkStart, bulkPause, bulkStop } = useBulkTimerControl();
  
  const [timerDurations, setTimerDurations] = useState<TimerDurations>({
    pomodoro: TIMER_CONFIGS.pomodoro.defaultDuration,
    water: TIMER_CONFIGS.water.defaultDuration,
    stand: TIMER_CONFIGS.stand.defaultDuration,
  });

  const [breakDurations, setBreakDurations] = useState<BreakDurations>({
    pomodoro: 5,
  });

  const [selectedTimers, setSelectedTimers] = useState<Set<TimerType>>(new Set());
  const [timerStates, setTimerStates] = useState<TimerStates>({
    pomodoro: { isActive: false, isPaused: false },
    water: { isActive: false, isPaused: false },
    stand: { isActive: false, isPaused: false },
  });

  const handleDurationChange = useCallback((type: TimerType, duration: number) => {
    setTimerDurations(prev => ({
      ...prev,
      [type]: duration
    }));
  }, []);

  const handleBreakDurationChange = useCallback((breakDuration: number) => {
    setBreakDurations(prev => ({
      ...prev,
      pomodoro: breakDuration
    }));
  }, []);

  const handleSelectionChange = useCallback((type: TimerType, selected: boolean) => {
    setSelectedTimers(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(type);
      } else {
        newSet.delete(type);
      }
      return newSet;
    });
  }, []);

  const handleTimerStateChange = useCallback((type: TimerType, isActive: boolean, isPaused: boolean) => {
    setTimerStates(prev => ({
      ...prev,
      [type]: { isActive, isPaused }
    }));
  }, []);

  const handleBulkStart = useCallback(() => {
    bulkStart(Array.from(selectedTimers));
  }, [selectedTimers, bulkStart]);

  const handleBulkPause = useCallback(() => {
    bulkPause(Array.from(selectedTimers));
  }, [selectedTimers, bulkPause]);

  const handleBulkStop = useCallback(() => {
    bulkStop(Array.from(selectedTimers));
  }, [selectedTimers, bulkStop]);

  const getSelectedActiveTimers = () => {
    return Array.from(selectedTimers).filter(type => timerStates[type].isActive);
  };

  const getSelectedPausedTimers = () => {
    return Array.from(selectedTimers).filter(type => 
      timerStates[type].isActive && timerStates[type].isPaused
    );
  };

  const allTimerTypes = useMemo<TimerType[]>(() => ['pomodoro', 'water', 'stand'], []);
  const hasSelectedTimers = selectedTimers.size > 0;
  const isAllSelected = selectedTimers.size === allTimerTypes.length;
  const selectedActiveTimers = getSelectedActiveTimers();
  const selectedPausedTimers = getSelectedPausedTimers();
  const hasActiveSelected = selectedActiveTimers.length > 0;
  const hasPausedSelected = selectedPausedTimers.length > 0;

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedTimers(new Set(allTimerTypes));
    } else {
      setSelectedTimers(new Set());
    }
  }, [allTimerTypes]);

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          textAlign: 'center',
          color: 'text.primary',
          fontWeight: 600,
        }}
      >
        タイマー機能
      </Typography>

      {/* 一括操作コントロール */}
      <HeaderContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Checkbox 
            checked={isAllSelected}
            indeterminate={hasSelectedTimers && !isAllSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
            sx={{ 
              color: (theme) => theme.palette.primary.main,
              '&.Mui-checked': { color: (theme) => theme.palette.primary.main }
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BulkControlButton
              controlvariant="play"
              onClick={handleBulkStart}
              disabled={!hasSelectedTimers}
              startIcon={<PlayIcon />}
            >
              開始
            </BulkControlButton>
            
            <BulkControlButton
              controlvariant="pause"
              onClick={handleBulkPause}
              disabled={!hasActiveSelected || hasPausedSelected}
              startIcon={<PauseIcon />}
            >
              一時停止
            </BulkControlButton>
            
            <BulkControlButton
              controlvariant="stop"
              onClick={handleBulkStop}
              disabled={!hasActiveSelected}
              startIcon={<StopIcon />}
            >
              停止
            </BulkControlButton>
          </Box>
        </Box>
      </HeaderContainer>

      <Divider sx={{ mb: 2 }} />

      {/* タイマーリスト */}
      <Box>
        {(['pomodoro', 'water', 'stand'] as TimerType[]).map((type) => (
          <TimerRow
            key={`${type}-${timerDurations[type]}-${type === 'pomodoro' ? breakDurations.pomodoro : 0}`}
            type={type}
            customDuration={timerDurations[type]}
            customBreakDuration={type === 'pomodoro' ? breakDurations.pomodoro : undefined}
            isSelected={selectedTimers.has(type)}
            onSelectionChange={(selected) => handleSelectionChange(type, selected)}
            onDurationChange={(duration) => handleDurationChange(type, duration)}
            onBreakDurationChange={type === 'pomodoro' ? handleBreakDurationChange : undefined}
            onStateChange={(isActive, isPaused) => handleTimerStateChange(type, isActive, isPaused)}
            onRegisterControl={registerTimerControl}
          />
        ))}
      </Box>
    </Box>
  );
};