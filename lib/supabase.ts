// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill';

// Environment variables from .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Check if we're in a browser/React Native environment or server environment
const isClient = typeof window !== 'undefined';

/**
 * Custom storage adapter for Supabase that works across platforms
 * - Uses SecureStore for sensitive auth tokens on native platforms
 * - Falls back to AsyncStorage for other data on native platforms
 * - Uses localStorage on web
 */
const createCustomStorage = () => {
  return {
    getItem: async (key: string) => {
      try {
        if (Platform.OS === 'web') {
          const value = localStorage.getItem(key);
          return value;
        } else {
          // Use SecureStore for auth tokens
          if (key.includes('supabase.auth.token')) {
            return await SecureStore.getItemAsync(key);
          }
          return await AsyncStorage.getItem(key);
        }
      } catch (error) {
        console.error('Error getting item from storage:', error);
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem(key, value);
        } else {
          // Use SecureStore for auth tokens
          if (key.includes('supabase.auth.token')) {
            await SecureStore.setItemAsync(key, value);
          } else {
            await AsyncStorage.setItem(key, value);
          }
        }
      } catch (error) {
        console.error('Error setting item in storage:', error);
      }
    },
    removeItem: async (key: string) => {
      try {
        if (Platform.OS === 'web') {
          localStorage.removeItem(key);
        } else {
          // Use SecureStore for auth tokens
          if (key.includes('supabase.auth.token')) {
            await SecureStore.deleteItemAsync(key);
          } else {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Error removing item from storage:', error);
      }
    },
  };
};

// Create Supabase client with appropriate storage options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isClient ? (createCustomStorage() as any) : undefined,
    autoRefreshToken: isClient,
    persistSession: isClient,
    detectSessionInUrl: isClient && Platform.OS === 'web',
  },
});

// Set up AppState listener to refresh token when app comes back to foreground on native platforms
if (isClient && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      // Refresh session when app comes back to foreground
      supabase.auth.refreshSession();
    }
  });
}