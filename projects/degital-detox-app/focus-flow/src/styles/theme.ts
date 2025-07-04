import { createTheme } from '@mui/material/styles';
import { THEME_COLORS } from '../constants';

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      focusGradient: string;
      detoxGradient: string;
      accentGradient: string;
      reverseGradient: string;
      shadowLight: string;
      shadowMedium: string;
    };
  }
  
  interface ThemeOptions {
    custom?: {
      focusGradient?: string;
      detoxGradient?: string;
      accentGradient?: string;
      reverseGradient?: string;
      shadowLight?: string;
      shadowMedium?: string;
    };
  }
}

const createAppTheme = (isDark: boolean = false, themeColor: keyof typeof THEME_COLORS = 'oceanCalm') => {
  const selectedColors = THEME_COLORS[themeColor];
  
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: selectedColors.primary,
        light: selectedColors.secondary,
        dark: selectedColors.primary,
      },
      secondary: {
        main: selectedColors.secondary,
        light: selectedColors.accent,
        dark: selectedColors.secondary,
      },
      error: {
        main: selectedColors.accent,
        light: selectedColors.accent,
        dark: selectedColors.accent,
      },
      background: {
        default: isDark ? '#121212' : selectedColors.background,
        paper: isDark ? '#1E1E1E' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#FFFFFF' : '#212121',
        secondary: isDark ? '#B0BEC5' : '#757575',
      },
    },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1024,
      xl: 1200,
    },
  },
  custom: {
    focusGradient: `linear-gradient(135deg, ${selectedColors.primary}, ${selectedColors.secondary})`,
    detoxGradient: `linear-gradient(135deg, ${selectedColors.primary}, ${selectedColors.secondary}, ${selectedColors.accent})`,
    accentGradient: `linear-gradient(45deg, ${selectedColors.secondary}, ${selectedColors.accent})`,
    reverseGradient: `linear-gradient(225deg, ${selectedColors.accent}, ${selectedColors.secondary}, ${selectedColors.primary})`,
    shadowLight: isDark ? '0 2px 10px rgba(0, 0, 0, 0.3)' : '0 2px 10px rgba(38, 70, 83, 0.1)',
    shadowMedium: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(38, 70, 83, 0.15)',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 20,
          padding: '10px 24px',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 10px rgba(38, 70, 83, 0.1)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 70,
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          boxShadow: isDark ? '0 -2px 10px rgba(0, 0, 0, 0.3)' : '0 -2px 10px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 'auto',
          '&.Mui-selected': {
            color: selectedColors.primary,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              color: '#34C759', // iOS/Android標準の緑色
              '& + .MuiSwitch-track': {
                backgroundColor: '#34C759',
                opacity: 1,
              },
            },
          },
          '& .MuiSwitch-track': {
            backgroundColor: isDark ? '#39393D' : '#E5E5EA', // iOS/Android標準のグレー
            opacity: 1,
          },
        },
      },
    },
  },
});
};

export const theme = createAppTheme();
export { createAppTheme };