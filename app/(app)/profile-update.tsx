// app/(app)/profile-update.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../context/auth';
import { ProfileData } from '../../types/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { debounce } from 'lodash';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getProfile,
  checkUsernameUnique,
  INTEREST_OPTIONS,
} from '../../services/profile';
import { uploadProfileMedia } from '../../services/media';

export default function ProfileUpdateScreen() {
  const { user, completeProfile } = useAuth();

  // Profile state
  const [username, setUsername] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  // Form state
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isUsernameUnique, setIsUsernameUnique] = useState(true);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalUsername, setOriginalUsername] = useState('');

  // Load current profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { profile, error } = await getProfile(user.id);

        if (error) {
          console.error('Error loading profile:', error);
          Alert.alert(
            'Error',
            'Failed to load your profile. Please try again.'
          );
          return;
        }

        if (profile) {
          setUsername(profile.username);
          setOriginalUsername(profile.username);
          setInstagramUrl(profile.instagram_url || '');
          setCity(profile.city || '');
          setBio(profile.bio || '');
          setInterests(profile.interests || []);
          setCurrentPhotoUrl(profile.photo_url || null);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Check username uniqueness with debounce - only if it's different from original
  const checkUsername = debounce(async (value: string) => {
    // Skip check if username didn't change
    if (value === originalUsername) {
      setIsUsernameUnique(true);
      setUsernameError(null);
      return;
    }

    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setIsUsernameUnique(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError(
        'Username can only contain letters, numbers, and underscores'
      );
      setIsUsernameUnique(false);
      return;
    }

    setIsUsernameChecking(true);
    setUsernameError(null);

    try {
      const isUnique = await checkUsernameUnique(value);
      setIsUsernameUnique(isUnique);
      if (!isUnique) {
        setUsernameError('Username is already taken');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username');
    } finally {
      setIsUsernameChecking(false);
    }
  }, 500);

  // Handle username changes
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    checkUsername(value);
  };

  // Handle adding/removing interests
  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((item) => item !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  // Handle picking a profile photo
  const pickImage = async () => {
    // Request permission first
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission Required',
        'You need to grant access to your photos to upload a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // Form validation
  const validateForm = () => {
    if (!username || usernameError) {
      Alert.alert('Error', 'Please provide a valid username');
      return false;
    }

    if (!instagramUrl) {
      Alert.alert('Error', 'Please provide your Instagram URL');
      return false;
    }

    if (!city) {
      Alert.alert('Error', 'Please provide your city');
      return false;
    }

    if (interests.length === 0) {
      Alert.alert('Error', 'Please select at least one interest');
      return false;
    }

    if (!bio) {
      Alert.alert('Error', 'Please write a short bio');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    setSubmitLoading(true);
    try {
      let photoUrl = currentPhotoUrl;

      // Upload photo if selected
      if (photoUri) {
        console.log('Uploading profile photo...');
        const { url, error } = await uploadProfileMedia(user.id, photoUri);

        if (error) {
          console.error('Error uploading photo:', error);
          Alert.alert('Error', 'Failed to upload photo. Please try again.');
          setSubmitLoading(false);
          return;
        }
        photoUrl = url;
      }

      // Prepare profile data
      const profileData: ProfileData = {
        username,
        instagram_url: instagramUrl,
        city,
        interests,
        bio,
      };

      if (photoUrl) {
        profileData.photo_url = photoUrl;
      }

      // Submit profile data
      const { error } = await completeProfile(profileData);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      } else {
        Alert.alert('Success', 'Your profile has been updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error in profile update:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text className="mt-4 text-gray-600">Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Update Profile',
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

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView className="flex-1 px-6">
            <View className="py-6">
              {/* Profile Photo Section */}
              <View className="mb-8 items-center">
                <TouchableOpacity
                  onPress={pickImage}
                  className="mb-4 items-center justify-center"
                >
                  {photoUri ? (
                    <View className="items-center">
                      <Image
                        source={{ uri: photoUri }}
                        className="w-32 h-32 rounded-full"
                      />
                      <Text className="text-primary mt-2">Change Photo</Text>
                    </View>
                  ) : currentPhotoUrl ? (
                    <View className="items-center">
                      <Image
                        source={{ uri: currentPhotoUrl }}
                        className="w-32 h-32 rounded-full"
                      />
                      <Text className="text-primary mt-2">Change Photo</Text>
                    </View>
                  ) : (
                    <View className="w-32 h-32 rounded-full bg-gray-200 items-center justify-center">
                      <Text className="text-gray-600 text-4xl">+</Text>
                      <Text className="text-gray-600 mt-1">Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Username */}
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Username
              </Text>
              <View className="mb-6">
                <TextInput
                  className={`bg-gray-100 rounded-lg p-4 text-base text-gray-800 ${
                    usernameError ? 'border border-red-500' : ''
                  }`}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="Username"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isUsernameChecking && (
                  <Text className="text-sm text-gray-500 mt-1">
                    Checking availability...
                  </Text>
                )}
                {usernameError && (
                  <Text className="text-sm text-red-500 mt-1">
                    {usernameError}
                  </Text>
                )}
                {isUsernameUnique &&
                  username.length > 0 &&
                  username !== originalUsername && (
                    <Text className="text-sm text-green-500 mt-1">
                      Username is available
                    </Text>
                  )}
              </View>

              {/* Instagram URL */}
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Instagram URL
              </Text>
              <View className="mb-6">
                <TextInput
                  className="bg-gray-100 rounded-lg p-4 text-base text-gray-800"
                  value={instagramUrl}
                  onChangeText={setInstagramUrl}
                  placeholder="https://instagram.com/yourusername"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              {/* City */}
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Your City
              </Text>
              <View className="mb-6">
                <TextInput
                  className="bg-gray-100 rounded-lg p-4 text-base text-gray-800"
                  value={city}
                  onChangeText={setCity}
                  placeholder="New York, Paris, Tokyo, etc."
                />
              </View>

              {/* Interests */}
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Your Interests
              </Text>
              <Text className="text-base text-gray-600 mb-4">
                Choose at least one interest
              </Text>

              <View className="flex-row flex-wrap mb-6">
                {INTEREST_OPTIONS.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    className={`m-1 py-2 px-4 rounded-full ${
                      interests.includes(interest)
                        ? 'bg-primary'
                        : 'bg-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        interests.includes(interest)
                          ? 'text-black font-medium'
                          : 'text-gray-800'
                      }`}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Bio */}
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Bio
              </Text>
              <TextInput
                className="bg-gray-100 rounded-lg p-4 text-base text-gray-800 h-32 mb-6"
                value={bio}
                onChangeText={setBio}
                placeholder="Write a short bio about yourself..."
                multiline
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitLoading}
                className={`bg-primary py-4 px-6 rounded-lg ${
                  submitLoading ? 'opacity-70' : ''
                }`}
              >
                {submitLoading ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text className="text-black font-semibold text-center text-lg">
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
