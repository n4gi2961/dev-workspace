import React from 'react';
import { Box, Container } from '@mui/material';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '../../contexts/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { state } = useAppContext();
  const { isBreathingSessionActive } = state;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Header />
      <Container
        component="main"
        maxWidth="lg"
        sx={{
          flex: 1,
          py: 2,
          pb: isBreathingSessionActive ? 2 : 10, // 呼吸セッション中はボトムナビゲーション分のスペースを省く
          px: { xs: 2, sm: 3 },
        }}
      >
        {children}
      </Container>
      {!isBreathingSessionActive && <BottomNavigation />}
    </Box>
  );
};