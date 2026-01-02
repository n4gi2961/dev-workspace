import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAppContext } from '../../contexts/AppContext';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: theme.custom.focusGradient,
  boxShadow: theme.custom.shadowMedium,
}));

const LogoContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const LogoIcon = styled('div')(({ theme }) => ({
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.2rem',
}));

export const Header: React.FC = () => {
  const { state } = useAppContext();

  return (
    <StyledAppBar position="fixed" elevation={0}>
      <Toolbar>
        <LogoContainer sx={{ flexGrow: 1 }}>
          <LogoIcon>⏳</LogoIcon>
          <Typography variant="h6" component="h1" sx={{ color: 'white', fontWeight: 600 }}>
            FocusFlow
          </Typography>
        </LogoContainer>
        
        {state.isDetoxActive && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 20,
              px: 2,
              py: 0.5,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
              デトックス中
            </Typography>
          </Box>
        )}
      </Toolbar>
    </StyledAppBar>
  );
};