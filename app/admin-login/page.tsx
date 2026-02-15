"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle, 
  Building2,
  AlertCircle,
  ArrowLeft,
  Shield,
  Crown,
  Mail,
  Lock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { config } from "@/lib/config";
import { getSupabaseClient } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper function to check if user has admin privileges
const isAdminUser = (user: any, profile: any) => {
  if (!user) return false;
  
  // Check profile role first (from database)
  if (profile?.role) {
    const role = profile.role.toLowerCase();
    return ['admin', 'super_admin', 'superadmin'].includes(role);
  }
  
  // Special case: superadmin@wozamali.co.za should always be treated as super admin
  const email = user.email?.toLowerCase() || '';
  if (email === 'superadmin@wozamali.co.za') {
    return true;
  }
  
  // Fallback to other admin emails
  return email === 'admin@wozamali.com' || 
         email.includes('admin@wozamali');
};

// Password validation function
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one capital letter');
  }
  
  if (!/[@#$%&]/.test(password)) {
    errors.push('Password must contain at least one symbol (@, #, $, %, or &)');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  let returnTo = searchParams.get('returnTo') || '/admin/dashboard'; // Default to admin dashboard if no return path
  // Ensure returnTo always points to /admin/dashboard if it's /dashboard
  if (returnTo === '/dashboard') {
    returnTo = '/admin/dashboard';
  }
  const [activeTab, setActiveTab] = useState<'admin' | 'superadmin'>('admin');
  const [email, setEmail] = useState('');
  const [superAdminEmail, setSuperAdminEmail] = useState(''); // Separate email for superadmin
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateErrors, setPasswordUpdateErrors] = useState<string[]>([]);
  
  const { login, resetPassword, updatePassword, isLoading: authLoading, user, profile, logout } = useAuth();
  const redirectAttemptedRef = useRef(false);
  const redirectingRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };
  
  // Initialize component - prevent flickering by waiting for auth check to complete
  useEffect(() => {
    // Wait for auth to finish loading, but with a maximum timeout
    if (!authLoading) {
      // Small delay to ensure state is stable before showing form
      initTimeoutRef.current = setTimeout(() => {
        setIsInitialized(true);
      }, 100);
    } else {
      // If auth is still loading, set a maximum timeout to show form anyway
      initTimeoutRef.current = setTimeout(() => {
        setIsInitialized(true);
      }, 2000); // 2 seconds max wait
    }
    
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [authLoading]);
  
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use Supabase OAuth with Office-specific redirect
      const officeLoginUrl = (typeof window !== 'undefined')
        ? `${window.location.origin}/admin-login`
        : (process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || 'http://localhost:8081/admin-login');
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: officeLoginUrl,
          queryParams: {
            // Force consent/select account if needed
            prompt: 'select_account'
          }
        }
      });
      if (error) {
        setError(error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear form when switching tabs
  const handleTabChange = (tab: 'admin' | 'superadmin') => {
    setActiveTab(tab);
    setEmail('');
    setSuperAdminEmail('');
    setPassword('');
    setError(null);
    setPasswordErrors([]);
    setSuccess(null);
  };

  // If user is already logged in and has admin or super_admin role, redirect to admin dashboard
  useEffect(() => {
    // Don't run redirect logic while auth is still loading or component not initialized
    if (authLoading || !isInitialized) {
      return;
    }
    
    // Prevent multiple redirect attempts (but allow if user just logged in)
    // Skip this check if we're in the middle of a login flow (isLoading is true)
    if (redirectingRef.current && !isLoading) {
      return;
    }
    
    const handlePostAuthRouting = async () => {
      if (!user?.email) {
        redirectAttemptedRef.current = false; // Reset if user logs out
        return;
      }
      
      // Mark that we're attempting a redirect
      redirectAttemptedRef.current = true;
      redirectingRef.current = true;

      // Quick role check FIRST - don't wait for profile, check email immediately
      const email = user.email?.toLowerCase() || '';
      const isSuperAdminEmail = email === 'superadmin@wozamali.co.za';
      const isAdminEmail = email.includes('admin@wozamali') || 
                          email === 'admin@wozamali.com' ||
                          email === 'dumisani@sebenzawaste.co.za';
      
      // If super admin or admin email, redirect immediately (don't wait for profile or other checks)
      if (isSuperAdminEmail || isAdminEmail) {
        const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
        console.log('AdminLogin: Redirecting to', redirectPath, '(email check - immediate, returnTo was:', returnTo, ')');
        // Use window.location for more reliable redirect
        window.location.href = redirectPath;
        return;
      }

      // Quick check for password change requirement (non-blocking) - only for non-admin emails
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();
        const must = (data.user?.user_metadata as any)?.must_change_password;
        if (must) {
          router.replace('/auth/change-password');
          redirectingRef.current = false;
          return;
        }
      } catch {}

      // Check if user was created with system password and needs to change it
      const userMetadata = user.user_metadata || {};
      const needsPasswordChange = 
        userMetadata.must_change_password === true ||
        userMetadata.temp_password === true ||
        userMetadata.created_by_admin === true ||
        userMetadata.system_generated === true;
      
      if (needsPasswordChange) {
        console.log('AdminLogin: User needs to change password, redirecting to change password page');
        router.replace('/auth/change-password');
        redirectingRef.current = false;
        return;
      }
      
      // If we have profile with admin role, redirect (fallback check)
      if (profile?.role) {
        const role = profile.role.toLowerCase();
        if (['admin', 'super_admin', 'superadmin'].includes(role)) {
          const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
          console.log('AdminLogin: Redirecting to', redirectPath, '(profile role check, returnTo was:', returnTo, ')');
          // Use window.location for more reliable redirect
          window.location.href = redirectPath;
          return;
        }
      }

      // For other users, check database in background (non-blocking)
      (async () => {
        try {
          // Use API to fetch user details to avoid RLS recursion issues
          let existingUser = null;
          let fetchError = null;

          try {
             const authHeader = await getAuthHeader();
             const res = await fetch('/api/auth/me', { headers: authHeader });
             if (res.ok) {
                 const data = await res.json();
                 if (data.profile) {
                     existingUser = data.profile;
                 }
             } else {
                 // Fallback to direct query if API fails (but this risks RLS error)
                 throw new Error('API failed');
             }
          } catch (apiEx) {
             console.warn('AdminLogin: API check failed, falling back to direct query', apiEx);
             const supabase = getSupabaseClient();
             const { data, error } = await supabase
                .from('users')
                .select('id, role, status')
                .eq('id', user.id)
                .maybeSingle();
             existingUser = data;
             fetchError = error;
          }

          if (fetchError || !existingUser) {
            // First-time Office OAuth: create a pending admin application
            // Use API to create user to avoid RLS recursion issues on INSERT
             const authHeader = await getAuthHeader();
             const regRes = await fetch('/api/auth/register-admin', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', ...authHeader },
                 body: JSON.stringify({
                    id: user.id,
                    email: user.email,
                    first_name: user.user_metadata?.given_name || '',
                    last_name: user.user_metadata?.family_name || '',
                    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                    phone: user.user_metadata?.phone || null,
                    role: 'admin',
                    status: 'pending_approval'
                 })
             });
             
             let insErr = null;
             if (!regRes.ok) {
                 const errData = await regRes.json();
                 // Mimic PostgrestError structure for compatibility
                 insErr = { 
                     message: errData.error || 'Registration failed',
                     code: regRes.status.toString(),
                     details: '',
                     hint: ''
                 };
             } else {
                 // Success
                 insErr = null;
             }
            if (insErr) {
              console.warn('AdminLogin: failed to create onboarding row:', insErr);
              if (insErr.code === '42P17' || insErr.message?.includes('infinite recursion')) {
                console.error('CRITICAL: Database policy recursion detected. Please run database-scripts/fix_recursion_final.sql in Supabase SQL Editor.');
                // Show a more friendly error to the user, but log the technical fix
                setError('System configuration error: Database policy recursion. Please ask an administrator to run the fix script.');
                setIsLoading(false); // Stop loading spinner if it was running
                redirectingRef.current = false;
                return;
              }
            }
            await router.push('/admin-onboarding');
            redirectingRef.current = false;
            return;
          }

          // If pending approval, go to onboarding
          if (existingUser.status === 'pending_approval') {
            await router.push('/admin-onboarding');
            redirectingRef.current = false;
            return;
          }

          // If active admin/super_admin → dashboard
          const effectiveRole = (existingUser.role || '').toLowerCase();
          if (['admin','super_admin','superadmin'].includes(effectiveRole) && existingUser.status === 'active') {
            const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
            console.log('AdminLogin: Redirecting to', redirectPath, '(database check, returnTo was:', returnTo, ')');
            // Use window.location for more reliable redirect
            window.location.href = redirectPath;
            return;
          }

          // Unknown role/status: default to onboarding
          redirectingRef.current = false; // Reset before redirect
          await router.replace('/admin-onboarding');
        } catch (err) {
          console.error('AdminLogin: Error checking user in database:', err);
          redirectingRef.current = false;
        }
      })();
    };

    handlePostAuthRouting();
    
    // Reset redirecting flag after a delay to allow navigation
    const resetTimer = setTimeout(() => {
      redirectingRef.current = false;
    }, 2000);
    
    return () => {
      clearTimeout(resetTimer);
    };
  }, [user, profile, router, authLoading, isInitialized]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('AdminLogin: Login attempt started');
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordErrors(passwordValidation.errors);
      setError('Password does not meet security requirements');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPasswordErrors([]);
    setSuccess(null);
    // Reset redirect flags to allow redirect after login
    redirectAttemptedRef.current = false;
    redirectingRef.current = false;

    try {
      console.log('AdminLogin: Calling login function...');
      const result = await login(email, password);
      console.log('AdminLogin: Login result:', result);
      
      if (result.success) {
        // Quick email-based check first for immediate redirect
        const emailLower = email.toLowerCase();
        const isSuperAdminEmail = emailLower === 'superadmin@wozamali.co.za';
        const isAdminEmail = emailLower.includes('admin@wozamali') || 
                            emailLower === 'admin@wozamali.com' ||
                            emailLower === 'dumisani@sebenzawaste.co.za';
        
        // If we can determine admin status from email, redirect immediately
        if (isSuperAdminEmail || isAdminEmail) {
          const roleText = isSuperAdminEmail ? 'Super Admin' : 'Admin';
          setSuccess(`${roleText} login successful! Redirecting...`);
          console.log('AdminLogin: Admin login successful (email check), redirecting immediately...');
          
          // Clear redirect flags to allow navigation
          redirectAttemptedRef.current = false;
          redirectingRef.current = false;
          setIsLoading(false);
          
          // Use immediate redirect
          const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
          console.log('AdminLogin: Executing immediate redirect to', redirectPath);
          window.location.href = redirectPath;
          return; // Exit early, don't wait for API
        }
        
        // For other emails, check role via API (but with timeout)
        try {
          // Set a timeout for the API check to prevent hanging
          const profileCheckPromise = (async () => {
            const authHeader = await getAuthHeader();
            const res = await fetch('/api/auth/me', { headers: { ...authHeader } });
            if (res.ok) {
              const data = await res.json();
              return data.profile;
            }
            return null;
          })();
          
          // Race between profile check and timeout (max 3 seconds)
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 3000)
          );
          
          let profile = await Promise.race([profileCheckPromise, timeoutPromise]);
          
          // If profile doesn't exist and we have a session, try to create it
          if (!profile) {
            const supabase = getSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              const authHeader = await getAuthHeader();
              const regRes = await fetch('/api/auth/register-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({
                  id: session.user.id,
                  email: session.user.email,
                  first_name: '',
                  last_name: '',
                  full_name: '',
                  role: 'admin',
                  status: 'pending_approval'
                })
              });
              if (regRes.ok) {
                const regData = await regRes.json();
                profile = regData.user;
              }
            }
          }

          const role = (profile?.role || '').toLowerCase();
          const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';
          
          if (isAdmin) {
            const roleText = role === 'superadmin' || role === 'super_admin' ? 'Super Admin' : 'Admin';
            setSuccess(`${roleText} login successful! Redirecting...`);
            console.log('AdminLogin: Admin login successful (API check), redirecting immediately...');
            
            // Clear redirect flags to allow navigation
            redirectAttemptedRef.current = false;
            redirectingRef.current = false;
            setIsLoading(false);
            
            // Use immediate redirect
            const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
            console.log('AdminLogin: Executing immediate redirect to', redirectPath);
            window.location.href = redirectPath;
          } else if (profile?.status === 'pending_approval') {
            setSuccess('Account created. Redirecting to onboarding...');
            setIsLoading(false);
            window.location.href = '/admin-onboarding';
          } else {
            setError('Access denied. This account does not have administrator privileges.');
            console.error('AdminLogin: User does not have admin role', role);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('AdminLogin: Role check failed', err);
          // On error, still try to redirect if email suggests admin (fallback)
          if (emailLower.includes('admin') || emailLower.includes('wozamali')) {
            console.log('AdminLogin: API check failed, but email suggests admin - redirecting anyway');
            setIsLoading(false);
            const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
            window.location.href = redirectPath;
          } else {
            setError('Login successful but failed to verify role. Please try again.');
            setIsLoading(false);
          }
        }
      } else {
        console.error('AdminLogin: Login failed:', result.error);
        setError(result.error || 'Login failed. Please check your credentials and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('AdminLogin: Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSuperAdminLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    console.log('AdminLogin: Super Admin login attempt started');
    
    // Validate email
    if (!superAdminEmail || !superAdminEmail.includes('@')) {
      setError('Please enter a valid super admin email address');
      return;
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordErrors(passwordValidation.errors);
      setError('Password does not meet security requirements');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPasswordErrors([]);
    setSuccess(null);
    // Reset redirect flags to allow redirect after login
    redirectAttemptedRef.current = false;
    redirectingRef.current = false;

    try {
      console.log('AdminLogin: Calling super admin login...');
      const result = await login(superAdminEmail, password);
      console.log('AdminLogin: Super admin login result:', result);
      
      if (result.success) {
        // Check if password needs to be updated (doesn't meet new requirements)
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          // Password doesn't meet new requirements - show update modal
          console.log('AdminLogin: Password does not meet new requirements, showing update modal');
          setIsLoading(false);
          setShowPasswordUpdate(true);
          return;
        }
        
        setSuccess('Super Admin login successful! Redirecting...');
        console.log('AdminLogin: Super admin login successful, redirecting immediately...');
        
        // Reset loading state
        setIsLoading(false);
        
        // Redirect immediately - don't wait for useEffect or profile
        // The user state is already updated by the login function
        setTimeout(() => {
          console.log('AdminLogin: Executing immediate redirect to /admin');
          router.replace('/admin');
        }, 150);
      } else {
        console.error('AdminLogin: Super admin login failed:', result.error);
        setError(result.error || 'Super Admin login failed. Please check your password and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('AdminLogin: Unexpected super admin login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    console.log('AdminLogin: Demo login attempt started');
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('AdminLogin: Calling demo login...');
      const result = await login('admin@wozamali.com', 'admin123');
      console.log('AdminLogin: Demo login result:', result);
      
      if (result.success) {
        // Demo login is always admin
        setSuccess('Demo login successful! Redirecting...');
        console.log('AdminLogin: Demo admin login successful, redirecting immediately...');
        
        // Reset loading state before redirect
        setIsLoading(false);
        
        // Redirect immediately using router.push
        const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
        console.log('AdminLogin: Executing demo login redirect to', redirectPath, '(returnTo was:', returnTo, ')');
        router.push(redirectPath);
        
        // Safety timeout: if redirect doesn't happen within 2 seconds, ensure loading is off
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      } else {
        console.error('AdminLogin: Demo login failed:', result.error);
        setError(result.error || 'Demo login failed. Please check the demo credentials.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('AdminLogin: Unexpected demo login error:', err);
      setError('An unexpected error occurred during demo login.');
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('AdminLogin: Password reset attempt for:', resetEmail);
    setIsResetting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resetPassword(resetEmail);
      console.log('AdminLogin: Password reset result:', result);
      
      if (result.success) {
        setSuccess('Password reset email sent! Check your inbox and click the link to reset your password.');
        setShowForgotPassword(false);
        setResetEmail('');
      } else {
        setError(result.error || 'Failed to send password reset email. Please try again.');
      }
    } catch (err) {
      console.error('AdminLogin: Password reset error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('AdminLogin: Password update attempt');
    
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setPasswordUpdateErrors(passwordValidation.errors);
      setError('New password does not meet security requirements');
      return;
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsUpdatingPassword(true);
    setError(null);
    setPasswordUpdateErrors([]);
    setSuccess(null);

    try {
      const result = await updatePassword(newPassword);
      console.log('AdminLogin: Password update result:', result);
      
      if (result.success) {
        setSuccess('Password updated successfully! Redirecting...');
        setShowPasswordUpdate(false);
        setNewPassword('');
        setConfirmPassword('');
        
        // Redirect after successful password update
        setTimeout(() => {
          const redirectPath = returnTo === '/dashboard' ? '/admin/dashboard' : returnTo;
          console.log('AdminLogin: Executing redirect after password update to', redirectPath, '(returnTo was:', returnTo, ')');
          router.replace(redirectPath);
        }, 500);
      } else {
        setError(result.error || 'Failed to update password. Please try again.');
      }
    } catch (err) {
      console.error('AdminLogin: Password update error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Show loading state until component is initialized to prevent flickering
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-[800px] h-[800px] bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-full opacity-30 animate-pulse blur-3xl"></div>
          <div className="absolute top-1/2 -right-1/2 w-[600px] h-[600px] bg-gradient-to-bl from-gray-900 via-black to-gray-950 rounded-full opacity-40 animate-pulse blur-3xl" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="flex flex-col items-center justify-center">
            <img 
              src="/w yellow.png" 
              alt="Woza Mali Logo" 
              className="w-20 h-20 animate-pulse"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background with Different Black Shades */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute -top-1/2 -left-1/2 w-[800px] h-[800px] bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-full opacity-30 animate-pulse blur-3xl"></div>
        <div className="absolute top-1/2 -right-1/2 w-[600px] h-[600px] bg-gradient-to-bl from-gray-900 via-black to-gray-950 rounded-full opacity-40 animate-pulse blur-3xl" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute -bottom-1/2 left-1/3 w-[700px] h-[700px] bg-gradient-to-tr from-black via-gray-950 to-gray-900 rounded-full opacity-25 animate-pulse blur-3xl" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
        
        {/* Animated lines */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-0 w-px h-1/2 bg-gradient-to-b from-transparent via-gray-800 to-transparent opacity-30 animate-pulse"></div>
          <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-gray-900 to-transparent opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-0 left-1/3 w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-25 animate-pulse" style={{ animationDelay: '2.5s' }}></div>
        </div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Back Button removed */}

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-zinc-950 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img 
                src="/w yellow.png" 
                alt="Woza Mali Logo" 
                className="w-16 h-16"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Admin Portal
            </CardTitle>
            <p className="text-gray-400">
              Administrator Portal - Authorized Personnel Only
            </p>
            
            {/* Login Type Tabs */}
            <div className="flex bg-yellow-500/20 rounded-lg p-1 mt-4">
              <button
                type="button"
                onClick={() => handleTabChange('admin')}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-yellow-500 text-black shadow-sm'
                    : 'text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/20'
                }`}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('superadmin')}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'superadmin'
                    ? 'bg-yellow-500 text-black shadow-sm'
                    : 'text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/20'
                }`}
              >
                <Crown className="w-4 h-4 mr-2" />
                Super Admin
              </button>
            </div>
            
            {/* Role Badge */}
            <div className="mt-3">
              <Badge 
                variant="outline" 
                className={`border-0 ${
                  activeTab === 'superadmin'
                    ? 'bg-yellow-500/30 text-yellow-400'
                    : 'bg-yellow-500/30 text-yellow-400'
                }`}
              >
                {activeTab === 'superadmin' ? (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Super Administrator
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    Administrator
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Demo info removed */}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {success && (
              <Alert className="border-green-800 bg-green-900/20 text-green-300">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            {activeTab === 'admin' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300 font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="!bg-gray-900 !border-gray-800 !text-white placeholder:!text-gray-500 focus:!border-gray-700 focus:!ring-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        // Clear password errors when user starts typing
                        if (passwordErrors.length > 0) {
                          setPasswordErrors([]);
                          setError(null);
                        }
                      }}
                      placeholder="Enter your password"
                      required
                      className={`!bg-gray-900 !border-gray-800 !text-white placeholder:!text-gray-500 focus:!border-gray-700 focus:!ring-gray-700 pr-10 ${
                        passwordErrors.length > 0 ? '!border-red-500' : ''
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {/* Password Requirements */}
                  {password.length > 0 && (
                    <div className="text-xs text-gray-400 space-y-1">
                      <p className="font-medium">Password must contain:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                          At least one capital letter {/[A-Z]/.test(password) && '✓'}
                        </li>
                      <li className={/[@#$%&]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                        At least one symbol (@, #, $, %, or &) {/[@#$%&]/.test(password) && '✓'}
                      </li>
                        <li className={/[0-9]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                          At least one number {/[0-9]/.test(password) && '✓'}
                        </li>
                        <li className={password.length >= 8 ? 'text-green-400' : 'text-gray-500'}>
                          At least 8 characters {password.length >= 8 && '✓'}
                        </li>
                      </ul>
                    </div>
                  )}
                  {/* Password Errors */}
                  {passwordErrors.length > 0 && (
                    <div className="text-xs text-red-400 space-y-1">
                      {passwordErrors.map((err, idx) => (
                        <p key={idx} className="flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-gray-400 hover:text-gray-300 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-2.5"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In as Admin'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSuperAdminLogin} className="space-y-4">
                {/* Super Admin Info */}
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Crown className="w-5 h-5 text-yellow-400 mr-2" />
                    <h3 className="font-semibold text-yellow-400">Super Admin Access</h3>
                  </div>
                  <p className="text-xs text-yellow-300">
                    Full system access with all administrative privileges
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="superadmin-email" className="text-gray-300 font-medium">
                    Super Admin Email Address
                  </Label>
                  <Input
                    id="superadmin-email"
                    type="email"
                    value={superAdminEmail}
                    onChange={(e) => {
                      setSuperAdminEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter super admin email address"
                    required
                    className="!bg-gray-900 !border-gray-800 !text-white placeholder:!text-gray-500 focus:!border-yellow-600 focus:!ring-yellow-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="superadmin-password" className="text-gray-300 font-medium">
                    Super Admin Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="superadmin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        // Clear password errors when user starts typing
                        if (passwordErrors.length > 0) {
                          setPasswordErrors([]);
                          setError(null);
                        }
                      }}
                      placeholder="Enter super admin password"
                      required
                      className={`!bg-gray-900 !border-gray-800 !text-white placeholder:!text-gray-500 focus:!border-yellow-600 focus:!ring-yellow-600 pr-10 ${
                        passwordErrors.length > 0 ? '!border-red-500' : ''
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {/* Password Requirements */}
                  {password.length > 0 && (
                    <div className="text-xs text-gray-400 space-y-1">
                      <p className="font-medium">Password must contain:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                          At least one capital letter {/[A-Z]/.test(password) && '✓'}
                        </li>
                      <li className={/[@#$%&]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                        At least one symbol (@, #, $, %, or &) {/[@#$%&]/.test(password) && '✓'}
                      </li>
                        <li className={/[0-9]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                          At least one number {/[0-9]/.test(password) && '✓'}
                        </li>
                        <li className={password.length >= 8 ? 'text-green-400' : 'text-gray-500'}>
                          At least 8 characters {password.length >= 8 && '✓'}
                        </li>
                      </ul>
                    </div>
                  )}
                  {/* Password Errors */}
                  {passwordErrors.length > 0 && (
                    <div className="text-xs text-red-400 space-y-1">
                      {passwordErrors.map((err, idx) => (
                        <p key={idx} className="flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-2.5"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Sign In as Super Admin
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Password Reset Form */}
            {showForgotPassword && (
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Reset Password</h3>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-gray-300 font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="!bg-gray-900 !border-gray-800 !text-white placeholder:!text-gray-500 focus:!border-gray-700 focus:!ring-gray-700"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      type="submit"
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-2.5"
                      disabled={isResetting}
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Email'
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail('');
                        setError(null);
                        setSuccess(null);
                      }}
                      className="px-4 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Additional Info */}
            <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-800">
              <p>Need help? Contact your system administrator</p>
            </div>
          </CardContent>
        </Card>

        {/* Password Update Dialog */}
        <Dialog open={showPasswordUpdate} onOpenChange={setShowPasswordUpdate}>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-0 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Lock className="h-5 w-5 text-yellow-400" />
                Update Password Required
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Your password does not meet the new security requirements. Please update it to continue.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handlePasswordUpdate} className="space-y-4 mt-4">
              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {success && (
                <Alert className="border-green-800 bg-green-900/20 text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-300 font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordUpdateErrors.length > 0) {
                        setPasswordUpdateErrors([]);
                        setError(null);
                      }
                    }}
                    placeholder="Enter new password"
                    required
                    className={`!bg-gray-900 !border-gray-800 !text-white placeholder:!text-gray-500 focus:!border-yellow-600 focus:!ring-yellow-600 pr-10 ${
                      passwordUpdateErrors.length > 0 ? '!border-red-500' : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-300"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {/* Password Requirements */}
                {newPassword.length > 0 && (
                  <div className="text-xs text-gray-400 space-y-1">
                    <p className="font-medium">Password must contain:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li className={/[A-Z]/.test(newPassword) ? 'text-green-400' : 'text-gray-500'}>
                        At least one capital letter {/[A-Z]/.test(newPassword) && '✓'}
                      </li>
                      <li className={/[@#$%&]/.test(newPassword) ? 'text-green-400' : 'text-gray-500'}>
                        At least one symbol (@, #, $, %, or &) {/[@#$%&]/.test(newPassword) && '✓'}
                      </li>
                      <li className={/[0-9]/.test(newPassword) ? 'text-green-400' : 'text-gray-500'}>
                        At least one number {/[0-9]/.test(newPassword) && '✓'}
                      </li>
                      <li className={newPassword.length >= 8 ? 'text-green-400' : 'text-gray-500'}>
                        At least 8 characters {newPassword.length >= 8 && '✓'}
                      </li>
                    </ul>
                  </div>
                )}
                {/* Password Errors */}
                {passwordUpdateErrors.length > 0 && (
                  <div className="text-xs text-red-400 space-y-1">
                    {passwordUpdateErrors.map((err, idx) => (
                      <p key={idx} className="flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-gray-300 font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Confirm new password"
                    required
                    className={`!bg-gray-900 !border-gray-800 !text-white placeholder:!text-gray-500 focus:!border-yellow-600 focus:!ring-yellow-600 pr-10 ${
                      confirmPassword && newPassword !== confirmPassword ? '!border-red-500' : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Passwords do not match
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-2.5"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-[800px] h-[800px] bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-full opacity-30 animate-pulse blur-3xl"></div>
          <div className="absolute top-1/2 -right-1/2 w-[600px] h-[600px] bg-gradient-to-bl from-gray-900 via-black to-gray-950 rounded-full opacity-40 animate-pulse blur-3xl" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="flex flex-col items-center justify-center">
            <img 
              src="/w yellow.png" 
              alt="Woza Mali Logo" 
              className="w-20 h-20 animate-pulse"
            />
          </div>
        </div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
