// app/index.tsx
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../context/auth';

/**
 * Root index redirects to the appropriate route based on auth state
 */
export default function Index() {
  const { user, loading, profileComplete } = useAuth();

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  // If authenticated, redirect to app or profile setup
  if (user) {
    if (!profileComplete) {
      return <Redirect href="/(app)/profile-setup" />;
    }
    return <Redirect href="/(app)" />;
  }

  // If not authenticated, redirect to auth
  return <Redirect href="/(auth)" />;
}
