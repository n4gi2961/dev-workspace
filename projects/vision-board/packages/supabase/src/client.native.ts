/**
 * React Native Supabase Client
 *
 * Required dependencies in apps/mobile:
 * - react-native-url-polyfill
 * - @react-native-async-storage/async-storage
 *
 * IMPORTANT: Import 'react-native-url-polyfill/auto' at the app entry point
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { IStorage } from './types';

// AsyncStorage adapter will be injected from the app
let asyncStorageAdapter: IStorage | null = null;

/**
 * Set the AsyncStorage adapter for React Native
 * Call this at app initialization before using createClient
 *
 * @example
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * setStorageAdapter(AsyncStorage);
 */
export function setStorageAdapter(storage: IStorage): void {
  asyncStorageAdapter = storage;
}

// Singleton client instance
let client: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Create Supabase client for React Native
 *
 * @param url - Supabase project URL
 * @param anonKey - Supabase anon key
 */
export function createClient(url?: string, anonKey?: string) {
  if (!asyncStorageAdapter) {
    throw new Error(
      'AsyncStorage adapter not set. Call setStorageAdapter() before createClient().\n' +
      'Example:\n' +
      'import AsyncStorage from "@react-native-async-storage/async-storage";\n' +
      'import { setStorageAdapter } from "@vision-board/supabase";\n' +
      'setStorageAdapter(AsyncStorage);'
    );
  }

  if (!client) {
    const supabaseUrl = url || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = anonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase URL and Anon Key are required.\n' +
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
      );
    }

    client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: asyncStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Must be false for React Native
      },
    });
  }

  return client;
}

/**
 * Setup AppState listener for automatic session refresh
 * Call this once at app initialization
 *
 * @example
 * import { AppState } from 'react-native';
 * setupAppStateListener(AppState);
 */
export function setupAppStateListener(appState: {
  addEventListener: (
    type: 'change',
    listener: (state: string) => void
  ) => { remove: () => void };
}): { remove: () => void } {
  return appState.addEventListener('change', (state) => {
    if (!client) return;

    if (state === 'active') {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  });
}

/**
 * Reset client instance (useful for logout)
 */
export function resetClient(): void {
  client = null;
}
