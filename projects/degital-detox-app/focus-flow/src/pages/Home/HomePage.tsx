import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { FocusScoreCard } from './components/FocusScoreCard';
import { QuickStatsGrid } from './components/QuickStatsGrid';
import { useAppContext } from '../../contexts/AppContext';

export const HomePage: React.FC = () => {
  const { state } = useAppContext();

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
        今日の集中力
      </Typography>

      <FocusScoreCard score={state.currentScore} />
      
      <QuickStatsGrid />
    </Box>
  );
};