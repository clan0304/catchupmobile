// services/profile.ts
import { supabase } from '../lib/supabase';
import { ProfileData } from '../types/auth';

/**
 * Get a user's profile by ID
 * @param userId The user ID
 * @returns Object with profile data or error
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return { profile: null, error };
  }

  return { profile: data, error: null };
}

/**
 * Get all user profiles
 * @returns Object with array of profiles or error
 */
export async function getAllProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all profiles:', error);
      return { profiles: [], error };
    }

    return { profiles: data || [], error: null };
  } catch (error) {
    console.error('Exception fetching all profiles:', error);
    return { profiles: [], error };
  }
}

/**
 * Update a user's profile
 * @param userId The user ID
 * @param profileData The profile data to update
 * @returns Object with error (if any)
 */
export async function updateProfile(
  userId: string,
  profileData: Partial<ProfileData>
) {
  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId);

  return { error };
}

/**
 * Check if a username is available
 * @param username The username to check
 * @returns Boolean indicating if username is unique
 */
export async function checkUsernameUnique(username: string) {
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
    console.error('Exception checking username uniqueness:', error);
    return false;
  }
}

/**
 * Upload a profile photo for a user
 * @param userId The user ID
 * @param uri The local URI of the photo
 * @returns Object with public URL or error
 */
export async function uploadProfilePhoto(userId: string, uri: string) {
  try {
    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Generate unique filename
    const fileExt = uri.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
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
}

/**
 * Search profiles by various criteria
 * @param query Search query
 * @param filters Optional filters for the search
 * @returns Object with search results or error
 */
export async function searchProfiles(
  query: string,
  filters?: {
    interests?: string[];
    city?: string;
    limit?: number;
    offset?: number;
  }
) {
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;

  try {
    let queryBuilder = supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%.city.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    // Add filters if provided
    if (filters?.interests && filters.interests.length > 0) {
      // For array contains operations with multiple values
      queryBuilder = queryBuilder.contains('interests', filters.interests);
    }

    if (filters?.city) {
      queryBuilder = queryBuilder.ilike('city', `%${filters.city}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching profiles:', error);
      return { profiles: [], error };
    }

    return { profiles: data || [], error: null };
  } catch (error) {
    console.error('Exception searching profiles:', error);
    return { profiles: [], error };
  }
}

// Define interest categories for the app
export const INTEREST_OPTIONS = [
  'Sports',
  'Music',
  'Art',
  'Food',
  'Travel',
  'Technology',
  'Gaming',
  'Fashion',
  'Photography',
  'Reading',
  'Fitness',
  'Cooking',
  'Nature',
  'Movies',
  'Dancing',
];
