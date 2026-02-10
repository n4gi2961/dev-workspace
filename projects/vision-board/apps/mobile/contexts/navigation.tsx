import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationContextType {
  // Drawer state
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;

  // Selected board
  selectedBoardId: string | null;
  setSelectedBoardId: (id: string | null) => void;

  // Tab bar visibility
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

const SELECTED_BOARD_KEY = 'selected_board_id';

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpenState] = useState(false);
  const [selectedBoardId, setSelectedBoardIdState] = useState<string | null>(null);
  const [tabBarVisible, setTabBarVisibleState] = useState(true);

  // Load selected board ID on mount
  React.useEffect(() => {
    const loadSelectedBoard = async () => {
      try {
        const savedId = await AsyncStorage.getItem(SELECTED_BOARD_KEY);
        if (savedId) {
          setSelectedBoardIdState(savedId);
        }
      } catch {
        // Ignore error, use null
      }
    };
    loadSelectedBoard();
  }, []);

  const setDrawerOpen = useCallback((open: boolean) => {
    setDrawerOpenState(open);
  }, []);

  const toggleDrawer = useCallback(() => {
    setDrawerOpenState((prev) => !prev);
  }, []);

  const setTabBarVisible = useCallback((visible: boolean) => {
    setTabBarVisibleState(visible);
  }, []);

  const setSelectedBoardId = useCallback(async (id: string | null) => {
    setSelectedBoardIdState(id);
    try {
      if (id) {
        await AsyncStorage.setItem(SELECTED_BOARD_KEY, id);
      } else {
        await AsyncStorage.removeItem(SELECTED_BOARD_KEY);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const value = useMemo(
    () => ({
      drawerOpen,
      setDrawerOpen,
      toggleDrawer,
      selectedBoardId,
      setSelectedBoardId,
      tabBarVisible,
      setTabBarVisible,
    }),
    [drawerOpen, setDrawerOpen, toggleDrawer, selectedBoardId, setSelectedBoardId, tabBarVisible, setTabBarVisible]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
