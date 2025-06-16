import React from 'react';
import { Box, Container } from '@mui/material';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
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
          pb: 10, // ボトムナビゲーション分のスペース
          px: { xs: 2, sm: 3 },
        }}
      >
        {children}
      </Container>
      <BottomNavigation />
    </Box>
  );
};