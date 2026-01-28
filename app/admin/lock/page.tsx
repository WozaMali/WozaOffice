"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePwaLock } from "@/hooks/use-pwa-lock";
import { supabase } from "@/lib/supabase";

export default function LockScreen() {
  const router = useRouter();
  const { user, profile, logout, isLoading: authLoading } = useAuth();
  const { needsSetup, isLocked, username, setup, unlock } = usePwaLock(15);
  const [localUsername, setLocalUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [password, setPassword] = useState("");
  
  // Redirect to login if not authenticated (don't show lock screen for logged out users)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/admin-login');
    }
  }, [user, authLoading, router]);
  
  // Keep user on lock screen if they hit back/refresh (only if logged in)
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const handler = (e: PopStateEvent) => {
        e.preventDefault();
        router.replace('/admin/lock');
      };
      window.addEventListener('popstate', handler);
      return () => window.removeEventListener('popstate', handler);
    }
  }, [router, user]);
  // Auto sign out after 60 minutes dormant on lock screen
  useEffect(() => {
    const t = setTimeout(async () => {
      try { await logout(); } finally { router.replace('/admin-login'); }
    }, 60 * 60 * 1000);
    return () => clearTimeout(t);
  }, [logout, router]);

  // Show brief loading while checking auth, then redirect if not logged in
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0b1020 0%, #0d1b3d 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-200">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0b1020 0%, #0d1b3d 100%)' }}>
      <Card className="w-full max-w-sm border-0 shadow-2xl" style={{ backgroundColor: '#0e1530', color: 'white' }}>
        <CardHeader>
          <CardTitle className="text-center">Session Locked</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-blue-100 bg-white/5 rounded-md p-3">
            <div className="font-medium mb-1">Your account</div>
            <div className="space-y-1">
              <div>
                <span className="text-blue-200">User ID:</span>{' '}
                <span className="font-mono break-all">{user?.id}</span>
              </div>
              <div>
                <span className="text-blue-200">Username:</span>{' '}
                {username || '—'}
              </div>
              <div>
                <span className="text-blue-200">Name:</span>{' '}
                {profile?.full_name || '—'}
              </div>
              <div>
                <span className="text-blue-200">Role:</span>{' '}
                {profile?.role || '—'}
              </div>
            </div>
          </div>
          <p className="text-sm text-blue-200 text-center">
            {needsSetup ? "Set your username and 5‑digit PIN to continue" : "Enter your 5‑digit PIN to continue"}
          </p>
          {needsSetup && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-blue-200">Username</label>
                <Input
                  value={localUsername}
                  onChange={(e) => setLocalUsername(e.target.value)}
                  placeholder="e.g. office-admin"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="text-xs text-blue-200">5-digit PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0,5))}
                  placeholder="•••••"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
          {!needsSetup && !forgotMode && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-blue-200">5-digit PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0,5))}
                  placeholder="•••••"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setError(null); setPin(""); setForgotMode(true); }}
                  className="text-xs text-blue-300 hover:text-blue-200 underline"
                >
                  Forgot PIN?
                </button>
              </div>
            </div>
          )}
          {!needsSetup && forgotMode && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-blue-200">Email</label>
                <Input value={profile?.email || user?.email || ''} disabled />
              </div>
              <div>
                <label className="text-xs text-blue-200">New 5-digit PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0,5))}
                  placeholder="•••••"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="text-xs text-blue-200">Account Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your login password"
                  autoComplete="current-password"
                />
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setError(null); setForgotMode(false); setPassword(""); setPin(""); }}
                  className="text-xs text-blue-300 hover:text-blue-200 underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {error && <div className="text-xs text-red-300 text-center">{error}</div>}
          <Button
            className="w-full border-0"
            style={{ background: 'linear-gradient(180deg, #ffd34d 0%, #ffb300 100%)', color: '#3b2e00' }}
            disabled={loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                if (needsSetup) {
                  if (!localUsername || pin.length !== 5) {
                    setError('Enter username and 5-digit PIN');
                  } else {
                    const res = await setup(localUsername, pin);
                    if (!res.success) {
                      setError(res.error || 'Failed to save PIN');
                    } else {
                      setPin("");
                    }
                  }
                } else if (forgotMode) {
                  const email = (profile?.email || user?.email || '').trim();
                  if (!email || !password || pin.length !== 5) {
                    setError('Enter password and new 5-digit PIN');
                  } else {
                    const { error: pwErr } = await supabase.auth.signInWithPassword({ email, password });
                    if (pwErr) {
                      setError(pwErr.message || 'Invalid password');
                    } else {
                      const uname = username || localUsername;
                      if (!uname) {
                        setError('Username missing. Please set a username.');
                      } else {
                        const res = await setup(uname, pin);
                        if (!res.success) setError(res.error || 'Failed to reset PIN');
                        else {
                          setForgotMode(false);
                          setPassword("");
                          setPin("");
                        }
                      }
                    }
                  }
                } else {
                  if (pin.length !== 5) {
                    setError('Enter your 5-digit PIN');
                  } else {
                    const res = await unlock(pin);
                    if (!res.success) {
                      setError(res.error || 'Invalid PIN');
                    } else {
                      // Clear PIN and wait for state to propagate, then redirect
                      setPin('');
                      // Use a small delay to ensure state updates propagate
                      await new Promise(resolve => setTimeout(resolve, 200));
                      router.replace('/admin/dashboard');
                    }
                  }
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            {needsSetup ? (loading ? 'Saving...' : 'Save PIN') : (forgotMode ? (loading ? 'Resetting...' : 'Reset PIN') : (loading ? 'Signing in...' : 'Sign in'))}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            style={{ backgroundColor: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                console.log('🚪 Lock page: Sign out button clicked');
                await logout();
                console.log('✅ Lock page: Logout successful, redirecting...');
              } catch (error) {
                console.error('❌ Lock page: Logout error:', error);
              } finally {
                // Always redirect even if logout fails
                router.replace("/admin-login");
              }
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


