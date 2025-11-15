import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { getAuthInstance, getGoogleProvider } from '../firebase/config';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  idToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const initAuthListener = async () => {
      try {
        const firebaseAuth = await getAuthInstance();
        unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
          if (!isMounted) {
            return;
          }

          setUser(currentUser);

          if (currentUser) {
            const token = await currentUser.getIdToken();
            setIdToken(token);
            try {
              await axios.post(`${API_URL}/auth/verify`, { token });
            } catch (error) {
              // Token verification failed - handled silently
            }
          } else {
            setIdToken(null);
          }

          setLoading(false);
        });
      } catch (error) {
        console.error('Failed to initialize Firebase auth', error);
        setLoading(false);
      }
    };

    initAuthListener();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [API_URL]);

  const signIn = async () => {
    try {
      const [firebaseAuth, provider] = await Promise.all([getAuthInstance(), getGoogleProvider()]);
      const result = await signInWithPopup(firebaseAuth, provider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      await axios.post(`${API_URL}/auth/verify`, { token });
    } catch (error) {
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const firebaseAuth = await getAuthInstance();
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const token = await result.user.getIdToken();
      setIdToken(token);
      await axios.post(`${API_URL}/auth/verify`, { token });
    } catch (error) {
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      const firebaseAuth = await getAuthInstance();
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      
      // Update profile with display name if provided
      if (name && result.user) {
        await updateProfile(result.user, { displayName: name });
      }
      
      const token = await result.user.getIdToken();
      setIdToken(token);
      await axios.post(`${API_URL}/auth/verify`, { token });
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const firebaseAuth = await getAuthInstance();
      await firebaseSignOut(firebaseAuth);
      setIdToken(null);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithEmail, signUpWithEmail, signOut, idToken }}>
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

