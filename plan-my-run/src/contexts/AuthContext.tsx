// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { apiClient } from '@/integrations/api/client';
import { jwtDecode } from 'jwt-decode'; // Make sure to install jwt-decode: npm install jwt-decode

interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signInAsTestUser: () => Promise<void>;
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
    const loadUserFromToken = async () => {
      const { value } = await Preferences.get({ key: 'authToken' });
      const token = value || localStorage.getItem('authToken');

      if (token) {
        try {
          const decoded: User = jwtDecode(token);
          setUser(decoded);
          await fetchProfile(decoded.id);
        } catch (error) {
          console.error('Invalid token', error);
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    };
    loadUserFromToken();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const profileData = await apiClient.getProfile(userId);
      setProfile(profileData || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signInWithGoogle = () => {
    // Use VITE_API_URL which is set in the Appflow build environment
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    // The VITE_API_URL includes the /api path, so we just append the specific endpoint
    window.location.href = `${apiUrl}/auth/google`;
  };

  const signInAsTestUser = async () => {
    const randomId = `testuser_${Date.now()}`;
    const testUser: User = {
      id: randomId,
      email: `${randomId}@example.com`,
      displayName: 'Test User',
    };

    // This is a mock JWT. In a real app, the backend would create this.
    const mockToken = btoa(JSON.stringify({ id: testUser.id, email: testUser.email, displayName: testUser.displayName })) + '.' + btoa(JSON.stringify({})) + '.' + btoa(JSON.stringify({}));
    
    await Preferences.set({ key: 'authToken', value: mockToken });
    localStorage.setItem('authToken', mockToken);
    
    setUser(testUser);
    await fetchProfile(testUser.id);
  };

  const signOut = async () => {
    await Preferences.remove({ key: 'authToken' });
    localStorage.removeItem('authToken');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signInWithGoogle,
    signInAsTestUser,
    signOut,
    refreshProfile
  };

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