// services/messages.ts
import { supabase } from '../lib/supabase';
import { Message, ConversationSummary } from '../types/messages';

/**
 * Send a message to another user
 * @param senderId - ID of the sender
 * @param receiverId - ID of the receiver
 * @param content - Content of the message
 * @param mediaUrl - Optional URL of media attachment
 * @param mediaType - Optional type of media ('image' or 'video')
 * @returns Object with error (if any)
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  mediaUrl?: string | null,
  mediaType?: 'image' | 'video' | null
) {
  try {
    // First, verify these users are connected
    const { data: connections, error: connectionError } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(user1_id.eq.${senderId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${senderId})`
      );

    if (connectionError) {
      console.error('Error checking connection:', connectionError);
      return { error: connectionError };
    }

    if (!connections || connections.length === 0) {
      return { error: new Error('Users are not connected') };
    }

    // Send the message
    const { error } = await supabase.from('messages').insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      read: false,
    });

    return { error };
  } catch (error) {
    console.error('Error sending message:', error);
    return { error };
  }
}

/**
 * Get conversation between two users
 * @param userId - Current user ID
 * @param otherUserId - Other user ID
 * @returns Object with array of messages or error
 */
export async function getConversation(userId: string, otherUserId: string) {
  try {
    // Verify these users are connected
    const { data: connections, error: connectionError } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`
      );

    if (connectionError) {
      console.error('Error checking connection:', connectionError);
      return { messages: [], error: connectionError };
    }

    if (!connections || connections.length === 0) {
      return { messages: [], error: new Error('Users are not connected') };
    }

    // Get all messages between these users
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting conversation:', error);
      return { messages: [], error };
    }

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('read', false);

    return { messages: data as Message[], error: null };
  } catch (error) {
    console.error('Error in getConversation:', error);
    return { messages: [], error };
  }
}

/**
 * Get all conversations for a user
 * @param userId - Current user ID
 * @returns Object with array of conversation summaries or error
 */
export async function getConversations(userId: string) {
  try {
    // Query to get the most recent message from each conversation
    // This assumes a Supabase RPC function named get_user_conversations is defined
    const { data, error } = await supabase.rpc('get_user_conversations', {
      user_id_param: userId,
    });

    if (error) {
      console.error('Error getting conversations:', error);
      return { conversations: [], error };
    }

    return { conversations: data as ConversationSummary[], error: null };
  } catch (error) {
    console.error('Error in getConversations:', error);
    return { conversations: [], error };
  }
}

/**
 * Mark all messages from a user as read
 * @param userId - Current user ID
 * @param senderId - Sender's user ID
 * @returns Object with error (if any)
 */
export async function markMessagesAsRead(userId: string, senderId: string) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', userId)
      .eq('read', false);

    return { error };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { error };
  }
}

/**
 * Get unread message count for a user
 * @param userId - Current user ID
 * @returns Object with count or error
 */
export async function getUnreadMessageCount(userId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread message count:', error);
      return { count: 0, error };
    }

    return { count: data.length, error: null };
  } catch (error) {
    console.error('Error in getUnreadMessageCount:', error);
    return { count: 0, error };
  }
}

/**
 * Delete a message
 * @param messageId - ID of the message to delete
 * @param userId - ID of the user attempting to delete (for verification)
 * @returns Object with success flag or error
 */
export async function deleteMessage(messageId: string, userId: string) {
  try {
    // Verify the user owns this message
    const { data, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('Error fetching message:', fetchError);
      return { success: false, error: fetchError };
    }

    // Check if user is the sender
    if (data.sender_id !== userId) {
      return {
        success: false,
        error: new Error('Unauthorized: You can only delete your own messages'),
      };
    }

    // Delete the message
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in deleteMessage:', error);
    return { success: false, error };
  }
}

/**
 * Get message statistics for a user
 * @param userId - Current user ID
 * @returns Object with message statistics
 */
export async function getMessageStats(userId: string) {
  try {
    // Total messages sent
    const { data: sentData, error: sentError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('sender_id', userId);

    // Total messages received
    const { data: receivedData, error: receivedError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId);

    // Unread messages
    const { data: unreadData, error: unreadError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (sentError || receivedError || unreadError) {
      console.error(
        'Error fetching message stats:',
        sentError || receivedError || unreadError
      );
      return {
        sentCount: 0,
        receivedCount: 0,
        unreadCount: 0,
        error: sentError || receivedError || unreadError,
      };
    }

    return {
      sentCount: sentData?.length || 0,
      receivedCount: receivedData?.length || 0,
      unreadCount: unreadData?.length || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error in getMessageStats:', error);
    return {
      sentCount: 0,
      receivedCount: 0,
      unreadCount: 0,
      error,
    };
  }
}
