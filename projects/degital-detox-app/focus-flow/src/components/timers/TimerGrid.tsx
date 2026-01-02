import React, { useState } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { TimerCard } from './TimerCard';
import { TimerType } from '../../types/timer';
import { TIMER_CONFIGS } from '../../constants/timers';

interface TimerDurations {
  pomodoro: number;
  water: number;
  stand: number;
}

export const TimerGrid: React.FC = () => {
  const [timerDurations, setTimerDurations] = useState<TimerDurations>({
    pomodoro: TIMER_CONFIGS.pomodoro.defaultDuration,
    water: TIMER_CONFIGS.water.defaultDuration,
    stand: TIMER_CONFIGS.stand.defaultDuration,
  });

  const handleDurationChange = (type: TimerType, duration: number) => {
    setTimerDurations(prev => ({
      ...prev,
      [type]: duration
    }));
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <TimerCard
          key={`pomodoro-${timerDurations.pomodoro}`}
          type="pomodoro"
          customDuration={timerDurations.pomodoro}
          onDurationChange={(duration) => handleDurationChange('pomodoro', duration)}
        />
        
        <TimerCard
          key={`water-${timerDurations.water}`}
          type="water"
          customDuration={timerDurations.water}
          onDurationChange={(duration) => handleDurationChange('water', duration)}
        />
        
        <TimerCard
          key={`stand-${timerDurations.stand}`}
          type="stand"
          customDuration={timerDurations.stand}
          onDurationChange={(duration) => handleDurationChange('stand', duration)}
        />
        
        <Box
          sx={{
            height: '100%',
            borderRadius: 2,
            border: '2px dashed',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            fontSize: '0.875rem',
            textAlign: 'center',
            p: 2,
            minHeight: 200,
          }}
        >
          今後の機能<br />追加予定
        </Box>
      </Box>
    </Box>
  );
};