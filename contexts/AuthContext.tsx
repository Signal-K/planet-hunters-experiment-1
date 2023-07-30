import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthUser {
  id: string;
  email: string;
  isAnonymous: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from AsyncStorage
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('auth_user');
        if (mounted && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!email || !password) throw new Error('Email and password required');
    
    const newUser: AuthUser = {
      id: `user_${Date.now()}`,
      email,
      isAnonymous: false,
    };
    
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
    await AsyncStorage.setItem(`auth_password_${newUser.id}`, password);
    setUser(newUser);
  };

  const signIn = async (email: string, password: string) => {
    if (!email || !password) throw new Error('Email and password required');
    
    const newUser: AuthUser = {
      id: `user_${Date.now()}`,
      email,
      isAnonymous: false,
    };
    
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const signInAnonymously = async () => {
    const newUser: AuthUser = {
      id: `anon_${Date.now()}`,
      email: `anonymous${Date.now()}@example.com`,
      isAnonymous: true,
    };
    
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const signOut = async () => {
    console.log('SignOut called');
    try {
      await AsyncStorage.removeItem('auth_user');
      console.log('Removed auth_user from AsyncStorage');
      setUser(null);
      console.log('Set user to null');
    } catch (error) {
      console.error('Error during signOut:', error);
    }
  };

  const value = {
    user,
    isLoading,
    signUp,
    signIn,
    signInAnonymously,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
