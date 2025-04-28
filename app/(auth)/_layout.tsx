// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../context/auth';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text className="mt-4 text-gray-600">Checking login status...</Text>
      </View>
    );
  }

  // If user is already authenticated, redirect to app
  if (user && !loading) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Sign In' }} />
      {/* Add any additional auth screens here, such as:
          - verify-otp
          - auth-callback
          - terms-of-service
      */}
    </Stack>
  );
}
