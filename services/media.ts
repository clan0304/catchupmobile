// services/media.ts
import { supabase } from '../lib/supabase';

/**
 * Upload media (image or video) to Supabase storage for chat messages
 * @param userId User ID
 * @param uri Local URI of the file to upload
 * @param mediaType Type of media ('image' or 'video')
 * @returns Object with public URL or error
 */
export async function uploadChatMedia(
  userId: string,
  uri: string,
  mediaType: 'image' | 'video'
): Promise<{ url: string | null; error: any | null }> {
  try {
    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Generate unique filename with proper extension
    const fileExt =
      uri.split('.').pop()?.toLowerCase() ||
      (mediaType === 'image' ? 'jpg' : 'mp4');

    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage in the chat_media bucket
    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, blob);

    if (uploadError) {
      console.error('Error uploading media:', uploadError);
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    console.error('Error in uploadChatMedia:', error);
    return { url: null, error };
  }
}

/**
 * Upload profile media to Supabase storage
 * @param userId User ID
 * @param uri Local URI of the file to upload
 * @returns Object with public URL or error
 */
export async function uploadProfileMedia(
  userId: string,
  uri: string
): Promise<{ url: string | null; error: any | null }> {
  try {
    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Generate unique filename with proper extension
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage in the profile_photos bucket
    const { error: uploadError } = await supabase.storage
      .from('profile_photos')
      .upload(filePath, blob);

    if (uploadError) {
      console.error('Error uploading profile photo:', uploadError);
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
      .from('profile_photos')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    console.error('Error in uploadProfileMedia:', error);
    return { url: null, error };
  }
}

/**
 * Delete media from Supabase storage
 * @param url Public URL of the media to delete
 * @returns Object with success status or error
 */
export async function deleteMedia(
  url: string
): Promise<{ success: boolean; error: any | null }> {
  try {
    // Extract the path from URL
    const urlParts = url.split('/');
    const bucket = urlParts[urlParts.length - 2];
    const path = urlParts[urlParts.length - 1];

    // Delete from appropriate storage bucket
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Error deleting media:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in deleteMedia:', error);
    return { success: false, error };
  }
}

/**
 * Convert base64 to blob
 * @param base64 Base64 string
 * @param type MIME type
 * @returns Blob object
 */
export function base64ToBlob(base64: string, type: string): Blob {
  const binaryString = atob(base64.split(',')[1]);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type });
}

/**
 * Generate a thumbnail for a video file
 * @param videoUri URI of the video file
 * @returns Object with thumbnail URI or error
 */
export async function generateVideoThumbnail(
  videoUri: string
): Promise<{ uri: string | null; error: any | null }> {
  try {
    // This would typically use a library like expo-video-thumbnails
    // For now, this is a placeholder
    return {
      uri: videoUri, // Replace with actual thumbnail generation logic
      error: null,
    };
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    return { uri: null, error };
  }
}
