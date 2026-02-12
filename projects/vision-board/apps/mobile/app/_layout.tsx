import 'react-native-url-polyfill/auto'; // Must be first for Supabase
import '../global.css';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { NotoSerifJP_400Regular } from '@expo-google-fonts/noto-serif-jp';
import { MPLUSRounded1c_400Regular } from '@expo-google-fonts/m-plus-rounded-1c';
import { ZenMaruGothic_400Regular } from '@expo-google-fonts/zen-maru-gothic';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import {
  setStorageAdapter,
  setupAppStateListener,
} from '@vision-board/supabase';
import { secureStorage } from '../lib/secureStorage';

import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from '../contexts/auth';
import { I18nProvider } from '../contexts/i18n';
import { ThemeProvider, useColorScheme } from '../contexts/theme';

// Initialize Supabase storage adapter with SecureStore (encrypted)
setStorageAdapter(secureStorage);

// Setup AppState listener for session refresh
setupAppStateListener(AppState);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(main)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
    NotoSerifJP_400Regular,
    MPLUSRounded1c_400Regular,
    ZenMaruGothic_400Regular,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <RootLayoutNav />
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(main)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
