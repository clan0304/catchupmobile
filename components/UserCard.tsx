// components/UserCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../types/auth';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = CARD_WIDTH * 1.5; // Aspect ratio for the card

interface UserCardProps {
  profile: ProfileData;
  isConnected: boolean;
  isPendingRequest: boolean;
  onConnect: () => void;
  onNavigateToChat: () => void;
  isRequesting: boolean;
}

const UserCard: React.FC<UserCardProps> = ({
  profile,
  isConnected,
  isPendingRequest,
  onConnect,
  onNavigateToChat,
  isRequesting,
}) => {
  return (
    <View
      className="overflow-hidden rounded-xl bg-white shadow-md"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {/* Profile Photo */}
      <View className="relative" style={{ height: CARD_WIDTH }}>
        {profile.photo_url ? (
          <Image
            source={{ uri: profile.photo_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-200 items-center justify-center">
            <Text className="text-gray-500 text-6xl font-bold">
              {profile.username?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        {/* Chat icon for connected users */}
        {isConnected && (
          <TouchableOpacity
            className="absolute top-4 right-4 bg-primary rounded-full w-12 h-12 items-center justify-center shadow-md"
            onPress={onNavigateToChat}
          >
            <Ionicons name="chatbubble-outline" size={24} color="black" />
          </TouchableOpacity>
        )}

        {/* Username badge */}
        <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 px-4 py-3">
          <View className="flex-row items-center">
            <Text className="text-2xl font-bold text-white mr-2">
              {profile.username}
            </Text>

            {/* Age or other badge if available */}
            {/* This is a placeholder for future badge requirements */}
          </View>
          <Text className="text-base text-white">{profile.city}</Text>
        </View>
      </View>

      {/* Profile Details */}
      <View className="flex-1 bg-gray-50 p-4">
        {/* Bio section */}
        <View className="mb-4">
          <Text className="text-base text-gray-700 mb-3" numberOfLines={3}>
            {profile.bio || 'No bio available'}
          </Text>
        </View>

        {/* Interests */}
        <View className="flex-row flex-wrap mb-4">
          {profile.interests &&
            profile.interests.slice(0, 3).map((interest, index) => (
              <View
                key={index}
                className="bg-blue-100 px-2.5 py-1 rounded-full mr-2 mb-2"
              >
                <Text className="text-xs text-blue-800">{interest}</Text>
              </View>
            ))}

          {profile.interests && profile.interests.length > 3 && (
            <Text className="text-xs text-gray-500 self-center ml-1">
              +{profile.interests.length - 3} more
            </Text>
          )}
        </View>

        {/* Action Button */}
        <View className="flex-row justify-center mt-auto">
          {!isConnected && !isPendingRequest && (
            <TouchableOpacity
              className="bg-primary py-3 px-6 rounded-lg min-w-[120px] items-center justify-center"
              onPress={onConnect}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <ActivityIndicator size="small" color="black" />
              ) : (
                <Text className="text-black font-semibold text-base">
                  Connect
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!isConnected && isPendingRequest && (
            <View className="bg-gray-400 py-3 px-6 rounded-lg min-w-[120px] items-center justify-center">
              <Text className="text-white font-semibold text-base">
                Pending
              </Text>
            </View>
          )}

          {isConnected && (
            <TouchableOpacity
              className="bg-primary py-3 px-6 rounded-lg min-w-[120px] items-center justify-center"
              onPress={onNavigateToChat}
            >
              <Text className="text-black font-semibold text-base">
                Message
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Swipe indicators */}
      <View className="absolute bottom-20 left-0 right-0 flex-row justify-between px-6">
        <View className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md opacity-70">
          <Ionicons name="close" size={24} color="#ff4742" />
        </View>
        <View className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md opacity-70">
          <Ionicons name="heart" size={24} color="#4CAF50" />
        </View>
      </View>
    </View>
  );
};

export default UserCard;
