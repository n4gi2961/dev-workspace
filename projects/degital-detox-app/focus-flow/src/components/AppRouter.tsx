import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { HomePage } from '../pages/Home/HomePage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { DetoxPage } from '../pages/Detox/DetoxPage';
import { GamesPage } from '../pages/Games/GamesPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { NAVIGATION_TABS } from '../constants';

export const AppRouter: React.FC = () => {
  const { state } = useAppContext();

  switch (state.activeTab) {
    case NAVIGATION_TABS.HOME:
      return <HomePage />;
    case NAVIGATION_TABS.DASHBOARD:
      return <DashboardPage />;
    case NAVIGATION_TABS.DETOX:
      return <DetoxPage />;
    case NAVIGATION_TABS.GAMES:
      return <GamesPage />;
    case NAVIGATION_TABS.SETTINGS:
      return <SettingsPage />;
    default:
      return <HomePage />;
  }
};