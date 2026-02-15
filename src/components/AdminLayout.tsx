"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  Recycle, 
  TreePine, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home,
  User,
  Package,
  CreditCard,
  Award,
  Cog
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePwaLock } from '@/hooks/use-pwa-lock';
import { LogoutUtils } from '@/lib/logout-utils';
import { supabase } from '@/lib/supabase';
import { logAdminSessionEvent } from '@/lib/admin-session-logging';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { getActiveLoginPopupAd, type LoginPopupAd } from '@/lib/app-settings';
import { keepAliveManager } from '@/lib/keepalive-manager';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

// Base navigation items - Team Members will be conditionally added
const baseNavigationItems = [
  { name: 'Dashboard', href: '/admin', icon: Home, current: true },
  { name: 'Users', href: '/admin/users', icon: Users, current: false },
  { name: 'Collections', href: '/admin/collections', icon: Recycle, current: false },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, current: false },
  { name: 'Resident Summary', href: '/admin/resident-summary', icon: Users, current: false },
  { name: 'Fund Management', href: '/admin/fund', icon: TreePine, current: false },
  { name: 'Rewards', href: '/admin/rewards', icon: Award, current: false },
  { name: 'Withdrawals', href: '/admin/withdrawals', icon: CreditCard, current: false },
  { name: 'Activity', href: '/admin/activity', icon: BarChart3, current: false, superadminOnly: true },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: false },
  { name: 'Configuration', href: '/admin/config', icon: Cog, current: false },
];

// Team Members item - only for superadmin
const teamMembersItem = { name: 'Team Members', href: '/admin/team-members', icon: Users, current: false, superadminOnly: true };

export default function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [softSignOutOpen, setSoftSignOutOpen] = useState(false);
  const [softReason, setSoftReason] = useState<string>('Tea Break');
  const { user, profile, logout } = useAuth();
  const { lock, lockImmediate, isLocked, needsSetup } = usePwaLock(15);

  // Filter navigation items based on user role
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'super_admin';
  
  // Debug logging for role checking
  console.log('🔍 AdminLayout Role Check:', {
    userEmail: user?.email,
    userRole: profile?.role,
    isSuperAdmin: isSuperAdmin,
    profile: profile
  });
  
  // Build navigation items dynamically based on user role
  const filteredNavigationItems = React.useMemo(() => {
    let items = [...baseNavigationItems];
    
    // Only add Team Members for superadmin users
    if (isSuperAdmin) {
      console.log('✅ Adding Team Members - user is superadmin');
      items.splice(1, 0, teamMembersItem); // Insert after Dashboard
    } else {
      console.log('🚫 NOT adding Team Members - user is not superadmin:', profile?.role);
    }

    // Filter items that are superadmin-only
    items = items.filter((it: any) => !it.superadminOnly || isSuperAdmin);
    
    return items;
  }, [isSuperAdmin, profile?.role]);
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin or super admin
    if (profile && !['ADMIN', 'admin', 'super_admin', 'SUPER_ADMIN'].includes(profile.role)) {
      router.push('/?error=unauthorized');
    }
  }, [profile, router]);

  useEffect(() => {
    // If session needs setup or is locked, force lock screen without reloading
    try {
      const force = localStorage.getItem('pwaLock.forceLockNext');
      if (force) {
        localStorage.removeItem('pwaLock.forceLockNext');
        lockImmediate();
      }
    } catch {}
  }, [lockImmediate]);

  useEffect(() => {
    // Only redirect to lock screen if user is logged in AND session is actually locked
    // Don't redirect on needsSetup - let user access dashboard first, they can set up PIN later
    if (user && isLocked) {
      router.replace('/admin/lock');
    } else if (!user && isLocked) {
      // If not logged in but lock state exists, clear it and go to login
      router.replace('/admin-login');
    }
  }, [user, isLocked, router]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      console.log('🚪 AdminLayout: Starting comprehensive logout process...');
      await logout();
      console.log('✅ AdminLayout: Logout successful, performing final cleanup');
      
      // Perform additional cleanup using logout utils
      await LogoutUtils.performCompleteLogout(supabase);
      
      // Force redirect to home page with cache busting
      LogoutUtils.forceRedirectToHome();
    } catch (error) {
      console.error('❌ AdminLayout: Logout error:', error);
      // Force redirect even if logout fails
      LogoutUtils.forceRedirectToHome();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoftSignOut = async () => {
    try {
      setSoftSignOutOpen(false);
      await logAdminSessionEvent(user?.id, 'soft_logout', softReason);
      // Force lock immediately and navigate to dedicated lock screen
      lockImmediate();
      try { localStorage.setItem('pwaLock.forceLockNext', '1'); } catch {}
      router.push('/admin/lock');
    } catch (e) {
      console.error('Soft sign-out failed', e);
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!['ADMIN', 'admin', 'super_admin', 'SUPER_ADMIN'].includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin area.</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // Prevent dashboard paint while locked to avoid flash
  // Don't block on needsSetup - user can access dashboard and set up PIN later
  if (isLocked) {
    return null;
  }

  // Login Ad modal
  const [loginAd, setLoginAd] = useState<LoginPopupAd | null>(null)
  const [showLoginAd, setShowLoginAd] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const run = async () => {
      try {
        const ad = await getActiveLoginPopupAd()
        if (!ad || !ad.enabled || !ad.imageUrl) return
        // Show once per session per ad update
        const seenKey = `login_ad_seen_${(ad.id || ad.updatedAt || ad.imageUrl).replace(/[^a-z0-9]/gi, '')}`
        const seen = sessionStorage.getItem(seenKey)
        if (!seen) {
          setLoginAd(ad)
          setImageLoadError(false) // Reset error state for new ad
          setShowLoginAd(true)
          sessionStorage.setItem(seenKey, '1')
          
          // Fallback: If image doesn't load within 3 seconds, assume it's blocked
          // This handles cases where onError might not fire due to ad blockers
          if (ad.imageUrl) {
            timeoutId = setTimeout(() => {
              // Check if image is still not loaded (no natural width/height)
              const img = document.querySelector(`img[src="${ad.imageUrl}"]`) as HTMLImageElement;
              if (img && (!img.naturalWidth || !img.naturalHeight)) {
                console.warn('Login ad image may be blocked by ad blocker (timeout)');
                setImageLoadError(true);
              }
            }, 3000);
          }
        }
      } catch {
        // ignore
      }
    }
    
    run()
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [])

  // Initialize keepalive manager and global refresh signals
  useEffect(() => {
    // Ensure keepalive manager is running
    if (!keepAliveManager.getActive()) {
      keepAliveManager.start()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        window.dispatchEvent(new Event('app:refresh'))
      }
    }
    const onOnline = () => {
      window.dispatchEvent(new Event('app:refresh'))
      // Reconnect when coming back online
      keepAliveManager.start()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center">
              <img src="/w yellow.png" alt="Logo" className="h-8 w-8 mr-2" />
              <span className="text-lg font-semibold text-gray-900">Admin Panel</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigationItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className={`w-full justify-start ${
                  currentPage === item.href ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleNavigation(item.href)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <div className="flex items-center">
              <img src="/w yellow.png" alt="Logo" className="h-8 w-8 mr-2" />
              <span className="text-lg font-semibold text-gray-900">Admin Panel</span>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigationItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className={`w-full justify-start ${
                  currentPage === item.href ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleNavigation(item.href)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center gap-x-2">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{profile.full_name}</span>
                  <span className="text-gray-500 ml-2">({profile.email})</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSoftSignOutOpen(true)}
                  className="relative overflow-hidden bg-gradient-to-b from-yellow-400 to-yellow-500 text-yellow-950 border-0 shadow-[0_6px_0_#b45309] hover:shadow-[0_4px_0_#b45309] active:shadow-[0_0_0_#b45309] active:translate-y-1 transition-all duration-150 px-4 py-2 rounded-md"
                >
                  <span className="relative z-10 font-semibold">Lock Session</span>
                  <span className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,white,transparent_40%)]" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  {isLoading ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <Dialog open={softSignOutOpen} onOpenChange={setSoftSignOutOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl bg-white/90 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900">Soft Sign Out</DialogTitle>
              <DialogDescription className="text-gray-600">Select a reason and confirm soft sign out.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-800">Select Reason</label>
              <select
                value={softReason}
                onChange={(e) => setSoftReason(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-800 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
              >
                <option>Tea Break</option>
                <option>Lunch</option>
                <option>Bathroom</option>
                <option>Meeting</option>
                <option>Site Visit</option>
                <option>Network Issue</option>
                <option>End of Shift</option>
                <option>Other</option>
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50" onClick={() => setSoftSignOutOpen(false)}>Cancel</Button>
                <Button className="relative overflow-hidden bg-gradient-to-b from-yellow-400 to-yellow-500 text-yellow-950 border-0 shadow-[0_6px_0_#b45309] hover:shadow-[0_4px_0_#b45309] active:shadow-[0_0_0_#b45309] active:translate-y-1 transition-all duration-150 px-4 py-2 rounded-md" onClick={handleSoftSignOut}>
                  <span className="relative z-10 font-semibold">Submit</span>
                  <span className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,white,transparent_40%)]" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Login Pop-up Ad */}
        <Dialog open={showLoginAd} onOpenChange={setShowLoginAd}>
          <DialogContent className="sm:max-w-lg rounded-2xl border-0 shadow-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900">
                {loginAd?.title || 'Announcement'}
              </DialogTitle>
              <DialogDescription className="text-gray-600">Welcome back!</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {loginAd?.description && (
                <p className="text-sm text-gray-600">{loginAd.description}</p>
              )}
              {loginAd?.imageUrl && !imageLoadError && (
                <div 
                  onClick={() => {
                    if (loginAd?.ctaUrl) {
                      window.open(loginAd.ctaUrl, '_blank', 'noopener,noreferrer');
                      setShowLoginAd(false);
                    }
                  }}
                  className={loginAd?.ctaUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
                >
                  <img
                    src={loginAd.imageUrl}
                    alt="Login Ad"
                    className="w-full h-auto rounded-lg object-contain"
                    style={{
                      ...(loginAd.width ? { width: `${loginAd.width}px`, maxWidth: '100%' } : {}),
                      ...(loginAd.height ? { height: `${loginAd.height}px` } : {})
                    }}
                    onError={(e) => {
                      // Handle image load errors (e.g., blocked by ad blocker)
                      console.warn('Login ad image failed to load (may be blocked by ad blocker):', loginAd.imageUrl);
                      setImageLoadError(true);
                      // Prevent infinite retry loop
                      e.currentTarget.onerror = null;
                    }}
                  />
                </div>
              )}
              {loginAd?.imageUrl && imageLoadError && (
                <div className="p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
                  <p>Image unavailable (may be blocked by browser extension)</p>
                  {loginAd?.description && (
                    <p className="mt-2">{loginAd.description}</p>
                  )}
                </div>
              )}
              {loginAd?.ctaUrl && (
                <div className="flex justify-end">
                  <a
                    href={loginAd.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setShowLoginAd(false)}
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
