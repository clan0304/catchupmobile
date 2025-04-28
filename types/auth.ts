// types/auth.ts
import { Session, User } from '@supabase/supabase-js';

// Profile data structure
export type ProfileData = {
  id?: string;
  username: string;
  instagram_url: string;
  city: string;
  photo_url?: string;
  interests: string[];
  bio: string;
  created_at?: string;
  updated_at?: string;
};

// Auth result type
export type AuthResult = {
  success: boolean;
  error?: string | null;
  user?: User | null;
};

// Profile operation result
export type ProfileResult = {
  success: boolean;
  error?: any | null;
  profile?: ProfileData | null;
};

// Media upload result
export type MediaUploadResult = {
  url: string | null;
  error: any | null;
};

// Auth context interface
export type AuthContextType = {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileComplete: boolean;

  // Authentication methods
  signInWithGoogle: (promptAccountSelection?: boolean) => Promise<void>;
  signOut: () => Promise<void>;

  // Profile methods
  checkUsernameUnique: (username: string) => Promise<boolean>;
  completeProfile: (profileData: ProfileData) => Promise<{ error: any | null }>;
  uploadProfilePhoto: (uri: string) => Promise<MediaUploadResult>;
};

// Auth navigation state
export enum AuthScreenState {
  SIGN_IN = 'signIn',
  LOADING = 'loading',
  ERROR = 'error',
  CALLBACK = 'callback',
}

// Generic operation result
export type OperationResult<T = void> = {
  data?: T;
  error?: any;
};
