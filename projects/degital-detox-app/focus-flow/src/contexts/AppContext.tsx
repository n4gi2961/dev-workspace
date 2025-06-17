import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, NavigationTab } from '../types';
import { DEFAULT_USER_SETTINGS, DEFAULT_SCORE, NAVIGATION_TABS } from '../constants';

const initialState: AppState = {
  user: {
    id: 'default-user',
    name: 'ユーザー',
    settings: {
      detoxReminders: true,
      focusAlerts: false,
      theme: 'light' as const,
      notifications: true,
      themeColor: 'oceanCalm' as const,
    },
    stats: {
      dailyScore: DEFAULT_SCORE,
      screenTime: 0,
      focusSessions: 0,
      detoxTime: 0,
      productivityGain: 0,
      weeklyTrend: [50, 60, 55, 70, 65, 75, 80],
    },
    gameScores: [],
    detoxSessions: [],
  },
  isDetoxActive: false,
  currentScore: DEFAULT_SCORE,
  activeTab: NAVIGATION_TABS.HOME as NavigationTab,
  detoxSession: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    
    case 'START_DETOX':
      return {
        ...state,
        isDetoxActive: true,
        detoxSession: {
          id: Date.now().toString(),
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          completed: false,
        },
      };
    
    case 'END_DETOX':
      return {
        ...state,
        isDetoxActive: false,
        detoxSession: state.detoxSession
          ? {
              ...state.detoxSession,
              endTime: new Date(),
              duration: Date.now() - state.detoxSession.startTime.getTime(),
              completed: true,
            }
          : null,
      };
    
    case 'UPDATE_SCORE':
      return {
        ...state,
        currentScore: action.payload,
        user: state.user
          ? {
              ...state.user,
              stats: {
                ...state.user.stats,
                dailyScore: action.payload,
              },
            }
          : null,
      };
    
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };
    
    case 'ADD_GAME_SCORE':
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              gameScores: [...state.user.gameScores, action.payload],
            }
          : null,
      };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              settings: {
                ...state.user.settings,
                ...action.payload,
              },
            }
          : null,
      };
    
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};