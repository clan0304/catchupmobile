// app/(auth)/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Platform,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAuthButton } from '../../components/AuthButton';
import AuthLoading from '../../components/AuthLoading';
import AuthError from '../../components/AuthError';

export default function AuthScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      // Pass true to prompt for account selection
      await signInWithGoogle(true);
    } catch (err) {
      console.error('Google sign in error:', err);
      setError('Failed to sign in with Google. Please try again.');
      // Reset loading state on error
      setLoading(false);
    } finally {
      // Only reset loading state on web, as mobile redirects away
      if (Platform.OS === 'web') {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <AuthLoading message="Signing in with Google..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center items-center px-6">
            {/* App Logo/Icon */}
            <View className="w-24 h-24 bg-primary rounded-2xl items-center justify-center mb-8 shadow-md">
              <Ionicons name="people" size={64} color="white" />
            </View>

            <Text className="text-3xl font-bold text-gray-800 mb-2">
              Welcome to CatchUp
            </Text>
            <Text className="text-base text-gray-600 mb-12 text-center">
              Connect with classmates and create meaningful connections
            </Text>

            {/* Error display */}
            {error && (
              <AuthError
                message={error}
                onDismiss={() => setError(null)}
                autoHide={true}
              />
            )}

            <View className="w-full max-w-sm">
              <GoogleAuthButton
                onPress={handleGoogleSignIn}
                loading={loading}
                fullWidth
                size="large"
              />
            </View>

            <View className="absolute bottom-10 px-6">
              <Text className="text-xs text-gray-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy
                Policy.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
