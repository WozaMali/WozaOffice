'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePwaLock } from '@/hooks/use-pwa-lock';
import { 
  BarChart3, 
  Calendar, 
  Package, 
  CreditCard, 
  Gift, 
  TreePine, 
  School, 
  Wallet, 
  Crown, 
  Users, 
  TrendingUp, 
  Settings, 
  UserPlus, 
  Activity,
  LogOut,
  Shield,
  Sparkles,
  Bell,
  Video,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RoleBasedAccess } from '@/lib/role-based-access';
import RealtimeStatusDot from '@/components/RealtimeStatusDot';
import Link from 'next/link';
import AddUserModal from './AddUserModalSimple';
import { logAdminSessionEvent } from '@/lib/admin-session-logging';
import { getSupabaseClient } from '@/lib/supabase';
import { ExportRequestNotificationBell } from '@/components/admin/ExportRequestNotificationBell';
import EmployeeFormModal from '@/components/admin/EmployeeFormModal';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const emailLower = user?.email?.toLowerCase?.() || '';
  const isSuperAdmin = RoleBasedAccess.isSuperAdmin(profile as any) || emailLower === 'superadmin@wozamali.co.za';
  const { lock, lockImmediate, setup, needsSetup, isLocked } = usePwaLock(15);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);
  const [softReason, setSoftReason] = useState('Tea Break');
  const [showEmployeeFormModal, setShowEmployeeFormModal] = useState(false);
  const isPrivileged = isSuperAdmin;
  const employeeFormCheckRef = useRef(false);
  
  // Sidebar collapse state - load from localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Ensure component is mounted to avoid hydration mismatches
  useEffect(() => {
    setMounted(true);
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed, mounted]);

  // Build navigation in requested order (Team Members appears after Users for superadmin only)
  // Use useMemo to ensure stable reference and avoid hydration mismatches
  // Note: Use source paths (e.g., /discover-earn) not destination paths (e.g., /admin/discover-earn)
  // because Next.js rewrites handle the routing automatically
  const baseNavigation = useMemo(() => [
    { name: 'Dashboard', page: 'dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { name: 'Collections', page: 'collections', href: '/admin/collections', icon: Calendar },
    { name: 'Watch AD Earnings', page: 'watch-ads-earnings', href: '/admin/watch-ads-earnings', icon: Video },
    { name: 'Pickups', page: 'pickups', href: '/admin/pickups', icon: Package },
    { name: 'Withdrawals', page: 'withdrawals', href: '/admin/withdrawals', icon: CreditCard },
    { name: 'Rewards', page: 'rewards', href: '/admin/rewards', icon: Gift },
    { name: 'Discover & Earn', page: 'discover-earn', href: '/admin/discover-earn', icon: Sparkles },
    { name: 'Green Scholar Fund', page: 'green-scholar', href: '/admin/green-scholar', icon: TreePine },
    { name: 'Beneficiaries', page: 'beneficiaries', href: '/admin/beneficiaries', icon: School },
    { name: 'Transactions', page: 'transactions', href: '/admin/transactions', icon: Wallet },
    { name: 'Resident Summary', page: 'tiers', href: '/admin/tiers', icon: Crown },
    { name: 'Users', page: 'users', href: '/admin/users', icon: Users },
    { name: 'Analytics', page: 'analytics', href: '/admin/analytics', icon: TrendingUp },
    { name: 'Export Notifications', page: 'export-notifications', href: '/admin/export-notifications', icon: Bell },
    { name: 'Settings', page: 'settings', href: '/admin/settings', icon: Settings },
    { name: 'Config', page: 'config', href: '/admin/config', icon: Settings },
  ], []);

  const navigation = useMemo(() => {
    const items = [...baseNavigation];
    // Only add superadmin items on client to avoid hydration mismatch
    if (mounted && isSuperAdmin) {
      const usersIndex = items.findIndex(i => i.page === 'users');
      const insertIndex = usersIndex >= 0 ? usersIndex + 1 : items.length;
      items.splice(insertIndex, 0, { name: 'Team Members', page: 'team-members', href: '/admin/team-members', icon: UserPlus });
      // Add Admin Activity page for superadmins
      items.splice(insertIndex + 1, 0, { name: 'Admin Activity', page: 'admin-activity', href: '/admin/admin-activity', icon: Activity });
    }
    return items;
  }, [baseNavigation, mounted, isSuperAdmin]);

  // Check authentication and redirect if needed (only after auth check is complete)
  useEffect(() => {
    // Don't redirect while auth is still loading - wait for auth check to complete
    if (isLoading) {
      return;
    }
    
    // Only redirect if auth check is complete and user is not authenticated
    if (!user) {
      // Preserve the current path so we can redirect back after login
      let returnPath = pathname;
      // If returnPath is /dashboard, correct it to /admin/dashboard
      if (returnPath === '/dashboard') {
        returnPath = '/admin/dashboard';
      }
      if (returnPath && returnPath !== '/admin-login' && returnPath !== '/admin/lock') {
        console.log('AdminLayout: Redirecting to /admin-login with returnTo:', returnPath);
        router.push(`/admin-login?returnTo=${encodeURIComponent(returnPath)}`);
      } else {
        router.push('/admin-login');
      }
    }
  }, [user, isLoading, router, pathname]);

  // Check if user needs to set up session lock credentials
  useEffect(() => {
    if (!user) return;
    
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath === '/admin/lock' || currentPath === '/auth/change-password' || currentPath === '/admin/employee-form') {
      return;
    }
    
    if (isLocked) {
      router.replace('/admin/lock');
    }
  }, [user, isLocked, router]);

  // Check if employee form is completed (only for admin users) - runs on login and page load
  useEffect(() => {
    if (!user || isLoading || !mounted) return;
    
    // Don't check if already on employee form, change password, or lock pages
    if (pathname === '/admin/employee-form' || pathname === '/auth/change-password' || pathname === '/admin/lock') {
      return;
    }

    // Check if user needs to complete employee form
    const checkEmployeeForm = async () => {
      try {
        // First check if profile already has the completion status (faster check)
        const profileRole = (profile as any)?.role?.toLowerCase() || '';
        const profileFormCompleted = (profile as any)?.employee_form_completed;
        
        // If profile shows form is completed, skip database query
        if (profileFormCompleted === true) {
          return;
        }

        // Check email for admin users (quick check before database query)
        const email = user.email?.toLowerCase() || '';
        const isSuperAdminEmail = email === 'superadmin@wozamali.co.za' || email.includes('superadmin');
        const isAdminEmail = email.includes('admin@wozamali') || email === 'admin@wozamali.com' || email.includes('@wozamali');
        
        // Only check database for admin/super_admin/admin_manager users
        const isAdminRole = ['admin', 'super_admin', 'superadmin', 'admin_manager', 'adminmanager'].includes(profileRole);
        
        if (!isSuperAdminEmail && !isAdminEmail && !isAdminRole) {
          return; // Not an admin user, no need to check
        }

        const supabase = getSupabaseClient();
        const { data: userData, error } = await supabase
          .from('users')
          .select('employee_form_completed, role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking employee form:', error);
          return;
        }

        // Show modal if form is NOT completed
        const role = (userData?.role || '').toLowerCase();
        const needsForm = ['admin', 'super_admin', 'superadmin', 'admin_manager', 'adminmanager', 'staff'].includes(role);
        
        if (needsForm && userData?.employee_form_completed !== true) {
          // Small delay to ensure UI is ready
          setTimeout(() => {
            setShowEmployeeFormModal(true);
          }, 500);
        }
      } catch (err) {
        console.error('Error checking employee form completion:', err);
      }
    };

    // Run check after a short delay to ensure everything is loaded
    const timer = setTimeout(() => {
      checkEmployeeForm();
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, isLoading, mounted, pathname, profile]);

  // Get current page from pathname (only on client to avoid hydration mismatch)
  const getCurrentPage = () => {
    if (!mounted || !pathname) return 'dashboard';
    // Handle both /admin/ and root paths
    let path = pathname;
    // Remove /admin/ prefix if present
    if (path.startsWith('/admin/')) {
      path = path.replace('/admin/', '');
    }
    // Remove leading slash
    path = path.replace(/^\//, '');
    // Return dashboard for root or empty
    if (!path || path === '') return 'dashboard';
    return path;
  };

  const currentPage = getCurrentPage();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-black border-r border-gray-800 min-h-screen ${sidebarCollapsed ? 'p-2' : 'p-4'} shadow-2xl transition-all duration-300 ease-in-out relative`}>
        {/* Logo and Collapse Button */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} mb-8 ${sidebarCollapsed ? 'px-0' : 'px-2'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center">
                <img 
                  src="/w yellow.png" 
                  alt="Woza Mali Logo" 
                  className="w-12 h-12"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Admin Portal</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center">
              <img 
                src="/w yellow.png" 
                alt="Woza Mali Logo" 
                className="w-12 h-12"
              />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors ${sidebarCollapsed ? 'w-full' : ''}`}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5 mx-auto" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            // Only check active state on client to avoid hydration mismatch
            const isActive = mounted && (currentPage === item.page || pathname === item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700 hover:shadow-md'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-gray-700">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="mt-8 pt-4 border-t border-gray-800">
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                console.log('🚪 Sign out button clicked');
                await logout();
                console.log('✅ Logout successful, redirecting...');
                window.location.href = '/admin-login';
              } catch (error) {
                console.error('❌ Logout error:', error);
                window.location.href = '/admin-login';
              }
            }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl text-sm font-semibold text-red-200 hover:text-white hover:bg-red-700 transition-all duration-300 group relative`}
            title={sidebarCollapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign out</span>}
            {sidebarCollapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-gray-700">
                Sign out
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Welcome, {(() => {
                      // Priority: full_name > (first_name + last_name) > email username > 'Admin'
                      if (profile?.full_name && profile.full_name.trim() && profile.full_name !== 'undefined' && profile.full_name.toLowerCase() !== 'superadmin' && profile.full_name.toLowerCase() !== 'admin') {
                        return profile.full_name;
                      }
                      const firstName = (profile as any)?.first_name;
                      const lastName = (profile as any)?.last_name;
                      if (firstName && lastName && firstName !== 'undefined' && lastName !== 'undefined' && firstName.trim() && lastName.trim()) {
                        const fullName = `${firstName} ${lastName}`.trim();
                        if (fullName.toLowerCase() !== 'superadmin' && fullName.toLowerCase() !== 'admin') {
                          return fullName;
                        }
                      }
                      const emailName = user?.email?.split('@')[0];
                      if (emailName && emailName !== 'undefined' && emailName.toLowerCase() !== 'superadmin' && emailName.toLowerCase() !== 'admin') {
                        return emailName;
                      }
                      return 'Admin';
                    })()}!
                  </h3>
                  <p className="text-sm text-gray-600">Manage your system efficiently</p>
                </div>
                <RealtimeStatusDot className="scale-125" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExportRequestNotificationBell />
              {isSuperAdmin && (
                <Button
                  onClick={() => router.push('/admin-activity')}
                  className="bg-gradient-to-r from-gray-800 to-gray-700 text-white hover:from-gray-700 hover:to-gray-600 border-0 shadow-md"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Admin Activity
                </Button>
              )}
              {isPrivileged && (
                <Button
                  onClick={() => setSoftOpen(true)}
                  className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:from-yellow-700 hover:to-yellow-800 border-0 shadow-md"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Lock Session
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Page Content - Only show if session lock is set up */}
        {!needsSetup && (
          <div className="bg-gray-50 min-h-screen">
            {children}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={() => {
          // Refresh can be handled by individual pages
        }}
      />

      {/* Soft Sign Out Dialog */}
      <Dialog open={softOpen} onOpenChange={setSoftOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl bg-white/90 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900">Soft Sign Out</DialogTitle>
            <DialogDescription className="text-gray-600">Select a reason and confirm soft sign out.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
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
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setSoftOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="relative overflow-hidden bg-gradient-to-b from-yellow-400 to-yellow-500 text-yellow-950 border-0 shadow-[0_6px_0_#b45309] hover:shadow-[0_4px_0_#b45309] active:shadow-[0_0_0_#b45309] active:translate-y-1 transition-all duration-150 px-4 py-2 rounded-md"
                onClick={async () => {
                  try {
                    await logAdminSessionEvent(user?.id, 'soft_logout', softReason);
                    setSoftOpen(false);
                    // Lock the session immediately
                    lockImmediate();
                    // Also set force lock flag to ensure it persists
                    try {
                      localStorage.setItem('pwaLock.forceLockNext', '1');
                      sessionStorage.removeItem('pwaLock.unlockedSession');
                    } catch {}
                    // Wait a moment for state to propagate, then redirect
                    await new Promise(resolve => setTimeout(resolve, 100));
                    router.push('/lock');
                  } catch {}
                }}
              >
                <span className="relative z-10 font-semibold">Submit</span>
                <span className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,white,transparent_40%)]" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PWA Lock System - Setup only (unlock handled on /lock) */}
      {(!isLocked && needsSetup) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Setup Session Lock
              </h2>
              <p className="text-sm text-gray-600">
                Set up your username and PIN to secure your session
              </p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get('username') as string;
              const pin = formData.get('pin') as string;
              const result = await setup(username, pin);
              if (result.success) {
                lockImmediate();
                e.currentTarget.reset();
              } else {
                alert(result.error);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    name="username"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN (5 digits)</label>
                  <input
                    name="pin"
                    type="password"
                    required
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="\d{5}"
                    placeholder="Enter 5-digit PIN"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
                >
                  Setup Session Lock
                </button>
              </div>
            </form>
            {needsSetup && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Required:</strong> You must set up session lock credentials before using the system.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee Form Modal - Shows on first login */}
      {showEmployeeFormModal && (
        <EmployeeFormModal
          isOpen={showEmployeeFormModal}
          onClose={() => {
            // Don't allow closing on first login - form must be completed
            if ((profile as any)?.employee_form_completed !== true) {
              return;
            }
            setShowEmployeeFormModal(false);
          }}
          onSuccess={() => {
            setShowEmployeeFormModal(false);
            employeeFormCheckRef.current = false;
            // Refresh profile to get updated employee_form_completed status
            window.location.reload();
          }}
          isFirstLogin={true}
        />
      )}
    </div>
  );
}

