// types/connections.ts
export type ConnectionRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export type Connection = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
};

// Request status for connections
export enum ConnectionRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

// Connection operation result type
export type ConnectionResult = {
  success: boolean;
  error?: any | null;
  connectionId?: string;
};

// Connection request operation result type
export type ConnectionRequestResult = {
  success: boolean;
  error?: any | null;
  requestId?: string;
};

// Connection statistics type
export type ConnectionStats = {
  totalConnections: number;
  pendingRequests: number;
  sentRequests: number;
  error: any | null;
};
