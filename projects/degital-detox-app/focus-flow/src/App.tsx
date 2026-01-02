import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { TimerProvider } from './contexts/TimerContext';
import { Layout } from './components/layout/Layout';
import { AppRouter } from './components/AppRouter';
import { createAppTheme } from './styles/theme';

const ThemedApp: React.FC = () => {
  const { state } = useAppContext();
  const theme = React.useMemo(() => {
    return createAppTheme(
      state.user?.settings?.theme === 'dark',
      state.user?.settings?.themeColor || 'oceanCalm'
    );
  }, [state.user?.settings?.theme, state.user?.settings?.themeColor]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <AppRouter />
      </Layout>
    </ThemeProvider>
  );
};

function App() {
  return (
    <AppProvider>
      <TimerProvider>
        <ThemedApp />
      </TimerProvider>
    </AppProvider>
  );
}

export default App;
