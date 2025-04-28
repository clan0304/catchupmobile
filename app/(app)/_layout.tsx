// app/(app)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Tabs, Stack, useRouter } from 'expo-router';
import { useAuth } from '../../context/auth';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUnreadMessageCount } from '../../services/messages';
import { getConnectionRequests } from '../../services/connections';
import { View, Text, ActivityIndicator } from 'react-native';

export default function AppLayout() {
  const { user, loading, profileComplete } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load unread message count and connection requests count
  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      try {
        setIsLoading(true);

        // Load unread message count
        const { count } = await getUnreadMessageCount(user.id);
        setUnreadCount(count);

        // Load pending connection requests
        const { requests } = await getConnectionRequests(user.id);
        setPendingRequestsCount(requests.length);
      } catch (error) {
        console.error('Error loading counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCounts();

    // Set up a polling interval for realtime updates
    const intervalId = setInterval(loadCounts, 30000); // Every 30 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  // If not authenticated, redirect to auth
  if (!user && !loading) {
    return <Redirect href="/(auth)" />;
  }

  // If profile not complete, redirect to profile setup
  if (user && !loading && !profileComplete) {
    return <Redirect href="/(app)/profile-setup" />;
  }

  // If still loading auth state, show loading indicator
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5E72E4', // Primary color
        tabBarInactiveTintColor: '#9CA3AF', // Gray-400
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB', // Gray-200
          elevation: 0,
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connections',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="people-outline" size={size} color={color} />
              {pendingRequestsCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens - not shown in tab bar */}
      <Tabs.Screen
        name="profile-setup"
        options={{
          href: null, // Hide this from the tab bar
        }}
      />
      <Tabs.Screen
        name="profile-update"
        options={{
          href: null, // Hide this from the tab bar
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Hide this from the tab bar
        }}
      />
    </Tabs>
  );
}
