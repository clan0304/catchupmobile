// app/(app)/index.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/auth';
import { getProfile, getAllProfiles } from '../../services/profile';
import { ProfileData } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  getUserConnections,
  getConnectionRequests,
  sendConnectionRequest,
} from '@/services/connections';
import { UserConnection } from '@/services/connections';
import { getUnreadMessageCount } from '../../services/messages';
import { supabase } from '../../lib/supabase';
import UserCard from '../../components/UserCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [requestingUserId, setRequestingUserId] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingRequestUserIds, setPendingRequestUserIds] = useState<
    Set<string>
  >(new Set());
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  // Animation for menu
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  // Animation for card swipe
  const position = useRef(new Animated.ValueXY()).current;
  const currentCardIndex = useRef(0);

  // Pan Responder setup for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  // Get rotation for the card based on gesture position
  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-30deg', '0deg', '30deg'],
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  // Reset card position to center
  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  // Handle swipe right (like/connect)
  const swipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (filteredProfiles.length > currentCardIndex.current) {
        const profile = filteredProfiles[currentCardIndex.current];
        handleConnectRequest(profile.id!);
      }
      advanceToNextCard();
    });
  };

  // Handle swipe left (pass)
  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      advanceToNextCard();
    });
  };

  // Move to next card
  const advanceToNextCard = () => {
    position.setValue({ x: 0, y: 0 });
    currentCardIndex.current += 1;

    // Force a re-render
    setFilteredProfiles([...filteredProfiles]);
  };

  // Load all data: user profile, connections, messages, etc.
  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch current user's profile
      const { profile } = await getProfile(user.id);
      if (profile) {
        setUserProfile(profile);
      }

      // Fetch user's connections
      const { connections: userConnections } = await getUserConnections(
        user.id
      );
      setConnections(userConnections);

      // Create a set of connected user IDs for quick lookup
      const connectedIds = new Set<string>();
      userConnections.forEach((conn: any) => connectedIds.add(conn.userId));
      setConnectedUserIds(connectedIds);

      // Fetch unread message count
      const { count } = await getUnreadMessageCount(user.id);
      setUnreadMessageCount(count);

      // Fetch pending connection requests
      const { requests } = await getConnectionRequests(user.id);
      setPendingRequestsCount(requests.length);

      // Track pending requests for the "Connect" button state
      // We also need to identify users who already have a pending request from current user
      const { data: sentRequests } = await supabase
        .from('connection_requests')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (sentRequests) {
        const pendingIds = new Set<string>();
        sentRequests.forEach((req) => pendingIds.add(req.receiver_id));
        setPendingRequestUserIds(pendingIds);
      }

      // Fetch all profiles
      const { profiles, error } = await getAllProfiles();
      if (error) {
        console.error('Error fetching profiles:', error);
      } else {
        // Filter out the current user and connected users
        const otherProfiles = profiles.filter(
          (profile) => profile.id !== user?.id && !connectedIds.has(profile.id!)
        );

        // Sort by newest first
        otherProfiles.sort((a, b) => {
          return (
            new Date(b.created_at || '').getTime() -
            new Date(a.created_at || '').getTime()
          );
        });

        setAllProfiles(otherProfiles);
        setFilteredProfiles(otherProfiles);

        // Reset the card index to start from first profile
        currentCardIndex.current = 0;
      }
    } catch (error) {
      console.error('Error in loadData:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Initial data load
  useEffect(() => {
    loadData();

    // Set up a polling interval for real-time updates (notifications, messages)
    const intervalId = setInterval(() => {
      if (user) {
        // Check for new connection requests
        getConnectionRequests(user.id).then(({ requests }: any) => {
          setPendingRequestsCount(requests.length);
        });

        // Check for new messages
        getUnreadMessageCount(user.id).then(({ count }) => {
          setUnreadMessageCount(count);
        });
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  // Handle connection request
  const handleConnectRequest = async (receiverId: string) => {
    if (!user) return;

    setRequestingUserId(receiverId);

    try {
      const { error } = await sendConnectionRequest(user.id, receiverId);

      if (error) {
        console.error('Error sending connection request:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to send connection request';
        Alert.alert('Error', errorMessage);
      } else {
        Alert.alert('Success', 'Connection request sent!');

        // Update pending request IDs
        setPendingRequestUserIds((prev) => new Set([...prev, receiverId]));
      }
    } catch (error) {
      console.error('Error in handleConnectRequest:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setRequestingUserId(null);
    }
  };

  // Navigate to chat with a user
  const navigateToChat = (userId: string, username: string) => {
    if (!connectedUserIds.has(userId)) {
      Alert.alert(
        'Not Connected',
        'You can only message users you are connected with.'
      );
      return;
    }

    router.push({
      pathname: '/(app)/chat/[userId]',
      params: { userId, username },
    });
  };

  // Navigate to messages screen
  const navigateToMessages = () => {
    router.push('/(app)/messages');
  };

  // Navigate to connections screen
  const navigateToConnections = () => {
    router.push('/(app)/connections');
  };

  // Profile menu functions
  const toggleProfileMenu = () => {
    if (profileMenuVisible) {
      // Close menu with animation
      Animated.timing(menuAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setProfileMenuVisible(false));
    } else {
      // Open menu with animation
      setProfileMenuVisible(true);
      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const navigateToProfile = () => {
    toggleProfileMenu();
    router.push('/(app)/profile-update');
  };

  const handleSignOut = () => {
    toggleProfileMenu();
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  // Render current card
  const renderCard = () => {
    // No more profiles to show
    if (
      filteredProfiles.length === 0 ||
      currentCardIndex.current >= filteredProfiles.length
    ) {
      return (
        <View className="items-center justify-center p-6 bg-white rounded-xl shadow-md mx-4">
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text className="text-lg font-bold text-gray-600 mt-4 text-center">
            No more profiles to show.
          </Text>
          <Text className="text-gray-500 text-center mt-2 mb-4">
            Check back later for new people!
          </Text>
          <TouchableOpacity
            className="bg-primary py-3 px-6 rounded-lg"
            onPress={handleRefresh}
          >
            <Text className="text-black font-semibold">Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Get current profile
    const profile = filteredProfiles[currentCardIndex.current];
    const isConnected = connectedUserIds.has(profile.id!);
    const isPendingRequest = pendingRequestUserIds.has(profile.id!);

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[getCardStyle(), { position: 'absolute' }]}
      >
        <UserCard
          profile={profile}
          isConnected={isConnected}
          isPendingRequest={isPendingRequest}
          onConnect={() => handleConnectRequest(profile.id!)}
          onNavigateToChat={() => navigateToChat(profile.id!, profile.username)}
          isRequesting={requestingUserId === profile.id}
        />
      </Animated.View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text className="mt-4 text-gray-600">Loading profiles...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Pull to refresh */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#5E72E4']}
          />
        }
        scrollEnabled={refreshing}
      >
        {/* Empty view for scroll area */}
        {refreshing ? <View style={{ height: 200 }} /> : null}

        {/* Content container - needed to prevent ScrollView from capturing swipe gestures */}
        <View style={{ flex: 1, minHeight: screenHeight - 200 }}>
          {/* Header with profile info */}
          <View className="flex-row justify-between items-center px-6 pt-6 pb-4">
            <View>
              <Text className="text-3xl font-bold text-gray-800">Welcome</Text>
              <Text className="text-xl text-gray-800">
                {userProfile?.username || 'User'}
              </Text>
            </View>

            <View className="flex-row items-center">
              {/* Notification icon with badge */}
              <TouchableOpacity
                className="mr-4 relative"
                onPress={navigateToConnections}
              >
                <Ionicons
                  name="notifications-outline"
                  size={28}
                  color="#5E72E4"
                />
                {pendingRequestsCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Messages button with badge */}
              <TouchableOpacity
                className="mr-4 relative"
                onPress={navigateToMessages}
              >
                <Ionicons name="mail-outline" size={28} color="#5E72E4" />
                {unreadMessageCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Profile photo */}
              <TouchableOpacity
                onPress={toggleProfileMenu}
                className="relative"
              >
                {userProfile?.photo_url ? (
                  <Image
                    source={{ uri: userProfile.photo_url }}
                    className="w-12 h-12 rounded-full border-2 border-primary"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center border-2 border-primary">
                    <Text className="text-gray-600 text-xl font-bold">
                      {userProfile?.username?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Swipe Card Area */}
          <View className="flex-1 justify-center items-center py-6">
            {renderCard()}
          </View>

          {/* Swipe Action Buttons */}
          {filteredProfiles.length > 0 &&
            currentCardIndex.current < filteredProfiles.length && (
              <View className="flex-row justify-evenly py-6">
                <TouchableOpacity
                  className="w-16 h-16 bg-red-500 rounded-full justify-center items-center shadow-md"
                  onPress={swipeLeft}
                >
                  <Ionicons name="close-outline" size={30} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-16 h-16 bg-green-500 rounded-full justify-center items-center shadow-md"
                  onPress={swipeRight}
                >
                  <Ionicons name="checkmark-outline" size={30} color="white" />
                </TouchableOpacity>
              </View>
            )}
        </View>
      </ScrollView>

      {/* Profile Menu Modal */}
      <Modal
        visible={profileMenuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={toggleProfileMenu}
      >
        <TouchableOpacity
          className="flex-1 bg-black bg-opacity-50"
          activeOpacity={1}
          onPress={toggleProfileMenu}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateY: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [screenHeight, 0],
                  }),
                },
              ],
            }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
          >
            <View className="py-2 px-5">
              {/* Handle indicator */}
              <View className="w-16 h-1 bg-gray-300 rounded-full mx-auto mb-4 mt-2" />

              {/* User info */}
              <View className="flex-row items-center mb-6 mt-2">
                {userProfile?.photo_url ? (
                  <Image
                    source={{ uri: userProfile.photo_url }}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <View className="w-16 h-16 rounded-full bg-gray-300 items-center justify-center">
                    <Text className="text-gray-600 text-2xl font-bold">
                      {userProfile?.username?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View className="ml-4">
                  <Text className="text-xl font-bold">
                    {userProfile?.username || 'User'}
                  </Text>
                  <Text className="text-gray-500">
                    {userProfile?.city || ''}
                  </Text>
                </View>
              </View>

              {/* Menu options */}
              <TouchableOpacity
                className="flex-row items-center py-4 border-t border-gray-200"
                onPress={navigateToProfile}
              >
                <Ionicons name="person-outline" size={24} color="#5E72E4" />
                <Text className="ml-4 text-lg">Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center py-4 border-t border-gray-200"
                onPress={() => {
                  toggleProfileMenu();
                  router.push('/(app)/connections');
                }}
              >
                <Ionicons name="people-outline" size={24} color="#5E72E4" />
                <Text className="ml-4 text-lg">My Connections</Text>
                {pendingRequestsCount > 0 && (
                  <View className="ml-2 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      {pendingRequestsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center py-4 border-t border-gray-200"
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                <Text className="ml-4 text-lg text-red-500">Sign Out</Text>
              </TouchableOpacity>

              <View className="h-6" />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
