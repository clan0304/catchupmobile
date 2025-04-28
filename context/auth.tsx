// context/auth.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert, Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { AuthContextType, ProfileData } from '../types/auth';

// Initialize the auth web browser
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  checkUsernameUnique: async () => false,
  completeProfile: async () => ({ error: null }),
  uploadProfilePhoto: async () => ({ url: null, error: null }),
  profileComplete: false,
});

// Create a provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  // Determine if we're running on the client side
  const isClient = typeof window !== 'undefined';

  // Effect to handle initial authentication state
  useEffect(() => {
    if (!isClient) {
      setLoading(false);
      return;
    }

    // Get current session and user, if there is one
    const initAuth = async () => {
      try {
        console.log('Initializing auth state...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const { session } = data;
        console.log(
          'Initial session check:',
          session ? 'Session found' : 'No session'
        );

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkProfileComplete(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        'Auth state changed:',
        event,
        session ? 'Session exists' : 'No session'
      );
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const isComplete = await checkProfileComplete(session.user.id);
        if (!isComplete) {
          router.replace('/(app)/profile-setup');
        } else {
          router.replace('/(app)');
        }
      } else if (event === 'SIGNED_OUT') {
        router.replace('/(auth)');
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [isClient]);

  // Check if the user has completed their profile
  const checkProfileComplete = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If there's a "no rows" error or no data, handle it as an incomplete profile
      if (error?.code === 'PGRST116' || !data) {
        console.log(
          'No profile found or profile incomplete, redirecting to profile setup'
        );
        setProfileComplete(false);
        return false;
      }

      // Check if all required fields are filled
      const isComplete = !!(
        data.username &&
        data.instagram_url &&
        data.city &&
        data.interests?.length > 0 &&
        data.bio
      );

      console.log('Profile complete status:', isComplete);
      setProfileComplete(isComplete);
      return isComplete;
    } catch (error) {
      console.error('Error in checkProfileComplete:', error);
      setProfileComplete(false);
      return false;
    }
  };

  // Get app scheme - Fixed for TypeScript error
  const getAppScheme = (): string => {
    // Access the scheme property safely
    let scheme = 'catchup'; // Default scheme

    if (Constants.expoConfig) {
      const expoScheme = Constants.expoConfig.scheme;
      // Handle different types that scheme might be
      if (typeof expoScheme === 'string') {
        scheme = expoScheme;
      } else if (
        Array.isArray(expoScheme) &&
        expoScheme.length > 0 &&
        typeof expoScheme[0] === 'string'
      ) {
        scheme = expoScheme[0];
      }
    }

    return scheme;
  };

  // Sign in with Google - works on both Web and Mobile
  const signInWithGoogle = async (promptAccountSelection: boolean = false) => {
    try {
      console.log('Attempting to sign in with Google');
      setLoading(true);

      // Common options for both web and mobile
      const authOptions = {
        provider: 'google' as const,
        options: {
          queryParams: promptAccountSelection
            ? {
                prompt: 'select_account', // Force account selection
                access_type: 'offline', // Get refresh token
              }
            : undefined,
        },
      };

      if (Platform.OS === 'web') {
        // Web specific flow
        const { error } = await supabase.auth.signInWithOAuth({
          ...authOptions,
          options: {
            ...authOptions.options,
            redirectTo: window.location.origin,
          },
        });

        if (error) throw error;
      } else {
        // Mobile flow using Expo AuthSession
        // Get app scheme
        const scheme = getAppScheme();

        // Create redirect URI with the correct type definition
        // TypeScript fix: only use properties that exist in the type
        let redirectUri = '';
        if (Platform.OS === 'android') {
          redirectUri = makeRedirectUri({
            scheme: scheme,
            path: 'callback',
          });
        } else {
          // iOS typically needs a different approach
          redirectUri = makeRedirectUri({
            scheme: scheme,
            path: 'callback',
          });
        }

        console.log('Redirect URI:', redirectUri);

        // First, get the authorization URL from Supabase
        const { data, error } = await supabase.auth.signInWithOAuth({
          ...authOptions,
          options: {
            ...authOptions.options,
            redirectTo: redirectUri,
            skipBrowserRedirect: true,
          },
        });

        if (error || !data?.url) {
          throw error || new Error('Failed to get authorization URL');
        }

        // Open the authorization URL in a web browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success') {
          const { url } = result;
          console.log('Auth successful, received URL:', url);

          // Extract the tokens from the URL
          const params = new URLSearchParams(url.split('#')[1]);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            // Set the session with Supabase
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) throw error;
            console.log(
              'Successfully set session',
              data?.session ? 'yes' : 'no'
            );
          } else {
            throw new Error('No tokens found in redirect URL');
          }
        } else {
          // User cancelled or dismiss
          console.log('Authentication was cancelled or failed');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Check if username is unique
  const checkUsernameUnique = async (username: string) => {
    try {
      const { data, error } = await supabase.rpc('check_username_unique', {
        new_username: username,
      });

      if (error) {
        console.error('Error checking username:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in checkUsernameUnique:', error);
      return false;
    }
  };

  // Upload profile photo to Supabase Storage
  const uploadProfilePhoto = async (uri: string) => {
    if (!user) {
      return { url: null, error: new Error('User not authenticated') };
    }

    try {
      // Convert URI to Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Generate unique filename
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, blob);

      if (uploadError) {
        return { url: null, error: uploadError };
      }

      // Get public URL
      const { data } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading image:', error);
      return { url: null, error };
    }
  };

  // Complete user profile
  const completeProfile = async (profileData: ProfileData) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      console.log('Upserting profile data to Supabase:', {
        userId: user.id,
        ...profileData,
      });

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        ...profileData,
      });

      if (error) {
        console.error('Supabase error completing profile:', error);
        return { error };
      }

      console.log('Profile data successfully saved!');

      // Only set profileComplete and redirect if there was no error
      setProfileComplete(true);

      // Add a small delay before redirecting to ensure state is updated
      setTimeout(() => {
        console.log('Redirecting to home page...');
        router.replace('/(app)');
      }, 500);

      return { error: null };
    } catch (error) {
      console.error('Exception in completeProfile:', error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithGoogle,
        signOut,
        checkUsernameUnique,
        completeProfile,
        uploadProfilePhoto,
        profileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => useContext(AuthContext);
