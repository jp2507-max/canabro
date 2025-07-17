import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

import { authConfig, isDevelopment } from '../config';
import supabase, { initializeDatabase } from '../supabase';

// Define the shape of our profile context
export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
}

// Define the shape of our auth context
interface AuthContextProps {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  devBypassAuth: () => Promise<{ error: Error | null }>;
  getProfile: (userId: string) => Promise<Profile | null>;
  passwordReset: (email: string) => Promise<{ error: Error | null }>;
  updateUserPassword: (password: string) => Promise<{ error: Error | null }>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextProps>({
  session: null,
  user: null,
  loading: true,
  signUp: async () => ({ error: null, data: { user: null } }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshSession: async () => {},
  devBypassAuth: async () => ({ error: null }),
  getProfile: async () => null,
  passwordReset: async () => ({ error: null }),
  updateUserPassword: async () => ({ error: null }),
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await initializeDatabase();
        if (isDevelopment && authConfig.forceDevBypass) {
          await devBypassAuth();
          if (isMounted) setLoading(false);
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user || null);
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthProvider] Error during initializeAuth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isDevelopment && authConfig.forceDevBypass) return;
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const ensureUserProfile = async (userId: string, email: string = ''): Promise<Profile | null> => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) return existingProfile;

      const username = email ? email.split('@')[0] : `user_${Date.now()}`;
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, username }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      return null;
    }
  };

  const getProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) return data;
      return ensureUserProfile(userId, user?.email || '');
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  };

  const devBypassAuth = async (): Promise<{ error: Error | null }> => {
    if (!isDevelopment) return { error: new Error('Not in development mode') };
    try {
      const mockUser = { id: authConfig.mockUserId, email: authConfig.mockUserEmail, role: 'authenticated', aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { username: 'dev_user' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), phone: '', } as unknown as User;
      const expiresAt = Date.now() + 3600 * 24 * authConfig.mockTokenExpiryDays * 1000;
      const mockSession = { access_token: 'mock_access_token', refresh_token: 'mock_refresh_token', expires_in: 3600 * 24, expires_at: expiresAt, token_type: 'bearer', user: mockUser } as unknown as Session;
      
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);

      try {
        await supabase.auth.setSession(mockSession);
      } catch (_error) { /* ignore */ }

      try {
        await supabase.from('profiles').upsert({ id: mockUser.id, username: 'dev_user' }, { onConflict: 'id' });
      } catch (_error) { /* ignore */ }

      setTimeout(() => { try { router.replace('/(app)/(tabs)'); } catch (_e) { /* ignore */ } }, 100);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      if (isDevelopment && authConfig.forceDevBypass) return devBypassAuth();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user || !data.session) throw new Error('Sign in failed');
      setTimeout(() => { try { router.replace('/(app)/(tabs)'); } catch (_e) { /* ignore */ } }, 100);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string): Promise<{ error: Error | null; data: { user: User | null } }> => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) await ensureUserProfile(data.user.id, email);
      if (data.user) {
        await ensureUserProfile(data.user.id, email);
      }

      // If sign up is successful and email confirmation is not required,
      if (data.session) {
        console.trace('🔥 router.replace("/(app)/(tabs)")');
        try {
          router.replace('/(app)/(tabs)' as any);
        } catch (error) {
          console.warn('Navigation not ready yet, skipping redirect to tabs:', error);
        }
      } else {
        // If email confirmation is required, navigate to a confirmation screen
        console.trace('🔥 router.replace("/(auth)/login")');
        try {
          router.replace('/(auth)/login');
        } catch (error) {
          console.warn('Navigation not ready yet, skipping redirect to login:', error);
        }
      }

      return { error: null, data: { user: data.user } };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error: error as Error, data: { user: null } };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      console.trace('🔥 router.replace("/(auth)/login")');
      try {
        router.replace('/(auth)/login');
      } catch (error) {
        console.warn('Navigation not ready yet, skipping redirect to login:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Send password reset email
  const passwordReset = async (email: string) => {
    try {
      // Supabase sends a magic link to the user's email for password recovery.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // The redirectTo option is required for the user to be redirected back
        // to your app after clicking the link. This URL should point to a page
        // in your app that handles password updates.
        // NOTE: This is not yet implemented, but the URL is required.
        redirectTo: authConfig.passwordResetRedirectTo,
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error sending password reset email:', error);
      return { error: error as Error };
    }
  };

  // Refresh session
  const refreshSession = async (): Promise<void> => {
    try {
      const { data } = await supabase.auth.refreshSession();
      setSession(data.session);
      setUser(data.session?.user || null);
    } catch (_error) { /* ignore */ }
  };

  const updateUserPassword = async (password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Provide the auth context to children
  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signUp,
        signIn,
        signOut,
        refreshSession,
        devBypassAuth,
        getProfile,
        passwordReset,
        updateUserPassword,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
