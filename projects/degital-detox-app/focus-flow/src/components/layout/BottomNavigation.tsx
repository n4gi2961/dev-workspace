import React from 'react';
import {
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Home as HomeIcon,
  Analytics as AnalyticsIcon,
  SelfImprovement as DetoxIcon,
  Games as GamesIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { NAVIGATION_TABS } from '../../constants';
import { NavigationTab } from '../../types';

const StyledBottomNavigation = styled(MuiBottomNavigation)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  height: 70,
  paddingBottom: 'env(safe-area-inset-bottom)',
}));

const DetoxFab = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  top: -85,
  left: '50%',
  transform: 'translateX(-50%)',
  background: theme.custom.detoxGradient,
  width: 67,
  height: 67,
  zIndex: 1001,
  '&:hover': {
    background: theme.custom.detoxGradient,
    transform: 'translateX(-50%) scale(1.1)',
  },
  boxShadow: theme.custom.shadowMedium,
}));

const navigationItems = [
  {
    value: NAVIGATION_TABS.HOME,
    label: 'ホーム',
    icon: <HomeIcon />,
  },
  {
    value: NAVIGATION_TABS.DASHBOARD,
    label: '分析',
    icon: <AnalyticsIcon />,
  },
  {
    value: NAVIGATION_TABS.DETOX,
    label: '',
    icon: null, // FABで表示
  },
  {
    value: NAVIGATION_TABS.GAMES,
    label: 'トレーニング',
    icon: <GamesIcon />,
  },
  {
    value: NAVIGATION_TABS.SETTINGS,
    label: '設定',
    icon: <SettingsIcon />,
  },
];

export const BottomNavigation: React.FC = () => {
  const { state, dispatch } = useAppContext();

  const handleChange = (_: React.SyntheticEvent, newValue: NavigationTab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: newValue });
  };

  const handleDetoxClick = () => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: NAVIGATION_TABS.DETOX as NavigationTab });
  };

  return (
    <Paper elevation={8} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
      <Box sx={{ position: 'relative' }}>
        <DetoxFab
          color="primary"
          onClick={handleDetoxClick}
          aria-label="デジタルデトックス"
        >
          <DetoxIcon sx={{ color: 'white' }} />
        </DetoxFab>
        
        <StyledBottomNavigation
          value={state.activeTab}
          onChange={handleChange}
          showLabels
        >
          {navigationItems.map((item) => (
            <BottomNavigationAction
              key={item.value}
              value={item.value}
              label={item.label}
              icon={item.icon}
              sx={{
                minWidth: item.value === NAVIGATION_TABS.DETOX ? 0 : 'auto',
                opacity: item.value === NAVIGATION_TABS.DETOX ? 0 : 1,
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              }}
            />
          ))}
        </StyledBottomNavigation>
      </Box>
    </Paper>
  );
};