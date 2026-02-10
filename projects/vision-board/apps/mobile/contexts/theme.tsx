import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  themeModes: { value: ThemeMode; label: string }[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'app_theme_mode';

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch {
        // Use default 'system' mode
      } finally {
        setIsInitialized(true);
      }
    };
    loadThemeMode();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  }, []);

  // Determine actual color scheme based on theme mode
  const colorScheme: 'light' | 'dark' =
    themeMode === 'system'
      ? (systemColorScheme || 'light')
      : themeMode;

  const themeModes = (['light', 'dark', 'system'] as ThemeMode[]).map((value) => ({
    value,
    label: THEME_MODE_LABELS[value],
  }));

  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, colorScheme, setThemeMode, themeModes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Re-export for compatibility with existing code
export function useColorScheme(): 'light' | 'dark' {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback when not inside ThemeProvider
    return 'light';
  }
  return context.colorScheme;
}
