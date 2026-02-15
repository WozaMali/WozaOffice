"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { logAdminSessionEvent } from '@/lib/admin-session-logging';
import { LogoutUtils } from '@/lib/logout-utils';

// Types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, profileData: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logoutInProgressRef = useRef(false);

  // Fetch user profile from unified schema first, fallback to legacy profiles table
  const fetchProfile = async (userId: string, timeoutMs: number = 5000) => {
    try {
      console.log('🔍 Fetching profile for user (unified users):', userId);
      
      // Fetch profile with timeout - try unified users table first
      // Simplified query without join to avoid slow performance
      const supabase = getSupabaseClient();
      const profilePromise = supabase
        .from('users')
        .select(`
          id, 
          email, 
          full_name, 
          phone, 
          status, 
          role_id
        `)
        .eq('id', userId)
        .maybeSingle();
      
      // Create a timeout promise that rejects
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs);
      });
      
      // Race between timeout and actual query
      let unifiedUser, unifiedError;
      let queryCompleted = false;
      try {
        const result = await Promise.race([
          profilePromise.then(r => {
            queryCompleted = true;
            return r;
          }),
          timeoutPromise
        ]);
        unifiedUser = result.data;
        unifiedError = result.error;
      } catch (timeoutErr: any) {
        if (timeoutErr?.message === 'Profile fetch timeout' && !queryCompleted) {
          // Silently use minimal profile - this is expected for slow connections
          // The query will continue in background, but we return minimal profile now
          const supabase = getSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          const email = session?.user?.email || '';
          const roleGuess = email.toLowerCase().includes('superadmin@wozamali.co.za')
            ? 'super_admin'
            : (email.toLowerCase().includes('admin@wozamali.com') ? 'admin' : 'resident');
          
          return {
            id: userId,
            email,
            full_name: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '',
            phone: session?.user?.user_metadata?.phone || undefined,
            role: roleGuess,
            is_active: true,
            created_at: new Date().toISOString(),
          } as Profile;
        }
        // Re-throw other errors
        throw timeoutErr;
      }

      if (!unifiedError && unifiedUser) {
        console.log('✅ Unified user profile fetched:', unifiedUser.id);
        
        // Fetch role name separately if role_id exists (non-blocking, can fail)
        let roleName = 'resident';
        if (unifiedUser.role_id) {
          try {
            const supabase = getSupabaseClient();
            const { data: roleData } = await Promise.race([
              supabase.from('roles').select('name').eq('id', unifiedUser.role_id).maybeSingle(),
              new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 500))
            ]);
            if (roleData?.name) {
              roleName = roleData.name;
            }
          } catch (roleErr) {
            console.warn('⚠️ Role fetch failed, using default');
          }
        }
        
        const mapped: Profile = {
          id: unifiedUser.id,
          email: unifiedUser.email,
          full_name: unifiedUser.full_name || '',
          phone: unifiedUser.phone || undefined,
          role: roleName,
          is_active: (unifiedUser.status || 'active') === 'active',
          created_at: new Date().toISOString(),
        };
        return mapped;
      }

      // Only fallback if there's a real error (not just missing data)
      // This prevents unnecessary fallbacks that cause data inconsistency
      if (unifiedError) {
        // Check if it's a real error (table missing, permission denied) vs just no data found
        const isRealError = unifiedError.code === 'PGRST205' || 
                           unifiedError.message?.includes('permission denied') ||
                           unifiedError.message?.includes('relation') ||
                           unifiedError.message?.includes('does not exist');
        
        if (isRealError) {
          console.log('ℹ️ Unified users table error, trying legacy profiles:', unifiedError.message);
          try {
            // Try legacy with timeout
            const supabase = getSupabaseClient();
            const legacyPromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            const legacyResult = await Promise.race([
              legacyPromise,
              new Promise<{ data: null, error: null }>((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 1000)
              )
            ]);
            
            if ('data' in legacyResult && legacyResult.data && !legacyResult.error) {
              console.log('✅ Legacy profile fetched successfully:', legacyResult.data.id);
              return legacyResult.data as Profile;
            }
          } catch (e) {
            console.warn('⚠️ Legacy profiles also unavailable');
          }
        } else {
          // Query succeeded but no data found - user might not exist in unified table yet
          // Don't fallback, just use minimal profile to avoid data inconsistency
          console.log('ℹ️ User not found in unified users table (not an error)');
        }
      }

      // Minimal profile derived from session when tables are missing
      // Reuse supabase from line 52
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || '';
      const roleGuess = email.toLowerCase().includes('superadmin@wozamali.co.za')
        ? 'super_admin'
        : (email.toLowerCase().includes('admin@wozamali.com') ? 'admin' : 'resident');
      return {
        id: userId,
        email,
        full_name: '',
        phone: undefined,
        role: roleGuess,
        is_active: true,
        created_at: new Date().toISOString(),
      } as Profile;
    } catch (err: any) {
      // Only log non-timeout errors (timeout is expected and handled gracefully)
      if (err?.message !== 'Profile fetch timeout') {
        console.error('❌ Error in fetchProfile:', err);
      }
      // As a last resort build minimal profile from current session
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email || '';
        const roleGuess = email.toLowerCase().includes('superadmin@wozamali.co.za')
          ? 'super_admin'
          : (email.toLowerCase().includes('admin@wozamali.com') ? 'admin' : 'resident');
        return {
          id: session.user.id,
          email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
          phone: session.user.user_metadata?.phone || undefined,
          role: roleGuess,
          is_active: true,
          created_at: new Date().toISOString(),
        } as Profile;
      }
      return null;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = (password || '').trim();
      console.log('🔐 Login attempt for:', normalizedEmail);
      setError(null);
      
      // Reset logout flag on explicit login
      logoutInProgressRef.current = false;
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Login successful for user:', data.user.id);
        setUser(data.user);
        
        // Create minimal profile immediately from session (don't wait for DB)
        const email = data.user.email || '';
        const roleGuess = email.toLowerCase().includes('superadmin@wozamali.co.za')
          ? 'super_admin'
          : (email.toLowerCase().includes('admin@wozamali.com') ? 'admin' : 'resident');
        
        const minimalProfile: Profile = {
          id: data.user.id,
          email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
          phone: data.user.user_metadata?.phone || undefined,
          role: roleGuess,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setProfile(minimalProfile);
        
        // Fetch full profile in background - don't block login response
        // Use longer timeout for login to ensure we get the full profile
        fetchProfile(data.user.id, 5000).then(userProfile => {
          if (userProfile) {
            setProfile(userProfile);
          }
        }).catch(err => {
          // Silently keep minimal profile if fetch fails - this is expected for slow connections
          // The minimal profile is sufficient for immediate login needs
        });
        
        // Log session event in background
        logAdminSessionEvent(data.user.id, 'login').catch(() => {});
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (err) {
      console.error('❌ Login exception:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, profileData: Partial<Profile>) => {
    try {
      setError(null);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create profile in profiles table
        const supabase = getSupabaseClient();
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email!,
              full_name: profileData.full_name || '',
              role: profileData.role || 'resident',
              is_active: true,
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { success: false, error: 'Profile creation failed' };
        }

        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: 'Sign up failed' };
    } catch (err) {
      console.error('Sign up error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Password reset function with explicit redirect
  const resetPassword = async (email: string) => {
    try {
      console.log('🔐 Sending password reset for:', email);
      console.log('🔐 Redirect URL will be: http://localhost:8081/admin-login');
      
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:8081/admin-login'
      });
      
      if (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ Password reset email sent successfully');
      console.log('✅ Check email for magic link that should redirect to localhost:8081');
      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Enhanced logout function with comprehensive session clearing
  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');
      const currentUserId = user?.id;
      
      // Mark logout in progress to prevent auto-login
      logoutInProgressRef.current = true;
      
      // Clear local state first (immediate feedback)
      setUser(null);
      setProfile(null);
      
      // Log session event in background (don't block)
      logAdminSessionEvent(currentUserId || null, 'logout').catch(() => {});
      
      // Use comprehensive logout utility
      const supabase = getSupabaseClient();
      try {
        await LogoutUtils.performCompleteLogout(supabase);
        console.log('✅ User logged out successfully and all session data cleared');
      } catch (logoutError) {
        console.error('❌ Logout utility error:', logoutError);
        // Try basic signout as fallback
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('❌ Basic signout also failed:', signOutError);
        }
        // Clear storage manually as fallback
        if (typeof window !== 'undefined') {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (storageError) {
            console.error('❌ Storage clear failed:', storageError);
          }
        }
      }
      
      // Keep logout flag set - don't reset it to prevent auto-login
      // The flag will be reset when user explicitly logs in again
    } catch (err) {
      console.error('❌ Logout error:', err);
      // Even if logout fails, clear local state
      setUser(null);
      setProfile(null);
      // Try to clear storage anyway
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      }
      // Still mark logout in progress
      logoutInProgressRef.current = true;
    }
  };

  // Update profile function
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Refresh profile
      await refreshProfile();
      return { success: true };
    } catch (err) {
      console.error('Profile update error:', err);
      return { success: false, error: 'Profile update failed' };
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (!user) return;

    try {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    } catch (err) {
      console.error('Profile refresh error:', err);
    }
  };

  // Update password function
  const updatePassword = async (password: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (err: any) {
      console.error('Password update error:', err);
      return { success: false, error: 'Password update failed' };
    }
  };

  // Effect to handle auth state changes
  useEffect(() => {
    console.log('🔐 useAuth: Starting auth state check');
    
    // Set a maximum loading time to prevent infinite loading
    const maxLoadingTimeout = setTimeout(() => {
      // Silently stop loading - this is expected for slow connections
      setIsLoading(false);
    }, 5000); // 5 seconds max - allows time for profile fetch
    
    const checkUser = async () => {
      const supabase = getSupabaseClient();
      try {
        console.log('🔐 useAuth: Fetching user session...');
        // Get current session - this is a local operation and should be fast
        // No timeout needed as it reads from localStorage
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ useAuth: Session error:', error);
          // On error, set loading to false immediately
          clearTimeout(maxLoadingTimeout);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          // On page refresh/initial load, always restore session if it exists
          // Only block session restoration in the auth state change listener (after explicit logout)
          console.log('✅ useAuth: User session found:', session.user.id);
          setUser(session.user);
          // Fetch profile in background - don't block on it
          fetchProfile(session.user.id)
            .then(userProfile => {
              setProfile(userProfile);
            })
            .catch(profileErr => {
              console.error('❌ useAuth: Profile fetch failed, using minimal profile:', profileErr);
              // Create minimal profile to prevent infinite loading
              setProfile({
                id: session.user.id,
                email: session.user.email || '',
                full_name: '',
                phone: undefined,
                role: 'admin',
                is_active: true,
                created_at: new Date().toISOString(),
              });
            })
            .finally(() => {
              clearTimeout(maxLoadingTimeout);
              setIsLoading(false);
            });
        } else {
          console.log('ℹ️ useAuth: No user session found');
          // Reset logout flag if no session exists
          logoutInProgressRef.current = false;
          clearTimeout(maxLoadingTimeout);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ useAuth: Error fetching user:', err);
        // On error, ensure we still set loading to false immediately
        clearTimeout(maxLoadingTimeout);
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 useAuth: Auth state change:', event, session?.user?.id);
        
        // If logout is in progress, ignore SIGNED_IN events to prevent auto-login
        if (logoutInProgressRef.current && event === 'SIGNED_IN') {
          console.log('🔐 useAuth: Ignoring SIGNED_IN event - logout in progress');
          // Clear the session that was auto-restored
          try {
            await getSupabaseClient().auth.signOut();
          } catch {}
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }
        
        // Reset logout flag on explicit sign out
        if (event === 'SIGNED_OUT') {
          logoutInProgressRef.current = false;
        }
        
        if (session?.user) {
          // Only set user if logout is not in progress
          if (!logoutInProgressRef.current) {
            setUser(session.user);
            const userProfile = await fetchProfile(session.user.id);
            if (userProfile) {
            setProfile(userProfile);
            } else {
              // If profile fetch fails, it might indicate an invalid session or user
              console.warn('🔐 useAuth: Profile fetch failed after SIGNED_IN. Forcing logout.');
              await logout(); // Use the logout function to clear everything
              return;
            }
            // Reset logout flag on successful login
            logoutInProgressRef.current = false;
          } else {
            // Logout in progress - clear the session
            console.log('🔐 useAuth: Ignoring SIGNED_IN event and clearing auto-restored session - logout in progress');
            try {
              await getSupabaseClient().auth.signOut();
            } catch {}
            setUser(null);
            setProfile(null);
          }
        } else {
          console.log('🔐 useAuth: No session found or SIGNED_OUT event. Clearing user/profile.');
          setUser(null);
          setProfile(null);
          // Also perform a full logout if it's a SIGNED_OUT event or no session to ensure all traces are gone
          if (event === 'SIGNED_OUT') {
            await LogoutUtils.performCompleteLogout(supabase);
            LogoutUtils.forceRedirectToHome(); // Redirect to login page
          }
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    error,
    login,
    signUp,
    resetPassword,
    logout,
    updateProfile,
    updatePassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
