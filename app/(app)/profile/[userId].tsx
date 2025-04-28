// app/(app)/profile/[userId].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/auth';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../../types/auth';
import { sendConnectionRequest } from '../../../services/connections';

// Profile View Component - completely rewritten to avoid the TypeScript error
export default function ProfileView() {
  const { user } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{
    profile: ProfileData | null;
    isConnected: boolean;
    isPendingRequest: boolean;
    connectionCount: number;
    commonConnections: string[];
  }>({
    profile: null,
    isConnected: false,
    isPendingRequest: false,
    connectionCount: 0,
    commonConnections: [],
  });
  const [isRequestingConnection, setIsRequestingConnection] = useState(false);

  // Load all profile data
  useEffect(() => {
    let isMounted = true;

    const fetchProfileData = async () => {
      if (!user || !userId) return;

      try {
        setLoading(true);

        // Skip if viewing own profile
        if (user.id === userId) {
          router.replace('/(app)/profile-update');
          return;
        }

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError || !profileData) {
          throw new Error('Profile not found');
        }

        // Check connection status
        const { data: connectionData, error: connectionError } = await supabase
          .from('connections')
          .select('id')
          .or(
            `and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`
          );

        // Check pending requests
        const { data: pendingData, error: pendingError } = await supabase
          .from('connection_requests')
          .select('*')
          .eq('sender_id', user.id)
          .eq('receiver_id', userId)
          .eq('status', 'pending');

        // Get connection count
        const { data: countData, error: countError } = await supabase
          .from('connections')
          .select('id', { count: 'exact' })
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        // Get current user's connections
        const { data: userConnections, error: userConnError } = await supabase
          .from('connections')
          .select('id, user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        // Get other user's connections
        const { data: otherConnections, error: otherConnError } = await supabase
          .from('connections')
          .select('id, user1_id, user2_id')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        // Find common connection ids
        const userConnectionIds = new Set();
        if (userConnections) {
          userConnections.forEach((conn) => {
            const otherId =
              conn.user1_id === user.id ? conn.user2_id : conn.user1_id;
            userConnectionIds.add(otherId);
          });
        }

        const otherConnectionIds = new Set();
        if (otherConnections) {
          otherConnections.forEach((conn) => {
            const otherId =
              conn.user1_id === userId ? conn.user2_id : conn.user1_id;
            otherConnectionIds.add(otherId);
          });
        }

        // Get the intersection of connection ids
        const commonIds = [...userConnectionIds].filter((id) =>
          otherConnectionIds.has(id)
        );

        // Get common connection names
        const commonConnections: string[] = [];
        if (commonIds.length > 0) {
          const { data: commonProfiles } = await supabase
            .from('profiles')
            .select('username')
            .in('id', commonIds);

          if (commonProfiles) {
            commonConnections.push(...commonProfiles.map((p) => p.username));
          }
        }

        // Only update state if component is still mounted
        if (isMounted) {
          setProfileData({
            profile: profileData,
            isConnected: Boolean(connectionData && connectionData.length > 0),
            isPendingRequest: Boolean(pendingData && pendingData.length > 0),
            connectionCount: countData?.length || 0,
            commonConnections,
          });
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading profile:', err);
          setError('Failed to load profile information');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfileData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, userId]);

  // Handle send connection request
  const handleSendConnectionRequest = async () => {
    if (!user || !userId) return;

    setIsRequestingConnection(true);

    try {
      const { error } = await sendConnectionRequest(user.id, userId);

      if (error) {
        console.error('Error sending connection request:', error);
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'Failed to send connection request'
        );
      } else {
        setProfileData((prev) => ({
          ...prev,
          isPendingRequest: true,
        }));
        Alert.alert('Success', 'Connection request sent!');
      }
    } catch (error) {
      console.error('Error in handleSendConnectionRequest:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsRequestingConnection(false);
    }
  };

  // Navigate to chat
  const navigateToChat = () => {
    if (!profileData.isConnected) {
      Alert.alert(
        'Not Connected',
        'You need to be connected to message this user'
      );
      return;
    }

    router.push({
      pathname: '/(app)/chat/[userId]',
      params: { userId, username: profileData.profile?.username },
    });
  };

  // Open Instagram link
  const openInstagram = () => {
    if (!profileData.profile?.instagram_url) return;

    Linking.canOpenURL(profileData.profile.instagram_url).then((supported) => {
      if (supported) {
        Linking.openURL(profileData.profile?.instagram_url!);
      } else {
        Alert.alert('Error', 'Cannot open Instagram link');
      }
    });
  };

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text className="mt-4 text-gray-600 text-center">{error}</Text>
        <TouchableOpacity
          className="mt-8 bg-primary py-3 px-6 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-black font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text className="mt-4 text-gray-600">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // Destructure for easier access
  const {
    profile,
    isConnected,
    isPendingRequest,
    connectionCount,
    commonConnections,
  } = profileData;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: profile?.username || 'Profile',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="arrow-back" size={24} color="#5E72E4" />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <ScrollView>
          {/* Profile Header - Photo and Basic Info */}
          <View className="items-center mt-6">
            {profile?.photo_url ? (
              <Image
                source={{ uri: profile.photo_url }}
                className="w-32 h-32 rounded-full"
              />
            ) : (
              <View className="w-32 h-32 rounded-full bg-gray-300 items-center justify-center">
                <Text className="text-gray-600 text-4xl font-bold">
                  {profile?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}

            <Text className="text-2xl font-bold text-gray-800 mt-4">
              {profile?.username}
            </Text>
            <Text className="text-base text-gray-600 mt-1">
              {profile?.city}
            </Text>

            {/* Connection Stats */}
            <View className="flex-row items-center mt-2">
              <Text className="text-gray-600">
                <Text className="font-bold text-gray-800">
                  {connectionCount}
                </Text>{' '}
                connections
              </Text>

              {commonConnections.length > 0 && (
                <Text className="text-gray-600 ml-3">
                  <Text className="font-bold text-gray-800">
                    {commonConnections.length}
                  </Text>{' '}
                  mutual
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-center mt-6 w-full px-6">
              {!isConnected && !isPendingRequest ? (
                <TouchableOpacity
                  className="bg-primary py-3 px-6 rounded-lg flex-row items-center"
                  onPress={handleSendConnectionRequest}
                  disabled={isRequestingConnection}
                >
                  {isRequestingConnection ? (
                    <ActivityIndicator size="small" color="black" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={20} color="black" />
                      <Text className="text-black font-semibold ml-2">
                        Connect
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : !isConnected && isPendingRequest ? (
                <View className="bg-gray-300 py-3 px-6 rounded-lg flex-row items-center">
                  <Ionicons name="time-outline" size={20} color="black" />
                  <Text className="text-black font-semibold ml-2">Pending</Text>
                </View>
              ) : (
                <TouchableOpacity
                  className="bg-primary py-3 px-6 rounded-lg flex-row items-center"
                  onPress={navigateToChat}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="black" />
                  <Text className="text-black font-semibold ml-2">Message</Text>
                </TouchableOpacity>
              )}

              {profile?.instagram_url && (
                <TouchableOpacity
                  className="ml-4 bg-purple-500 py-3 px-6 rounded-lg flex-row items-center"
                  onPress={openInstagram}
                >
                  <Ionicons name="logo-instagram" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Instagram
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mx-6 my-6" />

          {/* Bio Section */}
          <View className="px-6 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              About
            </Text>
            <Text className="text-gray-700 leading-6">
              {profile?.bio || 'No bio available'}
            </Text>
          </View>

          {/* Interests Section */}
          <View className="px-6 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              Interests
            </Text>
            <View className="flex-row flex-wrap">
              {profile?.interests && profile.interests.length > 0 ? (
                profile.interests.map((interest, index) => (
                  <View
                    key={index}
                    className="bg-blue-100 px-3 py-1.5 rounded-full mr-2 mb-2"
                  >
                    <Text className="text-blue-800">{interest}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-500">No interests listed</Text>
              )}
            </View>
          </View>

          {/* Common Connections Section */}
          {commonConnections.length > 0 && (
            <View className="px-6 mb-8">
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Mutual Connections
              </Text>
              <View className="bg-gray-50 p-4 rounded-lg">
                {commonConnections.slice(0, 3).map((name, index) => (
                  <Text key={index} className="text-gray-700 py-1">
                    • {name}
                  </Text>
                ))}
                {commonConnections.length > 3 && (
                  <Text className="text-primary font-medium mt-2">
                    +{commonConnections.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
