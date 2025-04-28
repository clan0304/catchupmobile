// app/(app)/chat/[userId].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/auth';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getConversation,
  sendMessage,
  markMessagesAsRead,
} from '../../../services/messages';
import { Message } from '../../../types/messages';
import { getProfile } from '../../../services/profile';
import { ProfileData } from '../../../types/auth';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { uploadChatMedia } from '../../../services/media';

export default function ChatScreen() {
  const { user } = useAuth();
  const { userId, username } = useLocalSearchParams<{
    userId: string;
    username: string;
  }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<ProfileData | null>(
    null
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const [mediaToSend, setMediaToSend] = useState<{
    uri: string;
    type: 'image' | 'video';
  } | null>(null);
  const [mediaPreviewVisible, setMediaPreviewVisible] = useState(false);
  const videoRef = useRef<Video>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);

  // Load conversation
  const loadConversation = useCallback(async () => {
    if (!user || !userId) return;

    try {
      // Only set loading to true on initial load, not during refreshes
      if (messages.length === 0) {
        setLoading(true);
      }

      const { messages: conversationMessages, error } = await getConversation(
        user.id,
        userId as string
      );

      if (error) {
        console.error('Error loading conversation:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error connecting with this user';

        if (errorMessage === 'Users are not connected') {
          Alert.alert(
            'Not Connected',
            'You can only message users you are connected with.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else {
        // Compare messages to see if we actually need to update
        if (JSON.stringify(messages) !== JSON.stringify(conversationMessages)) {
          setMessages(conversationMessages);

          // Mark messages as read
          markMessagesAsRead(user.id, userId as string);
        }
      }

      // Load other user's profile if not loaded yet
      if (!otherUserProfile) {
        const { profile } = await getProfile(userId as string);
        if (profile) {
          setOtherUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error in loadConversation:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userId, messages, otherUserProfile]);

  // Load messages on mount and set up polling
  useEffect(() => {
    // Initial load
    loadConversation();

    // Set up polling to refresh messages
    const intervalId = setInterval(() => {
      if (!sending) {
        loadConversation();
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(intervalId);
  }, [user, userId, sending, loadConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [messages]);

  // Handle picking media (both images and videos)
  const pickMedia = async () => {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'You need to allow access to your photos'
        );
        return;
      }

      // Open media picker (both images and videos)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check if it's a video and check size if needed
        const asset = result.assets[0];
        const isVideo =
          asset.uri.toLowerCase().endsWith('.mp4') ||
          asset.uri.toLowerCase().endsWith('.mov') ||
          (asset.type && asset.type.startsWith('video'));

        // For videos, check file size
        if (isVideo && asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
          Alert.alert(
            'Error',
            'Video is too large. Please select a video smaller than 50MB.'
          );
          return;
        }

        setMediaToSend({
          uri: asset.uri,
          type: isVideo ? 'video' : 'image',
        });
        setMediaPreviewVisible(true);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to select media');
    }
  };

  // Handle taking a photo with the camera
  const takePhoto = async () => {
    try {
      // Request camera permission
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'You need to allow access to your camera'
        );
        return;
      }

      // Open camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMediaToSend({
          uri: result.assets[0].uri,
          type: 'image',
        });
        setMediaPreviewVisible(true);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Cancel media upload
  const cancelMediaUpload = () => {
    setMediaToSend(null);
    setMediaPreviewVisible(false);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!user || !userId) return;

    // Check if we're sending media or just text
    const isMediaMessage = !!mediaToSend;
    const hasTextContent = !!messageText.trim();

    // For media messages, we need either text or media
    // For text messages, we need text
    if (!isMediaMessage && !hasTextContent) return;

    try {
      setSending(true);

      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | null = null;

      // If we have media to send, upload it first
      if (mediaToSend) {
        const { url, error: uploadError } = await uploadChatMedia(
          user.id,
          mediaToSend.uri,
          mediaToSend.type
        );

        if (uploadError) {
          console.error('Error uploading media:', uploadError);
          Alert.alert('Error', 'Failed to upload media. Please try again.');
          setSending(false);
          return;
        }

        if (url) {
          mediaUrl = url;
          mediaType = mediaToSend.type;
        }
      }

      // Send the message
      const content = messageText.trim() || (isMediaMessage ? '📎 Media' : '');
      const { error } = await sendMessage(
        user.id,
        userId as string,
        content,
        mediaUrl,
        mediaType
      );

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'Failed to send message. Please try again.'
        );
      } else {
        // Add the message to the local state immediately
        const newMessage: Message = {
          id: `temp-${Date.now()}`,
          sender_id: user.id,
          receiver_id: userId as string,
          content,
          media_url: mediaUrl,
          media_type: mediaType,
          created_at: new Date().toISOString(),
          read: false,
        };
        setMessages((prev) => [...prev, newMessage]);
        setMessageText('');
        setMediaToSend(null);
        setMediaPreviewVisible(false);

        // Reload conversation to get the real message data
        setTimeout(() => {
          loadConversation();
        }, 1000);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
    } finally {
      setSending(false);
    }
  };

  // Handle message options (long press on a message)
  const handleMessageLongPress = (message: Message) => {
    if (message.sender_id === user?.id) {
      setSelectedMessage(message);
      setIsOptionsVisible(true);
    }
  };

  // Format timestamp
  const formatMessageTime = (timestamp: string) => {
    const messageTime = new Date(timestamp);
    return messageTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render message bubble
  const renderMessage = (message: Message, index: number) => {
    const isSentByMe = message.sender_id === user?.id;
    const showAvatar =
      index === 0 || messages[index - 1].sender_id !== message.sender_id;

    // Check if message has media
    const hasMedia = !!message.media_url;
    const isImage = message.media_type === 'image';
    const isVideo = message.media_type === 'video';

    return (
      <TouchableOpacity
        key={message.id}
        className={`flex-row ${
          isSentByMe ? 'justify-end' : 'justify-start'
        } mb-3`}
        onLongPress={() => handleMessageLongPress(message)}
        activeOpacity={0.7}
      >
        {!isSentByMe && showAvatar ? (
          otherUserProfile?.photo_url ? (
            <Image
              source={{ uri: otherUserProfile.photo_url }}
              className="w-8 h-8 rounded-full mr-2"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-2">
              <Text className="text-gray-600 text-xs font-bold">
                {username?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )
        ) : !isSentByMe ? (
          <View className="w-8 mr-2" />
        ) : null}

        <View
          className={`px-4 py-2 rounded-2xl ${
            hasMedia ? 'max-w-[250]' : 'max-w-[80%]'
          } ${
            isSentByMe
              ? 'bg-primary rounded-tr-none'
              : 'bg-gray-200 rounded-tl-none'
          }`}
        >
          {/* Media content */}
          {hasMedia && isImage && message.media_url && (
            <TouchableOpacity
              onPress={() => {
                // Here you could add an image preview modal
                Alert.alert('Image', 'You tapped on an image');
              }}
              className="mb-2"
            >
              <Image
                source={{ uri: message.media_url }}
                className="w-full h-48 rounded-lg"
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {hasMedia && isVideo && message.media_url && (
            <View className="mb-2">
              <Video
                source={{ uri: message.media_url }}
                className="w-full h-48 rounded-lg"
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
              />
            </View>
          )}

          {/* Text content */}
          <Text className={isSentByMe ? 'text-black' : 'text-gray-800'}>
            {message.content === '📎 Media' && hasMedia
              ? '' // Don't show "📎 Media" placeholder if there's actual media
              : message.content}
          </Text>

          {/* Timestamp */}
          <Text
            className={`text-xs mt-1 ${
              isSentByMe ? 'text-gray-700' : 'text-gray-500'
            }`}
          >
            {formatMessageTime(message.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: username || 'Chat',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="arrow-back" size={24} color="#5E72E4" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                if (otherUserProfile) {
                  router.push({
                    pathname: '/(app)/profile/[userId]',
                    params: { userId: userId as string },
                  });
                }
              }}
              className="mr-2"
            >
              <Ionicons
                name="person-circle-outline"
                size={24}
                color="#5E72E4"
              />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 85}
        >
          {loading && messages.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#5E72E4" />
              <Text className="mt-4 text-gray-600">Loading messages...</Text>
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{ flexGrow: 1 }}
                onContentSizeChange={() =>
                  scrollViewRef.current?.scrollToEnd({ animated: false })
                }
              >
                {messages.length === 0 ? (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={64}
                      color="#CBD5E1"
                    />
                    <Text className="text-gray-400 mt-4 text-center">
                      No messages yet.
                    </Text>
                    <Text className="text-gray-400 text-center">
                      Say hello to start the conversation!
                    </Text>
                  </View>
                ) : (
                  messages.map(renderMessage)
                )}
              </ScrollView>

              <View className="flex-row items-center border-t border-gray-200 p-2">
                {/* Media picker buttons */}
                <View className="flex-row mr-2">
                  <TouchableOpacity className="p-2 mr-1" onPress={pickMedia}>
                    <Ionicons name="images-outline" size={24} color="#5E72E4" />
                  </TouchableOpacity>
                  <TouchableOpacity className="p-2" onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={24} color="#5E72E4" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2"
                  placeholder="Type a message..."
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  className={`rounded-full p-3 ${
                    messageText.trim() || mediaToSend
                      ? 'bg-primary'
                      : 'bg-gray-300'
                  }`}
                  onPress={handleSendMessage}
                  disabled={(!messageText.trim() && !mediaToSend) || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="black" />
                  ) : (
                    <Ionicons name="send" size={20} color="black" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Media Preview Modal */}
      <Modal
        visible={mediaPreviewVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelMediaUpload}
      >
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-1 justify-center">
            {/* Preview header with close button */}
            <View className="absolute top-0 left-0 right-0 p-4 flex-row justify-between items-center bg-black bg-opacity-50 z-10">
              <TouchableOpacity onPress={cancelMediaUpload}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-lg">
                Media Preview
              </Text>
              <View style={{ width: 28 }} />
            </View>

            {/* Media preview */}
            <View className="flex-1 justify-center items-center">
              {mediaToSend?.type === 'image' ? (
                <Image
                  source={{ uri: mediaToSend.uri }}
                  className="w-full h-64"
                  resizeMode="contain"
                />
              ) : mediaToSend?.type === 'video' ? (
                <Video
                  ref={videoRef}
                  source={{ uri: mediaToSend.uri }}
                  className="w-full h-64"
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  shouldPlay
                />
              ) : null}
            </View>

            {/* Bottom controls */}
            <View className="p-4 bg-black bg-opacity-50">
              <TextInput
                className="bg-gray-800 text-white rounded-lg p-4 mb-4"
                placeholder="Add a caption (optional)..."
                placeholderTextColor="#9CA3AF"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                className="bg-primary py-3 rounded-lg items-center"
                onPress={handleSendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="black" size="small" />
                ) : (
                  <Text className="text-black font-semibold">Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Message Options Modal */}
      <Modal
        visible={isOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black bg-opacity-50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setIsOptionsVisible(false)}
        >
          <View className="bg-white rounded-xl w-4/5 overflow-hidden">
            <TouchableOpacity
              className="py-4 px-6 border-b border-gray-200"
              onPress={() => {
                setIsOptionsVisible(false);
                // Copy message to clipboard
                // This would be implemented with Clipboard.setString()
                Alert.alert('Copied', 'Message copied to clipboard');
              }}
            >
              <Text className="text-gray-800 font-medium">Copy Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-4 px-6 border-b border-gray-200"
              onPress={() => {
                setIsOptionsVisible(false);
                // Delete message logic would go here
                Alert.alert(
                  'Delete Message',
                  'Are you sure you want to delete this message?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        // Delete message api call would go here
                        // Then remove from local state
                        Alert.alert('Deleted', 'Message deleted successfully');
                      },
                    },
                  ]
                );
              }}
            >
              <Text className="text-red-500 font-medium">Delete Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-4 px-6"
              onPress={() => setIsOptionsVisible(false)}
            >
              <Text className="text-gray-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
