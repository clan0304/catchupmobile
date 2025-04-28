// app/(auth)/callback.tsx
import React, { useEffect } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback received');

        // If we're in the callback screen, we've already handled the OAuth in AuthProvider
        // Just redirect to the app after a short delay
        setTimeout(() => {
          router.replace('/(app)');
        }, 2000);
      } catch (error) {
        console.error('Error in auth callback:', error);
        // Redirect back to auth after a delay
        setTimeout(() => {
          router.replace('/(auth)');
        }, 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <SafeAreaView className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#5E72E4" />
      <Text className="mt-4 text-gray-600">Finalizing sign in...</Text>
    </SafeAreaView>
  );
}
