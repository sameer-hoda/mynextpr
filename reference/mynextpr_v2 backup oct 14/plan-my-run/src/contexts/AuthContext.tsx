// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { googleAuth } from '@/integrations/auth/googleAuth';
import { apiClient } from '@/integrations/api/client';

interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.debug("DEBUG: AuthProvider mounted - initializing session");
    
    const initializeAuth = async () => {
      try {
        // Try to validate session with backend first
        await googleAuth.checkStoredSession();
        
        // Get current session
        const { data: { session } } = googleAuth.getSession();
        if (session) {
          console.debug("DEBUG: Found existing session, setting user:", session.user.id);
          setUser(session.user);
          
          // Fetch profile
          await fetchProfile(session.user.id);
        } else {
          console.debug("DEBUG: No existing session found");
        }
      } catch (error) {
        console.error("DEBUG: Error during auth initialization:", error);
      } finally {
        setLoading(false);
      }

      // Listen for auth changes
      console.debug("DEBUG: Setting up auth state change listener");
      const unsubscribe = googleAuth.onAuthStateChange(async (user) => {
        console.debug("DEBUG: Auth state changed, new user:", user?.id || null);
        if (user) {
          setUser(user);
          await fetchProfile(user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    initializeAuth();

    return () => {
      console.debug("DEBUG: Cleaning up auth state change listener");
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.debug("DEBUG: Fetching profile for user:", userId);
    try {
      const profile = await apiClient.getProfile(userId);
      console.debug("DEBUG: Profile fetched:", profile);
      setProfile(profile || null);
    } catch (error) {
      console.error('DEBUG: Error fetching profile:', error);
    }
  };

  const signInWithGoogle = async () => {
    console.debug("DEBUG: signInWithGoogle called in AuthContext");
    try {
      const result = await googleAuth.signInWithGoogle();
      if (result.error) throw result.error;
      
      // The redirect will handle the rest of the process
      console.debug("DEBUG: Google sign in initiated in AuthContext");
    } catch (error: any) {
      console.error('DEBUG: Error signing in with Google in AuthContext:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.debug("DEBUG: signOut called in AuthContext");
    try {
      const result = await googleAuth.signOut();
      if (result.error) throw result.error;
      
      console.debug("DEBUG: Sign out completed in AuthContext");
    } catch (error) {
      console.error('DEBUG: Error signing out in AuthContext:', error);
      // Even if there's an error, clear local state
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    console.debug("DEBUG: refreshProfile called");
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile
  };

  console.debug("DEBUG: AuthContext provider value:", value);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};