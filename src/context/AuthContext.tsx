import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  auth, 
  googleAuthProvider,
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged,
} from '../lib/firebase.ts';
import type { UserProfile } from '../types.ts';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('aegis_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('aegis_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const getIdToken = async (): Promise<string | null> => {
    const localToken = localStorage.getItem('aegis_auth_token');
    if (localToken) return localToken;
    if (auth.currentUser) return await auth.currentUser.getIdToken();
    return null;
  };

  const refreshProfile = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        if (data.user) {
          setUser({
            uid: data.user.uid,
            email: data.user.email,
            displayName: data.user.displayName,
            photoURL: data.user.photoUrl || null,
          });
        }
      } else if (res.status === 401) {
        localStorage.removeItem('aegis_auth_token');
        setUser(null);
        setProfile(null);
      }
    } catch (e) {
      console.error('Failed to sync profile', e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const localToken = localStorage.getItem('aegis_auth_token');
      if (localToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${localToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data.user);
            setUser({
              uid: data.user.uid,
              email: data.user.email,
              displayName: data.user.displayName,
              photoURL: data.user.photoUrl || null,
            });
            setLoading(false);
            return;
          } else {
            localStorage.removeItem('aegis_auth_token');
          }
        } catch {
          // network error
        }
      }

      // Check Firebase state
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });
          await refreshProfile();
        } else if (!localStorage.getItem('aegis_auth_token')) {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    let unsub: (() => void) | undefined;
    initAuth().then(u => { unsub = u; });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const signInWithGoogleHandler = async () => {
    localStorage.removeItem('aegis_auth_token');
    const result = await signInWithPopup(auth, googleAuthProvider);
    if (result.user) {
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
      await refreshProfile();
    }
  };

  const signInWithEmailHandler = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Invalid email or password combination.');
    }

    localStorage.setItem('aegis_auth_token', body.token);
    setProfile(body.user);
    setUser({
      uid: body.user.uid,
      email: body.user.email,
      displayName: body.user.displayName,
      photoURL: body.user.photoUrl || null,
    });
  };

  const registerWithEmailHandler = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Failed to register account.');
    }

    localStorage.setItem('aegis_auth_token', body.token);
    setProfile(body.user);
    setUser({
      uid: body.user.uid,
      email: body.user.email,
      displayName: body.user.displayName,
      photoURL: body.user.photoUrl || null,
    });
  };

  const resetPasswordHandler = async (email: string) => {
    await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  };

  const signOutHandler = async () => {
    localStorage.removeItem('aegis_auth_token');
    try {
      await firebaseSignOut(auth);
    } catch {}
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    theme,
    toggleTheme,
    signInWithGoogle: signInWithGoogleHandler,
    signInWithEmail: signInWithEmailHandler,
    registerWithEmail: registerWithEmailHandler,
    resetPassword: resetPasswordHandler,
    signOut: signOutHandler,
    refreshProfile,
    getIdToken,
    searchQuery,
    setSearchQuery,
  }), [user, profile, loading, theme, searchQuery]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
