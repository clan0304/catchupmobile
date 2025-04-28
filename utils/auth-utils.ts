// utils/auth-utils.ts
import { supabase } from '../lib/supabase';
import { AuthResult, ProfileData, OperationResult } from '../types/auth';

/**
 * Check if a user is authenticated
 * @returns Promise with boolean indicating auth state
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return !!data.session;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get the current user data
 * @returns Promise with user data or null
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get a user's profile by ID
 * @param userId The user ID
 * @returns Promise with profile data or null
 */
export async function getUserProfile(
  userId: string
): Promise<OperationResult<ProfileData>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return { data: data as ProfileData };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { error };
  }
}

/**
 * Handle OAuth sign-in process
 * @param provider The OAuth provider (google, apple, facebook, etc.)
 * @param redirectTo Optional redirect URL
 * @returns Promise with auth URL
 */
export async function initiateOAuthSignIn(
  provider: 'google' | 'apple' | 'facebook',
  redirectTo?: string
) {
  try {
    const options = redirectTo ? { redirectTo } : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error) throw error;

    return { url: data.url, error: null };
  } catch (error) {
    console.error(`Error initiating ${provider} sign-in:`, error);
    return { url: null, error };
  }
}

/**
 * Parse auth tokens from URL after OAuth redirect
 * @param url The redirect URL with tokens
 * @returns Promise with auth result
 */
export async function parseAuthTokensFromUrl(url: string): Promise<AuthResult> {
  try {
    // Extract the tokens from the URL
    const params = new URLSearchParams(url.split('#')[1]);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      return {
        success: false,
        error: 'No authentication tokens found in the URL',
      };
    }

    // Set the session with Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) throw error;

    return {
      success: true,
      user: data.session?.user ?? null,
    };
  } catch (error) {
    console.error('Error parsing auth tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Refresh the current auth session
 * @returns Promise with refreshed session status
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return !!data.session;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}
