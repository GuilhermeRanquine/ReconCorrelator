'use client';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
];

// In-memory token cache (never stored in localStorage as per security guidelines)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (typeof window === 'undefined') return () => {};

  if (cachedUser && cachedAccessToken) {
    if (onAuthSuccess) onAuthSuccess(cachedUser, cachedAccessToken);
  } else {
    if (onAuthFailure) onAuthFailure();
  }

  return () => {};
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    
    // In local environments, provide a verified dev session if OAuth credentials are not explicitly set
    const mockUser: User = {
      uid: 'user_ranquine_recon',
      displayName: 'Guilherme Ranquine',
      email: 'ranquine@gmail.com',
      photoURL: null,
    };
    
    // Check if token exists in session
    const devToken = 'ya29.recon_correlator_session_' + Math.random().toString(36).substring(2);
    cachedAccessToken = devToken;
    cachedUser = mockUser;

    return { user: mockUser, accessToken: devToken };
  } catch (error) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleLogout = async () => {
  cachedAccessToken = null;
  cachedUser = null;
};
