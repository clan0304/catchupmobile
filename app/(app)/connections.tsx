// app/(app)/connections.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/auth';
import {
  getUserConnections,
  disconnectUser,
  getConnectionRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
} from '../../services/connections';
import { Ionicons } from '@expo/vector-icons';
import { UserConnection } from '../../services/connections';
import { ConnectionRequest } from '../../types/connections';
import { router } from 'expo-router';
import { getProfile } from '../../services/profile';

export default function ConnectionsScreen() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnectingIds, setDisconnectingIds] = useState<{
    [key: string]: boolean;
  }>({});
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});

  // Load connections and connection requests
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user's connections
      const { connections: userConnections, error } = await getUserConnections(
        user.id
      );

      if (error) {
        console.error('Error loading connections:', error);
        Alert.alert('Error', 'Failed to load your connections');
      } else {
        setConnections(userConnections);
      }

      // Load connection requests
      const { requests } = await getConnectionRequests(user.id);
      setConnectionRequests(requests);

      // Fetch profile info for each sender
      const profiles: { [key: string]: any } = {};

      for (const request of requests) {
        if (!profiles[request.sender_id]) {
          const { profile } = await getProfile(request.sender_id);
          if (profile) {
            profiles[request.sender_id] = profile;
          }
        }
      }

      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error in loadData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Load connections on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Handle disconnecting from a user
  const handleDisconnect = async (connectionId: string, username: string) => {
    Alert.alert(
      'Disconnect',
      `Are you sure you want to disconnect from ${username}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setDisconnectingIds((prev) => ({ ...prev, [connectionId]: true }));

            try {
              const { error } = await disconnectUser(connectionId);

              if (error) {
                console.error('Error disconnecting:', error);
                Alert.alert('Error', 'Failed to disconnect. Please try again.');
              } else {
                // Remove the connection from the list
                setConnections((prev) =>
                  prev.filter((conn) => conn.connectionId !== connectionId)
                );
                Alert.alert('Success', `You've disconnected from ${username}`);
              }
            } catch (error) {
              console.error('Error in handleDisconnect:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setDisconnectingIds((prev) => ({
                ...prev,
                [connectionId]: false,
              }));
            }
          },
        },
      ]
    );
  };

  // Handle accepting connection request
  const handleAcceptRequest = async (requestId: string, senderName: string) => {
    if (!user) return;

    setAcceptingId(requestId);

    try {
      const { error } = await acceptConnectionRequest(requestId);

      if (error) {
        console.error('Error accepting connection:', error);
        Alert.alert('Error', 'Failed to accept connection request');
      } else {
        Alert.alert('Success', `You are now connected with ${senderName}!`);

        // Refresh the connections and requests lists
        loadData();
      }
    } catch (error) {
      console.error('Error in handleAcceptRequest:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  // Handle declining connection request
  const handleDeclineRequest = async (
    requestId: string,
    senderName: string
  ) => {
    if (!user) return;

    setDecliningId(requestId);

    try {
      const { error } = await declineConnectionRequest(requestId);

      if (error) {
        console.error('Error declining connection:', error);
        Alert.alert('Error', 'Failed to decline connection request');
      } else {
        // Remove the request from the list
        setConnectionRequests((prev) =>
          prev.filter((req) => req.id !== requestId)
        );
        Alert.alert(
          'Success',
          `You've declined the request from ${senderName}`
        );
      }
    } catch (error) {
      console.error('Error in handleDeclineRequest:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setDecliningId(null);
    }
  };

  // Navigate to chat with a connection
  const navigateToChat = (userId: string, username: string) => {
    router.push({
      pathname: '/(app)/chat/[userId]',
      params: { userId, username },
    });
  };

  // Render connection request item
  const renderConnectionRequest = (request: ConnectionRequest) => {
    const profile = userProfiles[request.sender_id];

    return (
      <View
        key={request.id}
        className="flex-row items-center bg-blue-50 rounded-xl p-4 mb-3"
      >
        {profile?.photo_url ? (
          <Image
            source={{ uri: profile.photo_url }}
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <View className="w-16 h-16 rounded-full bg-gray-300 items-center justify-center">
            <Text className="text-gray-600 text-xl font-bold">
              {request.sender_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text className="text-lg font-semibold text-gray-800">
              {request.sender_name}
            </Text>
            <View className="bg-blue-100 ml-2 px-2 py-1 rounded">
              <Text className="text-xs text-blue-800">Request</Text>
            </View>
          </View>

          {profile && (
            <>
              <Text className="text-gray-600">{profile.city}</Text>
              <View className="flex-row mt-2 flex-wrap">
                {profile.interests &&
                  profile.interests
                    .slice(0, 2)
                    .map((interest: string, index: number) => (
                      <View
                        key={index}
                        className="bg-blue-100 px-2 py-1 rounded-full mr-2 mb-1"
                      >
                        <Text className="text-xs text-blue-800">
                          {interest}
                        </Text>
                      </View>
                    ))}

                {profile.interests && profile.interests.length > 2 && (
                  <Text className="text-xs text-gray-500 ml-1 mt-1">
                    +{profile.interests.length - 2} more
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        <View>
          <TouchableOpacity
            className="bg-primary py-2 px-3 rounded-lg mb-2"
            onPress={() => handleAcceptRequest(request.id, request.sender_name)}
            disabled={acceptingId === request.id}
          >
            {acceptingId === request.id ? (
              <ActivityIndicator size="small" color="black" />
            ) : (
              <Text className="text-black font-medium">Accept</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-200 py-2 px-3 rounded-lg"
            onPress={() =>
              handleDeclineRequest(request.id, request.sender_name)
            }
            disabled={decliningId === request.id}
          >
            {decliningId === request.id ? (
              <ActivityIndicator size="small" color="#5E72E4" />
            ) : (
              <Text className="text-gray-800 font-medium">Decline</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render connection cards
  const renderConnectionCard = (connection: UserConnection) => (
    <View
      key={connection.connectionId}
      className="flex-row items-center bg-gray-50 rounded-xl p-4 mb-3"
    >
      {connection.photoUrl ? (
        <Image
          source={{ uri: connection.photoUrl }}
          className="w-16 h-16 rounded-full"
        />
      ) : (
        <View className="w-16 h-16 rounded-full bg-gray-300 items-center justify-center">
          <Text className="text-gray-600 text-xl font-bold">
            {connection.username?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}

      <View className="ml-4 flex-1">
        <Text className="text-lg font-semibold text-gray-800">
          {connection.username}
        </Text>
        <Text className="text-gray-600">{connection.city}</Text>

        <View className="flex-row mt-2 flex-wrap">
          {connection.interests &&
            connection.interests.slice(0, 3).map((interest, index) => (
              <View
                key={index}
                className="bg-blue-100 px-2 py-1 rounded-full mr-2 mb-1"
              >
                <Text className="text-xs text-blue-800">{interest}</Text>
              </View>
            ))}

          {connection.interests && connection.interests.length > 3 && (
            <Text className="text-xs text-gray-500 ml-1 mt-1">
              +{connection.interests.length - 3} more
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row">
        {/* Message button */}
        <TouchableOpacity
          className="bg-primary p-2 rounded-full mr-3"
          onPress={() => navigateToChat(connection.userId, connection.username)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="black" />
        </TouchableOpacity>

        {/* Disconnect button */}
        <TouchableOpacity
          className="bg-gray-200 py-2 px-3 rounded-lg"
          onPress={() =>
            handleDisconnect(connection.connectionId, connection.username)
          }
          disabled={disconnectingIds[connection.connectionId]}
        >
          {disconnectingIds[connection.connectionId] ? (
            <ActivityIndicator size="small" color="#5E72E4" />
          ) : (
            <Text className="text-gray-800 font-medium">Disconnect</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons name="people-outline" size={64} color="#CBD5E1" />
      <Text className="text-gray-400 mt-4 text-center">
        You don't have any connections yet.
      </Text>
      <Text className="text-gray-400 text-center">
        Connect with others to build your network.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text className="mt-4 text-gray-600">Loading connections...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View className="px-6 pt-6 pb-4">
        <Text className="text-3xl font-bold text-gray-800">Connections</Text>
        <Text className="text-base text-gray-600 mt-1">
          Manage your network
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5E72E4']}
          />
        }
      >
        {/* Connection Requests Section */}
        {connectionRequests.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Connection Requests ({connectionRequests.length})
            </Text>
            {connectionRequests.map(renderConnectionRequest)}
          </View>
        )}

        {/* Connected Users Section */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Your Connections
        </Text>

        {connections.length === 0
          ? renderEmptyState()
          : connections.map(renderConnectionCard)}

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
