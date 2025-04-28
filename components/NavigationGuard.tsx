// components/NavigationGuard.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect, useSegments, useRouter } from 'expo-router';
import { useAuth } from '../context/auth';

/**
 * Navigation guard component that controls access to protected routes
 * and redirects users based on authentication state
 */
export default function NavigationGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, profileComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (user) {
      // User is signed in
      if (inAuthGroup) {
        // If in auth group, redirect to app
        router.replace('/(app)');
      } else if (
        inAppGroup &&
        !profileComplete &&
        segments[1] !== 'profile-setup'
      ) {
        // If profile not complete and not on profile setup page, redirect to profile setup
        router.replace('/(app)/profile-setup');
      }
    } else {
      // User is not signed in
      if (!inAuthGroup) {
        // If not in auth group, redirect to auth
        router.replace('/(auth)');
      }
    }
  }, [user, loading, segments, profileComplete]);

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
