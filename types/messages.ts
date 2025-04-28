// types/messages.ts
// Message object type
export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  created_at: string;
  read: boolean;
};

// Conversation summary with latest message
export type ConversationSummary = {
  user_id: string;
  username: string;
  photo_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
};

// Media types for message attachments
export enum MessageMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

// Message operation result type
export type MessageResult = {
  success: boolean;
  error?: any | null;
  messageId?: string;
};

// Message statistics type
export type MessageStats = {
  sentCount: number;
  receivedCount: number;
  unreadCount: number;
  error: any | null;
};

// Pagination parameters for messages
export type MessagePagination = {
  limit?: number;
  offset?: number;
  before?: string; // timestamp
  after?: string; // timestamp
};
