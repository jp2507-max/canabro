import { Session, User } from '@supabase/supabase-js';
// import Constants from 'expo-constants'; // Constants is unused
import { router } from 'expo-router';
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

import { authConfig, isDevelopment } from '../config'; // isExpoGo is unused
import supabase, { initializeDatabase } from '../supabase';

// Define the shape of our auth context
interface AuthContextProps {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; data: { user: User | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  devBypassAuth: () => Promise<{ error: Error | null }>;
  getProfile: (userId: string) => Promise<any | null>;
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
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Get the initial session
    const initializeAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing...');
        // Initialize database schema if needed
        console.log('[AuthProvider] Calling initializeDatabase...');
        await initializeDatabase();
        console.log('[AuthProvider] initializeDatabase complete.');

        // For development environment, use dev bypass if configured
        if (isDevelopment && authConfig.forceDevBypass) {
          if (authConfig.enableAuthLogging) {
            console.log('Development environment detected, using dev bypass auth');
          }
          await devBypassAuth();
          console.log('[AuthProvider] Dev bypass complete.');
          return;
        } else {
          console.log(
            '[AuthProvider] Dev bypass NOT active (isDevelopment:',
            isDevelopment,
            ', forceDevBypass:',
            authConfig.forceDevBypass,
            ')'
          );
        }

        console.log('[AuthProvider] Calling supabase.auth.getSession...');
        const { data } = await supabase.auth.getSession();
        console.log(
          '[AuthProvider] supabase.auth.getSession complete. Session:',
          data.session ? 'Exists' : 'Null'
        );
        setSession(data.session);
        setUser(data.session?.user || null);
        // Set loading to false only AFTER session is set
        console.log('[AuthProvider] Setting loading to false.');
        setLoading(false);
      } catch (error) {
        console.error('[AuthProvider] Error during initializeAuth:', error);
        // Also set loading false in case of error
        console.log('[AuthProvider] Setting loading to false after error.');
        setLoading(false);
      }
      // Removed finally block as setLoading is handled in try/catch
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Skip session updates in dev mode if using bypass
      if (isDevelopment && authConfig.forceDevBypass) {
        return;
      }

      setSession(newSession);
      setUser(newSession?.user || null);
    });

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Ensure a user profile exists in the database
  const ensureUserProfile = async (userId: string, email: string = '') => {
    if (authConfig.enableAuthLogging) {
      console.log('Ensuring profile exists for user:', userId);
    }

    try {
      // First check if profile already exists
      const { data: existingProfile } = await supabase // checkError is unused
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // If profile exists, return it
      if (existingProfile) {
        return existingProfile;
      }

      // Generate a username from email if available
      const username = email ? email.split('@')[0] : `user_${Date.now()}`;

      // Create new profile
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            auth_provider: 'email',
            email_verified: false,
            last_sign_in: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating profile:', error);
      return null;
    }
  };

  // Fetch the user profile from the database
  const getProfile = async (userId: string) => {
    if (authConfig.enableAuthLogging) {
      console.log('Fetching profile for user:', userId);
    }

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        console.error('Error fetching profile:', error);

        // Check if the error is 'no rows returned'
        if (error.code === 'PGRST116') {
          if (authConfig.enableAuthLogging) {
            console.log('No profile found, trying to create one');
          }

          // Profile doesn't exist, try to create it
          return await ensureUserProfile(userId, user?.email || '');
        }

        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in getProfile:', error);
      return null;
    }
  };

  // Development-only function to bypass Supabase auth for testing
  const devBypassAuth = async () => {
    // --- Bypass Disabled ---
    console.warn('devBypassAuth called but is explicitly disabled!');
    return { error: new Error('Development bypass authentication is disabled.') };
    // --- Original Bypass Logic Commented Out ---
    /*
    // Only allow in development environment
    if (!isDevelopment) {
      console.error('Dev bypass auth can only be used in development');
      return { error: new Error('Not in development mode') };
    }
    
    try {
      if (authConfig.enableAuthLogging) {
        console.log('Using dev bypass authentication');
      }
      
      // Create a mock session and user with a stable ID and all required fields
      const mockUser = {
        id: authConfig.mockUserId,
        email: authConfig.mockUserEmail,
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: {
          provider: 'email'
        },
        user_metadata: {
          username: 'dev_user'
        },
        // Add required User properties
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phone: '',
        confirmation_sent_at: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: null,
        banned_until: null,
        reauthentication_token: null,
        recovery_token: null
      } as unknown as User; // Safe type assertion after adding required properties
      
      // Generate mock tokens with long expiry
      const now = new Date();
      const expiryDays = authConfig.mockTokenExpiryDays;
      const expiresAt = now.getTime() + (3600 * 24 * expiryDays * 1000);
      
      const mockSession = {
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
        expires_in: 3600 * 24 * expiryDays,
        expires_at: expiresAt,
        token_type: 'bearer',
        user: mockUser
      } as unknown as Session; // Safe type assertion
      
      // Set the mock session and user in state
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
      
      // Store in secure storage for persistence
      try {
        await supabase.auth.setSession(mockSession);
      } catch (error) {
        if (authConfig.enableAuthLogging) {
          console.log('Error setting mock session in storage, continuing anyway');
        }
      }
      
      // Attempt to create a dev profile in the database
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: mockUser.id,
            username: 'dev_user',
            full_name: 'Development User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            auth_provider: 'email',
            email_verified: true,
            last_sign_in: new Date().toISOString()
          }, { onConflict: 'id' });
      } catch (profileError) {
        if (authConfig.enableAuthLogging) {
          console.log('Error creating dev profile, continuing anyway:', profileError);
        }
      }
      
      // Delay navigation to ensure root layout is mounted
      setTimeout(() => {
        console.trace('🔥 router.replace("/(tabs)")');
        router.replace('/(tabs)');
      }, 100);
      
      return { error: null };
    } catch (error) {
      console.error('Error in dev bypass auth:', error);
      return { error: error as Error };
    }
    */
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      // If we're in development mode and force bypass is enabled, use dev bypass auth
      if (isDevelopment && authConfig.forceDevBypass) {
        return devBypassAuth();
      }

      // Try to sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Authentication error:', error);
        return { error };
      }

      // Check if user and session exist
      if (!data.user || !data.session) {
        return { error: new Error('No user or session returned from signIn') };
      }

      // Try to ensure user profile exists in the database
      try {
        const profile = await getProfile(data.user.id);

        if (authConfig.enableAuthLogging && profile) {
          console.log('User profile found:', profile.username);
        }
      } catch (profileError) {
        console.error('Error ensuring profile exists:', profileError);
        // Continue even if profile creation fails, for better UX
      }

      // Navigate to home screen on successful login
      setTimeout(() => {
        console.trace('🔥 router.replace("/(tabs)")');
        router.replace('/(tabs)');
      }, 100);

      // Success, return no error
      return { error: null };
    } catch (error) {
      console.error('Unexpected auth error:', error);
      return { error: error as Error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Ensure user profile exists after successful registration
      if (data.user) {
        await ensureUserProfile(data.user.id, email);
      }

      // If sign up is successful and email confirmation is not required,
      if (data.session) {
        console.trace('🔥 router.replace("/(tabs)")');
        router.replace('/(tabs)');
      } else {
        // If email confirmation is required, navigate to a confirmation screen
        console.trace('🔥 router.replace("/(auth)/login")');
        router.replace('/(auth)/login');
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
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data } = await supabase.auth.refreshSession();
      setSession(data.session);
      setUser(data.session?.user || null);
    } catch (error) {
      console.error('Error refreshing session:', error);
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
      }}>
      {children}
    </AuthContext.Provider>
  );
}
