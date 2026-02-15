'use client';

import { useEffect, useState, useRef, useCallback, useMemo, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePwaLock } from '@/hooks/use-pwa-lock';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Activity,
  Package,
  Users,
  BarChart3,
  Plus,
  Camera,
  MapPin,
  Clock,
  Wallet,
  Gift,
  TrendingUp,
  Building2,
  Shield,
  CreditCard,
  Calendar,
  Download,
  ChevronDown,
  Settings,
  LogOut,
  UserPlus,
  TreePine,
  School,
  Home,
  Crown,
  Check,
  X,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Copy } from 'lucide-react';
import UsersPage from '@/components/admin/UsersPage';
import PickupsPage from '@/components/admin/PickupsPage';
import AnalyticsPage from '@/components/admin/AnalyticsPage';
import PaymentsPage from '@/components/admin/PaymentsPage';
import RewardsPage from '@/components/admin/RewardsPage';
import ResidentSummaryPage from '@/components/admin/ResidentSummaryPage';
import AdminGreenScholarFund from '@/components/admin/AdminGreenScholarFund';
import AddUserModal from './AddUserModalSimple';
import BeneficiariesPage from './beneficiaries/page';
import { NotificationToast } from '@/components/NotificationToast';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationManager } from '@/lib/notificationManager';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ResetTransactionsDialog } from '@/components/ResetTransactionsDialog';
import RealtimeStatusDot from '@/components/RealtimeStatusDot';
import TransactionsPage from '@/components/TransactionsPage';
import dynamic from 'next/dynamic';
const AdminSettingsPage = dynamic(() => import('./settings/page'), { ssr: false });
const TeamMembersPage = dynamic(() => import('./team-members/page'), { ssr: false });
import { RoleBasedAccess } from '../../src/lib/role-based-access';
import {
  getPickups, 
  getPayments, 
  getUsers, 
  subscribeToAllChanges,
  testSupabaseConnection,
  getWalletData,
  deleteCollectionDeep,
  RecentActivity
} from '../../src/lib/admin-services';
import { softDeleteCollection } from '../../src/lib/soft-delete-service';
import { supabase } from '../../src/lib/supabase';
import { realtimeManager } from '../../src/lib/realtimeManager';
import { keepAliveManager } from '../../src/lib/keepalive-manager';
import { UnifiedAdminService, useDashboardData, useAllUsers, useCollections, useTownships, useSubdivisions } from '../../src/lib/unified-admin-service';
import { clearPickupsCache } from '../../src/lib/admin-services';
import type { User, TownshipDropdown, SubdivisionDropdown } from '../../src/lib/supabase';
import { useBackgroundRefresh } from '../../src/hooks/useBackgroundRefresh';
import { useConnectivity } from '../../src/hooks/useConnectivity';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { realtimeDataService } from '../../src/lib/realtimeDataService';
import type { CollectionData } from '../../src/lib/unified-admin-service';
import { logAdminSessionEvent } from '../../src/lib/admin-session-logging';

// Sidebar Navigation Component
function AdminSidebar({ currentPage, onPageChange }: { 
  currentPage: string; 
  onPageChange: (page: string) => void;
}) {
  const { user, profile, logout } = useAuth();
  const emailLower = user?.email?.toLowerCase?.() || '';
  const isSuperAdmin = RoleBasedAccess.isSuperAdmin(profile as any) || emailLower === 'superadmin@wozamali.co.za';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Build navigation in requested order (Team Members appears after Users for superadmin only)
  const baseNavigation = [
    { name: 'Dashboard', page: 'dashboard', icon: BarChart3 },
    { name: 'Collections', page: 'collections', icon: Calendar },
    { name: 'Pickups', page: 'pickups', icon: Package },
    { name: 'Withdrawals', page: 'withdrawals', icon: CreditCard },
    { name: 'Rewards', page: 'rewards', icon: Gift },
    { name: 'Green Scholar Fund', page: 'green-scholar', icon: TreePine },
    { name: 'Beneficiaries', page: 'beneficiaries', icon: School },
    { name: 'Transactions', page: 'transactions', icon: Wallet },
    { name: 'Resident Summary', page: 'tiers', icon: Crown },
    { name: 'Users', page: 'users', icon: Users },
    { name: 'Analytics', page: 'analytics', icon: TrendingUp },
    { name: 'Settings', page: 'settings', icon: Settings },
    { name: 'Config', page: 'config', icon: Settings },
  ];

  const navigation = (() => {
    const items = [...baseNavigation];
    if (isSuperAdmin) {
      const usersIndex = items.findIndex(i => i.page === 'users');
      const insertIndex = usersIndex >= 0 ? usersIndex + 1 : items.length;
      items.splice(insertIndex, 0, { name: 'Team Members', page: 'team-members', icon: UserPlus });
      // Add Admin Activity page for superadmins
      items.splice(insertIndex + 1, 0, { name: 'Admin Activity', page: 'admin-activity', icon: Activity });
    }
    return items;
  })();

  return (
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
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.name}
              onClick={() => onPageChange(item.page)}
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
            </button>
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
              // Use router.push for proper navigation
              window.location.href = '/admin-login';
            } catch (error) {
              console.error('❌ Logout error:', error);
              // Force redirect even if logout fails
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
  );
}

// Main Dashboard Content
function DashboardContent({ onPageChange, onAddUser, isSuperAdmin, softOpen, setSoftOpen, softReason, setSoftReason, onRefreshRequest }: { 
  onPageChange: (page: string) => void;
  onAddUser: () => void;
  isSuperAdmin?: boolean;
  softOpen: boolean;
  setSoftOpen: (open: boolean) => void;
  softReason: string;
  setSoftReason: (reason: string) => void;
  onRefreshRequest?: () => void;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // Internal data state (can update frequently)
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalPickups: 0,
    totalWeight: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingPickups: 0,
    totalPayments: 0,
    pendingPayments: 0,
            totalWallets: 0,
        totalCashBalance: 0,
        totalWalletWeight: 0,
        totalWalletCollections: 0,
        totalCurrentPoints: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalLifetimeEarnings: 0,
        walletPermissionError: false,
        walletErrorMessage: ''
  });
  
  // Display state (only updates when stable, prevents flickering)
  const [displayData, setDisplayData] = useState(() => ({
    totalUsers: 0,
    totalPickups: 0,
    totalWeight: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingPickups: 0,
    totalPayments: 0,
    pendingPayments: 0,
    totalWallets: 0,
    totalCashBalance: 0,
    totalWalletWeight: 0,
    totalWalletCollections: 0,
    totalCurrentPoints: 0,
    totalPointsEarned: 0,
    totalPointsSpent: 0,
    totalLifetimeEarnings: 0,
    walletPermissionError: false,
    walletErrorMessage: ''
  }));
  const displayUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDisplayUpdateRef = useRef<number>(0);
  const MIN_DISPLAY_UPDATE_INTERVAL = 500; // Minimum 500ms between display updates
  
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Unified schema hooks
  const { data: unifiedDashboardData, loading: unifiedLoading, error: unifiedError } = useDashboardData();
  const { users: unifiedUsers, loading: usersLoading, error: usersError } = useAllUsers();
  const { collections: unifiedCollections, loading: collectionsLoading, error: collectionsError } = useCollections();

  // Background refresh DISABLED - only refresh on Dashboard button click
  // Pass undefined callback to disable automatic refresh
  const { forceRefresh, isRefreshing } = useBackgroundRefresh(user?.id, undefined);
  const { isOnline } = useConnectivity();
  
  // Track previous page to detect Dashboard button clicks
  const prevPageRef = useRef<string>('dashboard');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Simple throttle to prevent excessive refreshes (only for realtime updates)
  const lastRefreshRef = useRef<number>(0);
  const REFRESH_THROTTLE_MS = 3000; // 3 seconds minimum between refreshes
  
  // Update internal data state (can update frequently)
  const updateDashboardData = useCallback((updates: Partial<typeof dashboardData>) => {
    setDashboardData(prev => {
      // Check if values actually changed
      let hasChanges = false;
      for (const key in updates) {
        const prevValue = prev[key as keyof typeof prev];
        const newValue = updates[key as keyof typeof updates];
        if (prevValue !== newValue) {
          hasChanges = true;
          break;
        }
      }
      
      if (!hasChanges) {
        return prev;
      }
      
      const newData = { ...prev, ...updates };
      
      // Update display state with debouncing to prevent flickering
      const now = Date.now();
      const timeSinceLastUpdate = now - lastDisplayUpdateRef.current;
      
      // Clear any pending display update
      if (displayUpdateTimeoutRef.current) {
        clearTimeout(displayUpdateTimeoutRef.current);
      }
      
      // If enough time has passed, update immediately
      if (timeSinceLastUpdate >= MIN_DISPLAY_UPDATE_INTERVAL) {
        lastDisplayUpdateRef.current = now;
        startTransition(() => {
          setDisplayData(newData);
        });
      } else {
        // Otherwise, debounce the display update
        displayUpdateTimeoutRef.current = setTimeout(() => {
          lastDisplayUpdateRef.current = Date.now();
          startTransition(() => {
            setDisplayData(newData);
          });
        }, MIN_DISPLAY_UPDATE_INTERVAL - timeSinceLastUpdate);
      }
      
      return newData;
    });
  }, []);
  
  const loadDashboardData = async (force = false) => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    
    // Throttle only realtime-triggered refreshes, not initial loads or forced refreshes
    if (!force && timeSinceLastRefresh < REFRESH_THROTTLE_MS && lastRefreshRef.current > 0) {
      console.log('⏸️ Throttling dashboard refresh (too soon after last refresh)');
      return;
    }
    
    lastRefreshRef.current = now;
    
    try {
      console.log('🔄 Loading dashboard data...', { force });
      // Don't set loading to true - let UI show immediately
      
      // Load all data in parallel for maximum speed
      const [pickupsResult, collectionsResult, paymentsResult] = await Promise.allSettled([
        getPickups().catch(() => []),
        Promise.race([
          supabase.from('unified_collections').select('status, total_weight_kg, computed_value'),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]).then(result => {
          if (result.error) throw result.error;
          return result.data || [];
        }).catch(() => 
          supabase.from('unified_collections').select('status, total_weight_kg, total_value')
            .then(result => {
              if (result.error) throw result.error;
              return (result.data || []).map((row: any) => ({
                status: row.status,
                total_weight_kg: row.total_weight_kg,
                computed_value: row.total_value ?? 0,
              }));
            })
        ).catch(() => []),
        (async () => {
          try {
            let result = await supabase.from('payments').select('amount, status');
            if (result.error && result.error.code === 'PGRST205') {
              result = await supabase.from('cash_payments').select('amount, status');
            }
            if (result.error) return [];
            return result.data || [];
          } catch {
            return [];
          }
        })()
      ]);

      const pickups = pickupsResult.status === 'fulfilled' ? pickupsResult.value : [];
      const collections = collectionsResult.status === 'fulfilled' ? collectionsResult.value : [];
      const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];

      // Calculate metrics
      const totalPickups = pickups.length;
      const pendingPickups = pickups.filter((p: any) => p.status === 'pending' || p.status === 'submitted').length;
      const totalPayments = payments.length;
      const pendingPayments = payments.filter((p: any) => p.status === 'pending').length;
      const totalRevenue = payments
        .filter((p: any) => p.status === 'completed')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      // Calculate total weight from collections
      const totalWeight = collections.reduce((sum: number, c: any) => {
        return sum + (parseFloat(c.total_weight_kg) || 0);
      }, 0);

      // Use startTransition for smooth, non-blocking updates
      startTransition(() => {
        updateDashboardData({
          totalPickups,
          pendingPickups,
          totalPayments,
          pendingPayments,
          totalRevenue,
          totalWeight
        });
      });
      
      console.log('✅ Dashboard data loaded:', {
        totalPickups,
        pendingPickups,
        totalPayments,
        pendingPayments,
        totalRevenue,
        totalWeight
      });
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
    }
    // Don't set loading to false here - UI is already showing
  };

  // Show UI immediately, load data in background
  useEffect(() => {
    // Set loading to false immediately to show UI
    setLoading(false);
    
    // Always try to load data directly first (ensures data shows up)
    // Unified data can load in parallel but shouldn't block initial load
    console.log('🔄 Initial data load triggered');
    
    // Load data with error handling and ensure it completes
    (async () => {
      try {
        await loadDashboardData(true);
        console.log('✅ Dashboard data loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load dashboard data:', err);
      }
      
      try {
        await loadRecentActivity();
        console.log('✅ Recent activity loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load recent activity:', err);
      }
    })();
  }, []); // Only run once on mount
  
  // Also load data when unified data is ready (for better accuracy)
  useEffect(() => {
    if (unifiedDashboardData && !unifiedLoading && !unifiedError) {
      // Unified data now uses count queries, so it has the correct counts from the start
      // Get active users count directly (unified service now provides accurate counts)
      (async () => {
        try {
          // Get active users count - unified data has totalUsers but we need active count
          let activeResult = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active');
          if (activeResult.error) {
            // Fallback to profiles
            activeResult = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true);
          }
          const activeUsers = activeResult.count || 0;
          
          // Update data with correct counts using startTransition for smooth updates
          startTransition(() => {
            updateDashboardData({
              totalUsers: unifiedDashboardData.totalUsers,
              totalPickups: unifiedDashboardData.totalCollections,
              totalWeight: unifiedDashboardData.totalWeight,
              totalRevenue: unifiedDashboardData.totalRevenue,
              activeUsers: activeUsers, // Use accurate count from the start
              pendingPickups: unifiedDashboardData.pendingCollections,
              totalWallets: unifiedDashboardData.totalWallets,
              totalCashBalance: unifiedDashboardData.totalWalletBalance,
              totalCurrentPoints: unifiedDashboardData.totalWalletBalance,
              totalPointsEarned: unifiedDashboardData.totalPointsEarned,
              totalPointsSpent: unifiedDashboardData.totalPointsSpent,
              totalLifetimeEarnings: unifiedDashboardData.totalPointsEarned,
              walletPermissionError: false,
              walletErrorMessage: ''
            });
          });
        } catch (_e) {
          // Fallback: show data with totalUsers as activeUsers if count query fails
          console.warn('Failed to get active users count, using totalUsers:', _e);
          startTransition(() => {
            updateDashboardData({
              totalUsers: unifiedDashboardData.totalUsers,
              totalPickups: unifiedDashboardData.totalCollections,
              totalWeight: unifiedDashboardData.totalWeight,
              totalRevenue: unifiedDashboardData.totalRevenue,
              activeUsers: unifiedDashboardData.totalUsers,
              pendingPickups: unifiedDashboardData.pendingCollections,
              totalWallets: unifiedDashboardData.totalWallets,
              totalCashBalance: unifiedDashboardData.totalWalletBalance,
              totalCurrentPoints: unifiedDashboardData.totalWalletBalance,
              totalPointsEarned: unifiedDashboardData.totalPointsEarned,
              totalPointsSpent: unifiedDashboardData.totalPointsSpent,
              totalLifetimeEarnings: unifiedDashboardData.totalPointsEarned,
              walletPermissionError: false,
              walletErrorMessage: ''
            });
          });
        }
      })();
    } else if (!unifiedLoading && unifiedError) {
      // If unified data fails, fall back to direct load (in background)
      console.warn('Unified data failed, falling back to direct load');
      loadDashboardData(true);
      loadRecentActivity();
    } else if (!unifiedLoading) {
      // Unified data not available yet, try direct load (in background)
      loadDashboardData(true);
      loadRecentActivity();
    }
  }, [unifiedDashboardData, unifiedLoading, unifiedError]);


  // Memoize card values from DISPLAY data (not internal data) to prevent flickering
  // Display data only updates when stable, so cards won't flicker
  const cardValues = useMemo(() => ({
    totalPickups: displayData.totalPickups,
    pendingPickups: displayData.pendingPickups,
    totalWeight: displayData.totalWeight,
    totalWeightDisplay: displayData.totalWeight >= 1000 
      ? `${(displayData.totalWeight / 1000).toFixed(1)} tons`
      : `${displayData.totalWeight.toFixed(1)} kg`,
    activeUsers: displayData.activeUsers,
    totalRevenue: displayData.totalRevenue,
    totalRevenueDisplay: `C ${displayData.totalRevenue.toLocaleString()}`,
    totalUsers: displayData.totalUsers,
    totalPayments: displayData.totalPayments,
    pendingPayments: displayData.pendingPayments,
    totalWallets: displayData.totalWallets,
    totalCashBalance: displayData.totalCashBalance,
    totalCurrentPoints: displayData.totalCurrentPoints,
    totalPointsEarned: displayData.totalPointsEarned,
    totalPointsSpent: displayData.totalPointsSpent,
    totalLifetimeEarnings: displayData.totalLifetimeEarnings
  }), [
    displayData.totalPickups,
    displayData.pendingPickups,
    displayData.totalWeight,
    displayData.activeUsers,
    displayData.totalRevenue,
    displayData.totalUsers,
    displayData.totalPayments,
    displayData.pendingPayments,
    displayData.totalWallets,
    displayData.totalCashBalance,
    displayData.totalCurrentPoints,
    displayData.totalPointsEarned,
    displayData.totalPointsSpent,
    displayData.totalLifetimeEarnings
  ]);
  
  // Cleanup display update timeout on unmount
  useEffect(() => {
    return () => {
      if (displayUpdateTimeoutRef.current) {
        clearTimeout(displayUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  // Listen for refresh requests (when Dashboard button is clicked)
  useEffect(() => {
    const handleRefreshRequest = () => {
      console.log('🔄 Dashboard button clicked - refreshing data...');
      loadDashboardData(true);
      loadRecentActivity();
    };
    
    window.addEventListener('dashboard-refresh-requested', handleRefreshRequest);
    return () => {
      window.removeEventListener('dashboard-refresh-requested', handleRefreshRequest);
    };
  }, []);

  // Mark initial load as complete
  useEffect(() => {
    if (!loading && !unifiedLoading) {
      setIsInitialLoadComplete(true);
    }
  }, [loading, unifiedLoading]);

  // App visibility handling DISABLED - no automatic refresh
  // Removed automatic refresh on visibility change - only refresh on Dashboard button click

  // 2) Set up realtime subscriptions once on mount
  useEffect(() => {
    // Don't force reconnect on online - let realtime manager handle it naturally
    const onOnline = () => {
      console.log('🌐 Online event - realtime manager will handle reconnection');
      // Don't call reconnectNow() - it causes loops
    }
    window.addEventListener('online', onOnline);

    const subscriptions = subscribeToAllChanges({
      pickups: () => {
        console.log('📡 Pickup change detected, reloading dashboard data...');
        loadDashboardData(); // Will be throttled
      },
      payments: () => {
        console.log('📡 Payment change detected, reloading dashboard data...');
        loadDashboardData(); // Will be throttled
      },
      users: () => {
        console.log('📡 User change detected, reloading dashboard data...');
        loadDashboardData(); // Will be throttled
      }
    });

    realtimeManager.subscribe('unified_collections_changes', (channel) => {
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unified_collections' }, (payload: any) => {
          console.log('📡 New collection detected:', payload.new);
          loadDashboardData(); // Will be throttled
          
          // Trigger notification for new collection
          notificationManager.addNotification({
            type: 'collection',
            title: 'New Collection Submitted',
            message: `Collection from ${payload.new?.customer_name || 'Unknown'} - ${payload.new?.total_weight_kg || 0}kg`
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'unified_collections' }, () => {
          console.log('📡 Unified collections change, refreshing dashboard...');
          loadDashboardData(); // Will be throttled
        })
    })

    realtimeManager.subscribe('wallets_changes', (channel) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        console.log('📡 Wallets change, refreshing dashboard...');
        loadDashboardData(); // Will be throttled
      })
    })

    // Subscribe to withdrawal requests
    realtimeManager.subscribe('withdrawal_requests_changes', (channel) => {
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'withdrawal_requests' }, (payload: any) => {
          console.log('📡 New withdrawal request detected:', payload.new);
          loadDashboardData(); // Will be throttled
          
          // Trigger notification for new withdrawal request
          notificationManager.addNotification({
            type: 'withdrawal',
            title: 'New Withdrawal Request',
            message: `Withdrawal request for C${payload.new?.amount || 0} from user ${payload.new?.user_id || 'Unknown'}`
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => {
          console.log('📡 Withdrawal requests change, refreshing dashboard...');
          loadDashboardData(); // Will be throttled
        })
    })

    return () => {
      window.removeEventListener('online', onOnline);
      subscriptions.forEach((sub: any) => {
        if (typeof sub === 'function') {
          try { sub() } catch {}
        } else if (sub?.unsubscribe) {
          try { sub.unsubscribe() } catch {}
        }
      });
      realtimeManager.unsubscribe('unified_collections_changes');
      realtimeManager.unsubscribe('wallets_changes');
      realtimeManager.unsubscribe('withdrawal_requests_changes');
    };
  }, []);

  const loadRecentActivity = async () => {
    try {
      console.log('🔄 Loading recent activity...');
      // Don't set loading to true - UI is already showing
      
      // Test connection first
      console.log('🔌 Testing Supabase connection...');
      const connectionTest = await testSupabaseConnection();
      console.log('🔌 Connection test result:', connectionTest);
      
      if (!connectionTest.success) {
        throw new Error(`Connection test failed: ${JSON.stringify(connectionTest.error)}`);
      }
      
      // Load data individually to catch specific errors
      console.log('📊 Loading pickups...');
      let pickups: any[] = [];
      try {
        pickups = await getPickups();
        console.log('✅ Pickups loaded:', pickups.length);
      } catch (pickupError) {
        console.error('❌ Error loading pickups:', pickupError);
        pickups = []; // Set empty array as fallback
      }

      console.log('📊 Loading collections...');
      let collections: any[] = [];
      try {
        const { data: colData, error: colErr } = await supabase
          .from('collections')
          .select('status, total_kg, weight_kg');
        if (colErr) {
          console.error('❌ Error loading collections:', colErr);
        } else {
          collections = colData || [];
          console.log('✅ Collections loaded:', collections.length);
        }
      } catch (collectionsError) {
        console.error('❌ Error loading collections:', collectionsError);
        collections = [];
      }
      
      console.log('📊 Loading payments...');
      let payments: any[] = [];
      try {
        payments = await getPayments();
        console.log('✅ Payments loaded:', payments.length);
      } catch (paymentError) {
        console.error('❌ Error loading payments:', paymentError);
        payments = []; // Set empty array as fallback
      }
      
      console.log('📊 Loading users...');
      let users: any[] = [];
      try {
        users = await getUsers();
        console.log('✅ Users loaded:', users.length);
      } catch (userError) {
        console.error('❌ Error loading users:', userError);
        users = []; // Set empty array as fallback
      }

      console.log('📊 Loading wallet data...');
      let walletData: any = null;
      try {
        walletData = await getWalletData();
        console.log('✅ Wallet data loaded:', walletData.totalWallets, 'wallets');
      } catch (walletError) {
        console.error('❌ Error loading wallet data:', walletError);
        walletData = { totalWallets: 0, totalCashBalance: 0, totalWeight: 0, totalCollections: 0 };
      }

      // Resident Summary logic: Total Value is sum of pickups.total_value

      console.log('📊 Dashboard data loaded:', {
        pickups: pickups.length,
        payments: payments.length,
        users: users.length
      });

      // Compute from Office collections first (matches Collection Management / Pickups pages)
      const revenueStatuses = new Set(['approved', 'completed']);
      const hasCollections = Array.isArray(collections) && collections.length > 0;
      const useUnified = !hasCollections && Array.isArray(unifiedCollections) && unifiedCollections.length > 0;

      const totalWeight = hasCollections
        ? (collections as any[])
            .filter((c: any) => revenueStatuses.has(String(c.status || '').toLowerCase()))
            .reduce((sum: number, c: any) => sum + (c.weight_kg ?? c.total_kg ?? 0), 0)
        : useUnified
        ? (unifiedCollections as any[])
            .filter((c: any) => revenueStatuses.has(String(c.status || '').toLowerCase()))
            .reduce((sum: number, c: any) => sum + (c.weight_kg ?? c.total_weight_kg ?? 0), 0)
        : pickups.reduce((sum, p) => sum + (p.total_kg || 0), 0);

      // Total Revenue from unified_collections stored values (all non-rejected)
      // Sum computed_value (fallback total_value). No legacy/wallet fallbacks.
      let totalRevenue = 0;
      let revenueSource = 'unified_collections(stored, all-non-rejected)';
      try {
        const { data: ucRows, error: ucErr } = await supabase
          .from('unified_collections')
          .select('status, computed_value, total_value')
          .neq('status', 'rejected');
        const rows = (!ucErr && Array.isArray(ucRows)) ? ucRows : [];
        totalRevenue = rows.reduce((s: number, r: any) => s + (Number(r.computed_value ?? r.total_value) || 0), 0);
      } catch (_e) {
        // keep totalRevenue at 0 on error
      }

      // Fallback: derive from collection_materials if stored totals are zero
      if (!totalRevenue) {
        try {
          const { data: idsData, error: idsErr } = await supabase
            .from('unified_collections')
            .select('id')
            .neq('status', 'rejected');
          const ids = (!idsErr && Array.isArray(idsData)) ? idsData.map((r: any) => r.id) : [];
          if (ids.length > 0) {
            const { data: mats, error: matsErr } = await supabase
              .from('collection_materials')
              .select('collection_id, quantity, unit_price')
              .in('collection_id', ids);
            if (!matsErr && Array.isArray(mats)) {
              totalRevenue = mats.reduce((sum: number, m: any) => sum + ((Number(m.quantity) || 0) * (Number(m.unit_price) || 0)), 0);
              revenueSource = 'collection_materials(derived)';
            }
          }
        } catch (_e) {
          // ignore and keep totalRevenue as-is
        }
      }

      console.log('🔍 Revenue calculation debug:', { totalRevenue, revenueSource });
      const pendingPickups = pickups.filter(p => p.status === 'submitted').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;
      const activeUsers = users.filter(u => u.is_active).length;

      console.log('📈 Calculated stats:', {
        totalWeight,
        totalRevenue,
        pendingPickups,
        pendingPayments,
        activeUsers
      });

      updateDashboardData({
        totalUsers: users.length,
        totalPickups: pickups.length,
        totalWeight,
        totalRevenue,
        activeUsers,
        pendingPickups,
        totalPayments: payments.length,
        pendingPayments,
        totalWallets: walletData?.totalWallets || 0,
        totalCashBalance: walletData?.totalCashBalance || 0,
        totalWalletWeight: walletData?.totalWeight || 0,
        totalWalletCollections: walletData?.totalCollections || 0,
        totalCurrentPoints: walletData?.totalCurrentPoints || 0,
        totalPointsEarned: walletData?.totalPointsEarned || 0,
        totalPointsSpent: walletData?.totalPointsSpent || 0,
        totalLifetimeEarnings: walletData?.totalLifetimeEarnings || 0,
        walletPermissionError: walletData?.permissionError || false,
        walletErrorMessage: walletData?.errorMessage || ''
      });
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-gray-600 mt-2 text-base sm:text-lg">
              {isSuperAdmin 
                ? 'Full system access with advanced administrative privileges' 
                : 'Real-time system overview and management'
              }
            </p>
        </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Total Pickups</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1 transition-all duration-500 ease-in-out">
              {loading ? '...' : cardValues.totalPickups.toLocaleString()}
            </div>
              <p className="text-sm text-blue-700 font-medium transition-all duration-500 ease-in-out">
              Pending: {cardValues.pendingPickups}
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Total Weight</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1 transition-all duration-500 ease-in-out">
              {loading ? '...' : cardValues.totalWeightDisplay}
            </div>
              <p className="text-sm text-green-700 font-medium">
              Recycled material
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-900">Active Users</CardTitle>
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-1 transition-all duration-500 ease-in-out">
              {loading ? '...' : cardValues.activeUsers.toLocaleString()}
            </div>
              <p className="text-sm text-yellow-700 font-medium">
              Active accounts
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-900">Total Credits</CardTitle>
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-orange-600 mb-1 transition-all duration-500 ease-in-out">
              {loading ? '...' : cardValues.totalRevenueDisplay}
            </div>
              <p className="text-sm text-orange-700 font-medium">
              Generated Credits
            </p>
          </CardContent>
        </Card>
      </div>

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
                    // Also clear session storage to ensure lock state
                    try {
                      sessionStorage.removeItem('pwaLock.unlockedSession');
                    } catch {}
                    // Force immediate refresh to trigger unlock card
                    router.push('/admin/lock');
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

      {/* Offline Banner */}
      <OfflineBanner onRetry={() => { forceRefresh(); loadDashboardData(true); }} />

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-900">Pending Pickups</CardTitle>
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-1 transition-all duration-500 ease-in-out">
              {loading ? '...' : cardValues.pendingPickups}
            </div>
              <p className="text-sm text-yellow-700 font-medium">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-indigo-900">Total Payments</CardTitle>
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-indigo-600 mb-1 transition-all duration-500 ease-in-out">
              {loading ? '...' : cardValues.totalPayments}
            </div>
              <p className="text-sm text-indigo-700 font-medium">
              Processed
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-red-900">Pending Payments</CardTitle>
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-red-600 mb-1 transition-all duration-500 ease-in-out">
              {loading ? '...' : cardValues.pendingPayments}
            </div>
              <p className="text-sm text-red-700 font-medium">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        {(loading || displayData.walletPermissionError ||
          cardValues.totalWallets > 0 ||
          cardValues.totalCurrentPoints > 0 ||
          cardValues.totalPointsEarned > 0 ||
          cardValues.totalCashBalance > 0) && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-900">Total Point Balance</CardTitle>
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
            </CardHeader>
            <CardContent>
              {displayData.walletPermissionError ? (
                <div className="text-center py-2">
                  <div className="text-sm font-medium text-orange-600 mb-1">
                    Permission Required
                  </div>
                  <p className="text-xs text-gray-500">
                    Run FIX_WALLET_PERMISSIONS.sql to enable wallet data access
                  </p>
                </div>
              ) : (
                <>
                    <div className="text-3xl font-bold text-emerald-600 mb-1 transition-all duration-300 ease-in-out">
                    {loading ? '...' : cardValues.totalCurrentPoints.toLocaleString()}
                  </div>
                    <p className="text-sm text-emerald-700 font-medium transition-all duration-300 ease-in-out">
                    {cardValues.totalWallets} wallets • Total points earned
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-t-lg">
              <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
              <CardDescription className="text-gray-300">Common admin tasks</CardDescription>
          </CardHeader>
            <CardContent className="p-6 space-y-3">
            <Button 
                className="w-full justify-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => onPageChange('pickups')}
            >
                <Package className="mr-3 h-5 w-5" />
              Manage Pickups
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => onPageChange('rewards')}
            >
                <Gift className="mr-3 h-5 w-5" />
              Configure Rewards
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => onPageChange('analytics')}
            >
                <BarChart3 className="mr-3 h-5 w-5" />
              View Reports
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => onPageChange('users')}
            >
                <Users className="mr-3 h-5 w-5" />
              Manage Users
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => onPageChange('withdrawals')}
            >
                <CreditCard className="mr-3 h-5 w-5" />
              Process Payments
            </Button>
          </CardContent>
        </Card>

          {/* Super Admin Features */}
          {isSuperAdmin && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-xl">
                  <Crown className="w-6 h-6 mr-3" />
                  Super Admin Tools
                </CardTitle>
                <CardDescription className="text-green-100">
                  Advanced administrative functions
                </CardDescription>
          </CardHeader>
              <CardContent className="p-6 space-y-3">
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  size="lg"
                  onClick={() => onPageChange('config')}
                >
                  <Settings className="mr-3 h-5 w-5" />
                  System Configuration
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  size="lg"
                  onClick={() => onPageChange('transactions')}
                >
                  <Wallet className="mr-3 h-5 w-5" />
                  Transaction Management
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  size="lg"
                  onClick={() => onPageChange('analytics')}
                >
                  <TrendingUp className="mr-3 h-5 w-5" />
                  Advanced Analytics
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-t-lg">
              <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
              <CardDescription className="text-gray-300">Latest system activities</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
            {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                  Loading recent activity...
                </div>
            ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">No recent activity</p>
                  <p className="text-sm">System activities will appear here</p>
                </div>
            ) : (
              recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className={`w-3 h-3 rounded-full shadow-sm ${
                    activity.type === 'pickup_approved' ? 'bg-green-500' :
                    activity.type === 'pickup_rejected' ? 'bg-red-500' :
                    activity.type === 'pickup_created' ? 'bg-blue-500' :
                    activity.type === 'user_registered' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                  <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-600">{activity.description}</p>
                  </div>
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

// Other Page Content Components
function AdminActivityContent() {
  type AdminEvent = {
    id: string;
    user_id: string;
    event_type: 'login' | 'logout' | 'soft_logout' | 'unlock';
    reason: string | null;
    created_at: string;
    user_email?: string | null;
    user_name?: string | null;
  };

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'date' | 'week' | 'month'>('date');
  const [userGroupBy, setUserGroupBy] = useState<Record<string, 'date' | 'week' | 'month'>>({});
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, Set<string>>>({});

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_session_events', { p_limit: 500 });
      if (error) throw error;
      const list = Array.isArray(data) ? data : [];
      const ids = Array.from(new Set(list.map((e: any) => e.user_id).filter(Boolean)));
      const userMap = new Map<string, { email: string; name: string }>();
      if (ids.length) {
        const { data: usersData } = await supabase.from('users').select('id,email,full_name,first_name,last_name').in('id', ids);
        (usersData || []).forEach((u: any) => {
          const name = u.full_name || (`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.email || 'Unknown';
          userMap.set(u.id, { email: u.email || '', name });
        });
      }
      const mapped: AdminEvent[] = list.map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        event_type: e.event_type,
        reason: e.reason ?? null,
        created_at: e.created_at,
        user_email: userMap.get(e.user_id)?.email || null,
        user_name: userMap.get(e.user_id)?.name || null,
      }));
      setEvents(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  // Group events by user
  const eventsByUser = events.reduce((acc, ev) => {
    const userId = ev.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        user_name: ev.user_name || 'Unknown',
        user_email: ev.user_email || '',
        events: []
      };
    }
    acc[userId].events.push(ev);
    return acc;
  }, {} as Record<string, { user_id: string; user_name: string; user_email: string; events: AdminEvent[] }>);

  // Calculate statistics
  const stats = {
    totalEvents: events.length,
    totalUsers: Object.keys(eventsByUser).length,
    logins: events.filter(e => e.event_type === 'login').length,
    unlocks: events.filter(e => e.event_type === 'unlock').length,
    logouts: events.filter(e => e.event_type === 'logout').length,
    softLogouts: events.filter(e => e.event_type === 'soft_logout').length,
    todayEvents: events.filter(e => {
      const d = new Date(e.created_at);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length,
  };

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const togglePeriod = (userId: string, periodKey: string) => {
    setExpandedPeriods(prev => {
      const userPeriods = prev[userId] || new Set<string>();
      const next = new Set(userPeriods);
      if (next.has(periodKey)) {
        next.delete(periodKey);
      } else {
        next.add(periodKey);
      }
      return {
        ...prev,
        [userId]: next
      };
    });
  };

  const isPeriodExpanded = (userId: string, periodKey: string) => {
    // Default to expanded (true) if not set, so periods are open by default
    const userPeriods = expandedPeriods[userId];
    if (!userPeriods) return true;
    return userPeriods.has(periodKey);
  };

  const downloadReport = () => {
    // Create CSV content
    const headers = ['User Name', 'Email', 'Event Type', 'Reason', 'Timestamp'];
    const rows = events.map(ev => [
      ev.user_name || 'Unknown',
      ev.user_email || '',
      ev.event_type,
      ev.reason || '',
      new Date(ev.created_at).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `admin-activity-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const badgeClass = (t: AdminEvent['event_type']) =>
    t === 'login'
      ? 'bg-green-100 text-green-800 border-green-200'
      : t === 'logout'
      ? 'bg-red-100 text-red-800 border-red-200'
      : t === 'soft_logout'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

  const sortedUsers = Object.values(eventsByUser).sort((a, b) => 
    b.events.length - a.events.length || a.user_name.localeCompare(b.user_name)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header with Download Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Activity Report</h2>
          <p className="text-sm text-gray-600 mt-1">Comprehensive activity statistics and logs</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'date' | 'week' | 'month')}
            className="rounded-lg border border-gray-200 bg-white text-gray-800 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="date">Group by Date</option>
            <option value="week">Group by Week</option>
            <option value="month">Group by Month</option>
          </select>
          <Button 
            onClick={load} 
            disabled={loading} 
            variant="outline"
            className="bg-white hover:bg-gray-50 text-gray-900"
          >
            {loading ? <span className="text-gray-900">Refreshing...</span> : 'Refresh'}
          </Button>
          <Button 
            onClick={downloadReport} 
            disabled={loading || events.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalEvents}</div>
            <p className="text-xs text-blue-700 mt-1">All activity records</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.totalUsers}</div>
            <p className="text-xs text-green-700 mt-1">Users with activity</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.todayEvents}</div>
            <p className="text-xs text-purple-700 mt-1">Events today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.logins}</div>
            <p className="text-xs text-orange-700 mt-1">Total logins</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Type Breakdown */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Event Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.logins}</div>
              <div className="text-sm text-green-700 font-medium">Logins</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.unlocks}</div>
              <div className="text-sm text-blue-700 font-medium">Unlocks</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.logouts}</div>
              <div className="text-sm text-red-700 font-medium">Logouts</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.softLogouts}</div>
              <div className="text-sm text-yellow-700 font-medium">Soft Logouts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Activity List */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activity by User</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Click on a user to view their detailed activity</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading activity...</p>
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No activity records found.</div>
          ) : (
            <div className="space-y-2">
              {sortedUsers.map((userGroup) => {
                const isExpanded = expandedUsers.has(userGroup.user_id);
                const userEvents = userGroup.events.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                const initials = (userGroup.user_name || 'U').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
                
                // Get grouping preference for this user (defaults to global groupBy)
                const userGrouping = userGroupBy[userGroup.user_id] || groupBy;

                // Group events by date, week, or month based on user's selection
                const eventsByPeriod = userEvents.reduce((acc, ev) => {
                  const date = new Date(ev.created_at);
                  let periodKey = '';
                  
                  if (userGrouping === 'month') {
                    periodKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                  } else if (userGrouping === 'week') {
                    // Get the start of the week (Sunday)
                    const weekStart = new Date(date);
                    const day = weekStart.getDay();
                    const diff = weekStart.getDate() - day;
                    weekStart.setDate(diff);
                    weekStart.setHours(0, 0, 0, 0);
                    
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const weekStartTime = weekStart.getTime();
                    const weekEndTime = weekEnd.getTime();
                    const todayTime = today.getTime();
                    
                    if (todayTime >= weekStartTime && todayTime <= weekEndTime) {
                      periodKey = 'This Week';
                    } else {
                      const prevWeek = new Date(today);
                      prevWeek.setDate(prevWeek.getDate() - 7);
                      const prevWeekStart = new Date(prevWeek);
                      prevWeekStart.setDate(prevWeekStart.getDate() - prevWeekStart.getDay());
                      const prevWeekEnd = new Date(prevWeekStart);
                      prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
                      
                      if (weekStartTime >= prevWeekStart.getTime() && weekStartTime <= prevWeekEnd.getTime()) {
                        periodKey = 'Last Week';
                      } else {
                        periodKey = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                      }
                    }
                  } else {
                    // Group by date (default)
                    const dateKey = date.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const eventDate = new Date(date);
                    eventDate.setHours(0, 0, 0, 0);
                    
                    const diffTime = today.getTime() - eventDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 0) {
                      periodKey = 'Today';
                    } else if (diffDays === 1) {
                      periodKey = 'Yesterday';
                    } else if (diffDays <= 7) {
                      periodKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                    } else {
                      periodKey = dateKey;
                    }
                  }
                  
                  if (!acc[periodKey]) {
                    acc[periodKey] = [];
                  }
                  acc[periodKey].push(ev);
                  return acc;
                }, {} as Record<string, AdminEvent[]>);

                // Sort periods based on userGrouping type
                const sortedPeriods = Object.keys(eventsByPeriod).sort((a, b) => {
                  if (userGrouping === 'month') {
                    // Sort months: current month first, then by date descending
                    const today = new Date();
                    const currentMonth = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    if (a === currentMonth) return -1;
                    if (b === currentMonth) return 1;
                    return new Date(b).getTime() - new Date(a).getTime();
                  } else if (groupBy === 'week') {
                    // Sort weeks: This Week first, Last Week second, then by date descending
                    if (a === 'This Week') return -1;
                    if (b === 'This Week') return 1;
                    if (a === 'Last Week') return -1;
                    if (b === 'Last Week') return 1;
                    // Extract date from week string for comparison
                    const dateA = a.includes('Week of') ? new Date(a.split(' - ')[0].replace('Week of ', '')) : new Date(0);
                    const dateB = b.includes('Week of') ? new Date(b.split(' - ')[0].replace('Week of ', '')) : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                  } else {
                    // Sort dates: Today first, Yesterday second, then by date descending
                    if (a === 'Today') return -1;
                    if (b === 'Today') return 1;
                    if (a === 'Yesterday') return -1;
                    if (b === 'Yesterday') return 1;
                    // Try to parse as date, fallback to string comparison
                    const dateA = new Date(a);
                    const dateB = new Date(b);
                    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                      return dateB.getTime() - dateA.getTime();
                    }
                    return b.localeCompare(a);
                  }
                });

                return (
                  <div key={userGroup.user_id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleUser(userGroup.user_id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                          {initials}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{userGroup.user_name}</div>
                          {userGroup.user_email && (
                            <div className="text-xs text-gray-600">{userGroup.user_email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{userEvents.length}</div>
                          <div className="text-xs text-gray-600">events</div>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-white">
                        <div className="p-4 space-y-4">
                          {/* User-specific grouping dropdown */}
                          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Group by:</span>
                            <select
                              value={userGroupBy[userGroup.user_id] || groupBy}
                              onChange={(e) => {
                                const newGrouping = e.target.value as 'date' | 'week' | 'month';
                                setUserGroupBy(prev => ({
                                  ...prev,
                                  [userGroup.user_id]: newGrouping
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-gray-300 bg-white text-gray-800 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            >
                              <option value="date">Date</option>
                              <option value="week">Week</option>
                              <option value="month">Month</option>
                            </select>
                          </div>
                          
                          <div className="max-h-96 overflow-y-auto space-y-4">
                            {sortedPeriods.map((periodKey) => {
                              const periodEvents = eventsByPeriod[periodKey];
                              // Sort events within each period by time (newest first)
                              const sortedPeriodEvents = [...periodEvents].sort((a, b) => 
                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                              );
                              const isExpanded = isPeriodExpanded(userGroup.user_id, periodKey);
                              
                              return (
                                <div key={periodKey} className="border border-gray-200 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => togglePeriod(userGroup.user_id, periodKey)}
                                    className="w-full sticky top-0 bg-white z-10 pb-2 border-b border-gray-200 hover:bg-gray-50 transition-colors p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="text-left">
                                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                          {periodKey}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {sortedPeriodEvents.length} {sortedPeriodEvents.length === 1 ? 'event' : 'events'}
                                        </p>
                                      </div>
                                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                  </button>
                                  {isExpanded && (
                                    <div className="space-y-2 pl-2 p-2">
                                      {sortedPeriodEvents.map((ev) => {
                                        const eventDate = new Date(ev.created_at);
                                        const timeDisplay = eventDate.toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit',
                                          second: '2-digit'
                                        });
                                        const dateDisplay = userGrouping === 'month' || userGrouping === 'week' 
                                          ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                          : '';
                                        
                                        return (
                                          <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                              <span className={`text-xs px-2 py-1 rounded-md border font-medium ${badgeClass(ev.event_type)}`}>
                                                {ev.event_type.replace('_', ' ')}
                                              </span>
                                              {ev.reason && (
                                                <span className="text-xs text-gray-600">{ev.reason}</span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500 text-right">
                                              {dateDisplay && <div className="font-medium">{dateDisplay}</div>}
                                              <div>{timeDisplay}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamMembersContent() {
  const { users, loading, error } = useAllUsers();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [pendingCollectors, setPendingCollectors] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Load pending collectors
  useEffect(() => {
    loadPendingCollectors();
  }, []);
  
  const loadPendingCollectors = async () => {
    setLoadingPending(true);
    try {
      // Use direct query to avoid RLS permission issues with views
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('status', 'pending_approval')
        .eq('role', 'collector')
        .order('created_at', { ascending: true });
      
      if (!error) {
        setPendingCollectors(data || []);
        console.log('✅ Loaded pending collectors:', data?.length || 0);
      } else {
        console.error('Error loading pending collectors:', error);
        setPendingCollectors([]);
      }
    } catch (err) {
      console.error('Error loading pending collectors:', err);
      setPendingCollectors([]);
    } finally {
      setLoadingPending(false);
    }
  };
  
  const approveCollector = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'active', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (!error) {
        await loadPendingCollectors();
        // Removed navigation to avoid undefined router in this scope
      }
    } catch (err) {
      console.error('Error approving collector:', err);
    }
  };
  
  const rejectCollector = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'rejected', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (!error) {
        await loadPendingCollectors();
      }
    } catch (err) {
      console.error('Error rejecting collector:', err);
    }
  };

  const suspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'suspended', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (!error) {
        // Navigation removed
      }
    } catch (err) {
      console.error('Error suspending user:', err);
    }
  };

  const activateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'active', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (!error) {
        // Removed forced reload
      }
    } catch (err) {
      console.error('Error activating user:', err);
    }
  };

  const editUser = (user: any) => {
    setEditingUser(user);
    setShowEditModal(true);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Team Members List</h1>
            <p className="text-gray-600">Manage your team members and their status</p>
          </div>
          {/* Remove Add New User button per request */}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading team members...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Team Members</h3>
              <p className="text-red-600">{error.message}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending Collector Approvals */}
            {pendingCollectors.length > 0 && (
              <Card className="border-0 shadow-xl bg-gradient-to-r from-orange-50 to-amber-50">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <UserCheck className="w-6 h-6 mr-3" />
                    Pending Collector Approvals ({pendingCollectors.length})
                  </CardTitle>
                  <CardDescription className="text-orange-100">
                    Review and approve new collector signups
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-4">
                    {pendingCollectors.map((collector) => (
                      <div key={collector.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 flex items-center justify-center shadow-sm">
                            <span className="text-lg font-bold text-orange-700">
                              {collector.full_name?.charAt(0) || collector.email?.charAt(0) || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-lg">{collector.full_name || 'No name'}</p>
                            <p className="text-gray-600">{collector.email}</p>
                            <p className="text-sm text-orange-600 font-medium">Employee #: {collector.employee_number || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            size="sm"
                            onClick={() => approveCollector(collector.id)}
                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectCollector(collector.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Team Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Team Members</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {users.filter(u => u.role?.name === 'admin' || u.role?.name === 'collector').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">Admins</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {users.filter(u => u.role?.name === 'admin').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-900 mb-2">Collectors</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {users.filter(u => u.role?.name === 'collector').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Team Members Table */}
            <Card className="border-0 shadow-xl">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 rounded-t-lg">
                <h3 className="text-xl font-semibold text-white">Team Members List</h3>
                <p className="text-gray-300">Manage your team members and their status</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                      .filter(u => u.role?.name === 'admin' || u.role?.name === 'collector')
                      .map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                              {/* 3D green avatar badge */}
                              <div className="h-10 w-10 rounded-full bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(0,128,0,0.35)]">
                                <span className="text-sm font-bold text-white drop-shadow">
                                  {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-0">
                              <div className="text-sm font-semibold text-gray-900">
                                {user.full_name || 'No name'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Employee #{(user as any).employee_number || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* 3D role badge */}
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(0,0,0,0.12)] ${
                            user.role?.name === 'admin'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                          }`}>
                            {user.role?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* 3D status badge */}
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(0,0,0,0.12)] ${
                            user.status === 'active'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              : user.status === 'suspended'
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                              : (user as any).status === 'pending_approval'
                              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900'
                              : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900'
                          }`}>
                            {user.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <div className="rounded-lg p-[2px] bg-gradient-to-b from-blue-500 to-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(0,0,128,0.25)]">
                              <button 
                                onClick={() => editUser(user)}
                                className="px-3 py-1 rounded-md bg-transparent text-white hover:bg-white/10 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                            {(user as any).status === 'pending_approval' && ((user as any).role?.name === 'collector' || (user as any).role === 'collector') && (
                              <>
                                <button
                                  onClick={() => approveCollector(user.id)}
                                  className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectCollector(user.id)}
                                  className="text-red-600 hover:text-red-900 px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {user.status === 'active' ? (
                              <div className="rounded-lg p-[2px] bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(128,96,0,0.25)]">
                                <button 
                                  onClick={() => suspendUser(user.id)}
                                  className="px-3 py-1 rounded-md bg-transparent text-gray-900 hover:bg-white/10 transition-colors"
                                >
                                  Suspend
                                </button>
                              </div>
                            ) : user.status === 'suspended' ? (
                              <div className="rounded-lg p-[2px] bg-gradient-to-b from-green-500 to-green-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(0,128,0,0.25)]">
                                <button 
                                  onClick={() => activateUser(user.id)}
                                  className="px-3 py-1 rounded-md bg-transparent text-white hover:bg-white/10 transition-colors"
                                >
                                  Activate
                                </button>
                              </div>
                            ) : null}
                            <div className="rounded-lg p-[2px] bg-gradient-to-b from-red-500 to-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(128,0,0,0.25)]">
                              <button 
                                onClick={() => {
                                  if (confirm('Are you sure you want to remove this user?')) {
                                    // Add remove functionality here
                                  }
                                }}
                                className="px-3 py-1 rounded-md bg-transparent text-white hover:bg-white/10 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
        
        {/* Add User Modal */}
        {showAddUserModal && (
          <AddUserModal
            isOpen={showAddUserModal}
            onClose={() => setShowAddUserModal(false)}
            onSuccess={() => {
              setShowAddUserModal(false);
              window.location.reload();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Common African first names (South African names) - used for shuffling
const AFRICAN_NAMES = new Set([
    'thabo', 'lerato', 'tumelo', 'karabo', 'tshepo', 'boitumelo', 'kgomotso', 'refilwe', 'katlego', 'lebogang',
    'mpho', 'teboho', 'kabelo', 'motlatsi', 'tshepiso', 'nthabiseng', 'mapule', 'bonolo', 'rorisang', 'onkarabile',
    'kelebogile', 'tshegofatso', 'lesego', 'otsile', 'boipelo', 'kagiso', 'keabetswe', 'tumisang', 'tshepang', 'thabiso',
    'mmathabo', 'mmamotse', 'mmamokete', 'sipho', 'thandeka', 'nomusa', 'sibusiso', 'nandi', 'bongani', 'hlengiwe',
    'themba', 'zanele', 'nokuthula', 'mxolisi', 'phumzile', 'jabulani', 'khanyisile', 'sandile', 'lindiwe', 'siyabonga',
    'gugu', 'mandisa', 'vusi', 'nosipho', 'ayanda', 'nkosinathi', 'ntokozo', 'nonhlanhla', 'nqobile', 'sanele',
    'lungile', 'nhlanhla', 'nomthandazo', 'mthokozisi', 'nombuso', 'xolani', 'nokwazi', 'zodwa', 'nkosazana', 'nomalanga',
    'nothando', 'nompumelelo', 'bhekisisa', 'zandile', 'sifiso', 'nokubonga', 'thulani', 'lwandle', 'mthunzi', 'siphesihle',
    'phindile', 'luyanda', 'minenhle', 'nontobeko', 'siyanda', 'luyolo', 'sinethemba', 'nkosikhona', 'vuyisile', 'zibusiso',
    'nqobizitha', 'mlungisi', 'sakhile', 'nhlakanipho', 'thulisile', 'luyanda', 'noxolo', 'ayanda', 'thandiswa', 'siphesihle',
    'zanele', 'sibusiso', 'nandipha', 'nomvula', 'hlengiwe', 'mandisa', 'vuyisile', 'nosipho', 'phumzile', 'khanyisile',
    'luyolo', 'nkosikhona', 'sinethemba', 'vuyolwethu', 'zimasa', 'khanyisa', 'lihle', 'yonela', 'andile', 'phakama',
    'zikhona', 'lutho', 'ncebakazi', 'sikelela', 'hlumelo', 'liyema', 'akhona', 'babalwa', 'khumbuzo', 'ziyanda',
    'lulama', 'phumla', 'siphokazi', 'lwandile', 'thulisa', 'zikhona', 'liyabona', 'yonwaba', 'siphelele', 'kholeka',
    'kagiso', 'boipelo', 'lesego', 'tshepiso', 'refilwe', 'neo', 'palesa', 'rudzani', 'azwindini', 'lufuno',
    'mulalo', 'takalani', 'khodani', 'vhutshilo', 'rendani', 'ndivhuwo', 'fhatuwani', 'livhuwani', 'vhahangwele', 'thivhulawi',
    'khathutshelo', 'ndamulelo', 'vhuthuhawe', 'rofhiwa', 'azwinndini', 'phathutshedzo', 'tshilidzi', 'bongani', 'thandeka',
    'sipho', 'themba', 'hlengiwe', 'nokuthula', 'mandisa', 'siyabonga', 'lindiwe', 'sandile', 'gugu', 'ayanda',
    'vusi', 'nosipho', 'nkosinathi', 'ntokozo', 'nonhlanhla', 'mpho', 'nqobile', 'sanele', 'lungile', 'nhlanhla'
]);

// Function to check if a name is African
function isAfricanName(name: string | null | undefined): boolean {
  if (!name) return false;
  const firstName = name.split(' ')[0].toLowerCase().trim();
  return AFRICAN_NAMES.has(firstName);
}

function UsersContent() {
  const { users, loading, error } = useAllUsers();
  const { townships, loading: townshipsLoading, error: townshipsError } = useTownships();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
  // Function to shuffle users prioritizing African names
  const shuffleUsersWithAfricanFirst = (usersList: typeof users) => {
    const shuffled = [...usersList];
    
    // Separate African and non-African names
    const africanUsers: typeof users = [];
    const otherUsers: typeof users = [];
    
    shuffled.forEach(user => {
      const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      if (isAfricanName(fullName)) {
        africanUsers.push(user);
      } else {
        otherUsers.push(user);
      }
    });
    
    // Shuffle both arrays
    for (let i = africanUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [africanUsers[i], africanUsers[j]] = [africanUsers[j], africanUsers[i]];
    }
    
    for (let i = otherUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherUsers[i], otherUsers[j]] = [otherUsers[j], otherUsers[i]];
    }
    
    // Combine: African names first, then others
    return [...africanUsers, ...otherUsers];
  };
  
  // Memoize shuffled users
  const [shuffledUsers, setShuffledUsers] = useState<typeof users>([]);
  
  useEffect(() => {
    if (users.length > 0) {
      setShuffledUsers(shuffleUsersWithAfricanFirst(users));
      setCurrentPage(1); // Reset to first page when users change
    }
  }, [users]);
  
  // Function to mask email
  const maskEmail = (email: string | null | undefined): string => {
    if (!email) return 'N/A';
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    } else if (localPart.length <= 4) {
      return `${localPart.slice(0, 2)}***@${domain}`;
    } else {
      return `${localPart.slice(0, 3)}***@${domain}`;
    }
  };
  
  // Function to mask township
  const maskTownship = (township: string): string => {
    if (!township || township === 'Not specified') return 'Not specified';
    if (township.length <= 3) return '***';
    if (township.length <= 6) {
      return `${township.slice(0, 2)}***`;
    } else {
      return `${township.slice(0, 3)}***`;
    }
  };
  
  // Function to extract township from address
  const extractTownshipFromAddress = (address: string | null | undefined): string => {
    if (!address) return 'Not specified';
    
    // Common township patterns in South Africa
    const townshipPatterns = [
      /(?:township|town|area|suburb|location|settlement|village|informal settlement)/i,
      /(?:soweto|alexandra|khayelitsha|gugulethu|langa|nyanga|philippi|mitchells plain|manenberg|bontheuwel|delft|belhar|kuils river|strand|gordon's bay|somerset west|paarl|stellenbosch|franschhoek|wellington|malmesbury|vredenburg|saldanha|vredendal|springbok|upington|kimberley|bloemfontein|welkom|bethlehem|harrismith|ladysmith|newcastle|pietermaritzburg|durban|richards bay|port shepstone|margate|umtata|east london|port elizabeth|grahamstown|graaff-reinet|oudtshoorn|george|knysna|plettenberg bay|mossel bay|swellendam|wolseley|tulbagh|ceres|wellington|paarl|stellenbosch|franschhoek|somerset west|strand|gordon's bay|kuils river|belhar|delft|mitchells plain|manenberg|bontheuwel|philippi|nyanga|langa|gugulethu|khayelitsha|alexandra|soweto)/i
    ];
    
    // Try to find township patterns
    for (const pattern of townshipPatterns) {
      const match = address.match(pattern);
      if (match) {
        return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
      }
    }
    
    // If no pattern matches, try to extract the last part of the address
    const parts = address.split(',').map(part => part.trim());
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length > 2 && lastPart.length < 50) {
        return lastPart;
      }
    }
    
    return 'Not specified';
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(shuffledUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = shuffledUsers.slice(startIndex, endIndex);
  
  // Calculate user statistics (using original users array)
  const totalUsers = users.length;
  const residents = users.filter(u => u.role?.name === 'resident').length;
  const collectors = users.filter(u => u.role?.name === 'collector').length;
  const admins = users.filter(u => u.role?.name === 'admin' || u.role?.name === 'super_admin').length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Users Management</h1>
            <p className="text-gray-600">Manage system users and their locations</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Users className="w-4 h-4 mr-2" />
              {totalUsers} Total Users
            </Badge>
            <Badge className="text-sm bg-gradient-to-r from-green-600 to-green-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Activity className="w-4 h-4 mr-2" />
              {activeUsers} Active
            </Badge>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>Error loading users: {error.message}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-900">Total Users</CardTitle>
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {totalUsers.toLocaleString()}
                  </div>
                  <p className="text-sm text-blue-700 font-medium">
                    System users
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-green-900">Residents</CardTitle>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {residents.toLocaleString()}
                  </div>
                  <p className="text-sm text-green-700 font-medium">
                    Community members
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-900">Collectors</CardTitle>
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {collectors.toLocaleString()}
                  </div>
                  <p className="text-sm text-orange-700 font-medium">
                    Collection staff
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-900">Admins</CardTitle>
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {admins.toLocaleString()}
                  </div>
                  <p className="text-sm text-purple-700 font-medium">
                    System administrators
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-900">Active</CardTitle>
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 mb-1">
                    {activeUsers.toLocaleString()}
                  </div>
                  <p className="text-sm text-emerald-700 font-medium">
                    Active users
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Users Table */}
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">All Users</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Complete list of system users with location information</p>
                  </div>
                  <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                    <Users className="w-4 h-4 mr-2" />
                    {totalUsers} Users
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Township</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedUsers.map((user) => {
                        const township = extractTownshipFromAddress((user as any).address || (user as any).township_name);
                        const maskedTownship = maskTownship(township);
                        const maskedEmail = maskEmail(user.email);
                        return (
                          <tr key={user.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12">
                                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <span className="text-lg font-semibold text-white">
                                      {(user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'U').charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {user.id.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {maskedEmail}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                                user.role?.name === 'admin' || user.role?.name === 'super_admin' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                                user.role?.name === 'collector' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                                user.role?.name === 'resident' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                                'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                              }`}>
                                {user.role?.name || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600">
                                  {maskedTownship}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                                user.status === 'active' 
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                                  : user.status === 'suspended'
                                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                              }`}>
                                {user.status}
                              </Badge>
                            </td>
                           
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center text-sm text-gray-700">
                      <span>
                        Showing {startIndex + 1} to {Math.min(endIndex, shuffledUsers.length)} of {shuffledUsers.length} users
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="min-w-[2.5rem]"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawalsContent() {
  return <PaymentsPage />;
}

function RewardsContent() {
  return <RewardsPage />;
}

function TiersContent() {
  return <ResidentSummaryPage />;
}


function CollectionsContent() {
  const { collections, loading, error } = useCollections();
  const [rows, setRows] = useState<typeof collections>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fullNameByEmail, setFullNameByEmail] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedCollectionForReset, setSelectedCollectionForReset] = useState<{ id: string; name: string } | null>(null);
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'super_admin' || profile?.role === 'SUPER_ADMIN';
  
  // Function to reload collections data
  const reloadCollections = async () => {
    console.log('🔄 Collections: Reloading data...');
    try {
      const { data, error: fetchError } = await UnifiedAdminService.getAllCollections();
      if (!fetchError && data) {
        setRows(data);
        console.log('✅ Collections: Data reloaded successfully');
      }
    } catch (err) {
      console.error('❌ Collections: Error reloading data:', err);
    }
  };

  const getDisplayName = (fullName?: string, email?: string) => {
    const cleaned = (fullName || '').trim();
    if (cleaned) return cleaned;
    const e = (email || '').trim();
    if (!e) return 'Unknown Resident';
    const local = e.split('@')[0];
    const parts = local.replace(/\.+|_+|-+/g, ' ').split(' ').filter(Boolean);
    if (parts.length === 0) return e;
    const cased = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return cased || e;
  };

  const resolvePersonName = (
    person?: CollectionData['customer'],
    fallbackLabel: string = 'Unknown'
  ) => {
    if (!person) return fallbackLabel;
    const email = (person.email || '').trim();
    if (email && fullNameByEmail[email]) {
      return fullNameByEmail[email];
    }
    const first = (person.first_name || '').toString().trim();
    const last = (person.last_name || '').toString().trim();
    if (first || last) {
      return [first, last].filter(Boolean).join(' ');
    }
    return getDisplayName(person.full_name, person.email) || fallbackLabel;
  };

  // Initialize rows when collections data is available
  useEffect(() => {
    if (collections && collections.length >= 0) {
      setRows(collections);
    }
  }, [collections]);

  // Force re-initialization on mount
  useEffect(() => {
    console.log('📦 CollectionsContent: Component mounted, loading:', loading, 'collections:', collections?.length || 0);
    if (collections) {
      setRows(collections);
    }
  }, []);

  // Listen for refresh events (same as Withdrawals page)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Collections: Refresh event received, reloading...');
      reloadCollections();
    };
    
    window.addEventListener('app:refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('app:refresh', handleRefresh);
    };
  }, []);

  // Subscribe to real-time collections changes (same as Withdrawals page)
  useEffect(() => {
    let subscription: any = null;
    let isMounted = true;
    
    // Dynamic import to avoid circular dependencies
    import('../../src/lib/admin-services').then(({ subscribeToPickups }) => {
      if (!isMounted) return;
      
      subscription = subscribeToPickups((payload: any) => {
        console.log('🔔 Collections: Real-time update received:', payload);
        if (payload.eventType === 'INSERT') {
          console.log('➕ New collection inserted:', payload.new);
          reloadCollections();
        } else if (payload.eventType === 'UPDATE') {
          console.log('🔄 Collection updated:', payload.new);
          // Update the specific row if it exists
          setRows(prev => {
            const exists = prev.some(c => c.id === payload.new?.id);
            if (exists) {
              return prev.map(c => c.id === payload.new?.id ? { ...c, ...payload.new } : c);
            }
            // If not in list, reload all to get fresh data
            reloadCollections();
            return prev;
          });
        } else if (payload.eventType === 'DELETE') {
          console.log('🗑️ Collection deleted:', payload.old);
          setRows(prev => prev.filter(c => c.id !== payload.old?.id));
        }
      });
    }).catch((err) => {
      console.error('❌ Collections: Error setting up real-time subscription:', err);
    });
    
    // Return cleanup function
    return () => {
      isMounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Backfill resident and collector names by email if missing
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const emails = Array.from(new Set(
          (rows || [])
            .flatMap((r: any) => [r.customer?.email, r.collector?.email])
            .map(e => (e || '').trim())
            .filter(Boolean)
        ));
        const missing = emails.filter(e => !fullNameByEmail[e]);
        if (missing.length === 0) return;

        const map: Record<string, string> = { ...fullNameByEmail };

        const { data: usersData } = await supabase
          .from('users')
          .select('email, full_name, first_name, last_name')
          .in('email', missing);
        (usersData || []).forEach((u: any) => {
          const first = (u.first_name || '').toString().trim();
          const last = (u.last_name || '').toString().trim();
          const nameFromParts = `${first} ${last}`.trim();
          const fallbackFull = (u.full_name && String(u.full_name).trim()) || '';
          const v = nameFromParts || fallbackFull;
          if (u.email && v) map[String(u.email)] = v;
        });

        const stillMissing = missing.filter(e => !map[e]);
        if (stillMissing.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .in('email', stillMissing);
          (profilesData || []).forEach((p: any) => {
            if (p.email && p.full_name) map[String(p.email)] = String(p.full_name).trim();
          });
        }

        if (Object.keys(map).length !== Object.keys(fullNameByEmail).length) {
          setFullNameByEmail(map);
        }
      } catch (e) {
        // ignore lookup errors
      }
    };
    fetchNames();
  }, [rows, fullNameByEmail]);

  // (Removed approver backfill per request)

  const handleUpdate = async (collectionId: string, newStatus: string) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm(`Are you sure you want to mark this collection as ${newStatus}?`) : true;
    if (!confirmed) return;
    try {
      // Optimistic update
      setRows(prev => prev.map(c => c.id === collectionId ? { ...c, status: newStatus as 'pending' | 'submitted' | 'approved' | 'rejected' } : c));
      const { data, error } = await UnifiedAdminService.updateCollectionStatus(collectionId, newStatus);
      if (error || !data) {
        console.error('Error updating collection status:', error);
        // Revert on error
        setRows(prev => prev.map(c => c.id === collectionId ? { ...c, status: (collections.find(x => x.id === collectionId)?.status || c.status) } : c));
        setNotice({ type: 'error', message: 'Failed to update status.' });
        return;
      }
      // Ensure row reflects server response
      setRows(prev => prev.map(c => c.id === collectionId ? { ...c, status: data.status, notes: data.notes } as any : c));
      setNotice({ type: 'success', message: `Status updated to ${data.status}.` });
    } catch (e) {
      console.error('Exception updating collection status:', e);
      // Revert on exception
      setRows(prev => prev.map(c => c.id === collectionId ? { ...c, status: (collections.find(x => x.id === collectionId)?.status || c.status) } : c));
      setNotice({ type: 'error', message: 'Failed to update status.' });
    }
  };

  const openDetails = async (collectionId: string) => {
    try {
      setSelectedId(collectionId);
      setDetailsLoading(true);
      setDetails(null);

      // Fetch collection base data (prefer unified_collections)
      let base = await supabase
        .from('unified_collections')
        .select('*')
        .eq('id', collectionId)
        .maybeSingle();
      if (base.error || !base.data) {
        base = await supabase
          .from('collections')
          .select('*')
          .eq('id', collectionId)
          .maybeSingle();
      }

      // Fetch materials with names
      const { data: items } = await supabase
        .from('collection_materials')
        .select('id, quantity, unit_price, material:materials(name)')
        .eq('collection_id', collectionId);

      // Fetch photos
      const { data: photos } = await supabase
        .from('collection_photos')
        .select('*')
        .eq('collection_id', collectionId)
        .order('uploaded_at', { ascending: false });

      // Normalize photo URLs and provide storage fallback if table has no entries
      const resolvedPhotos: any[] = [];
      const photoRows = Array.isArray(photos) ? photos : [];

      // 1) Normalize any stored paths to public URLs
      for (const ph of photoRows) {
        const raw = String(ph?.photo_url || '');
        if (raw.startsWith('http')) {
          resolvedPhotos.push(ph);
        } else if (raw) {
          try {
            const { data: pub } = supabase.storage
              .from('collection-photos')
              .getPublicUrl(raw);
            resolvedPhotos.push({ ...ph, photo_url: pub.publicUrl });
          } catch {
            resolvedPhotos.push(ph);
          }
        }
      }

      // 2) Fallback: if nothing in table, try listing storage by prefix `${collectionId}/`
      if (resolvedPhotos.length === 0) {
        try {
          const { data: files, error: listErr } = await supabase.storage
            .from('collection-photos')
            .list(`${collectionId}`, { limit: 100 });
          if (!listErr && Array.isArray(files)) {
            for (const f of files) {
              const path = `${collectionId}/${f.name}`;
              const { data: pub } = supabase.storage
                .from('collection-photos')
                .getPublicUrl(path);
              resolvedPhotos.push({ id: path, collection_id: collectionId, photo_url: pub.publicUrl, photo_type: 'general' });
            }
          }
        } catch {}
      }

      setDetails({ base: base.data, items: items || [], photos: resolvedPhotos });
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to load collection details.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDelete = async (collectionId: string) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm('Move this collection to deleted transactions? This will hide it from Main App and Office views, but it can be restored later.') : true;
    if (!confirmed) return;
    
    console.log('🗑️ Starting soft delete for collection:', collectionId);
    
    try {
      // Optimistic remove
      const prevRows = rows;
      setRows(prev => prev.filter(c => c.id !== collectionId));
      
      console.log('🔄 Calling softDeleteCollection...');
      const result = await softDeleteCollection(collectionId, 'Deleted by super admin from Collections page');
      
      if (result.success) {
        console.log('✅ Collection soft deleted successfully');
        setNotice({ type: 'success', message: 'Collection moved to deleted transactions successfully.' });
        try { 
          clearPickupsCache(); 
          console.log('✅ Pickups cache cleared');
        } catch (cacheError) {
          console.warn('⚠️ Failed to clear pickups cache:', cacheError);
        }
        
        // Refresh the page to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('❌ softDeleteCollection failed:', result.message);
        setRows(prevRows);
        setNotice({ type: 'error', message: `Failed to delete collection: ${result.message}` });
      }
    } catch (e) {
      console.error('❌ Exception in handleDelete:', e);
      setNotice({ type: 'error', message: `Failed to delete collection: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }
  };

  const handleResetTransactions = (collection: any) => {
    setSelectedCollectionForReset({
      id: collection.id,
      name: `${resolvePersonName(collection.customer, 'Unknown Resident')} - ${collection.weight_kg || 0}kg`
    });
    setResetDialogOpen(true);
  };

  const handleResetSuccess = () => {
    setNotice({ type: 'success', message: 'Transactions reset successfully. Collection status updated.' });
    // Refresh the collections data
    window.location.reload(); // Simple refresh for now
  };

  const closeDetails = () => {
    setSelectedId(null);
    setDetails(null);
    setDetailsLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Collections Management</h1>
            <p className="text-gray-600 text-sm">Manage and track material collections from residents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Collections</div>
              <div className="text-xl font-bold text-blue-600">{rows.length}</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading collections...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>Error loading collections: {error.message || 'Failed to load collections'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {notice && (
              <div className={`px-4 py-3 rounded-lg border ${notice.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{notice.message}</span>
                  <button className="text-xs underline hover:no-underline" onClick={() => setNotice(null)}>Dismiss</button>
                </div>
              </div>
            )}
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-900">Total Collections</CardTitle>
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {rows.length.toLocaleString()}
                  </div>
                  <p className="text-sm text-blue-700 font-medium">
                    All time collections
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-yellow-900">Pending</CardTitle>
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {rows.filter(c => c.status === 'pending' || c.status === 'submitted').length.toLocaleString()}
                  </div>
                  <p className="text-sm text-yellow-700 font-medium">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-green-900">Approved</CardTitle>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {rows.filter(c => c.status === 'approved').length.toLocaleString()}
                  </div>
                  <p className="text-sm text-green-700 font-medium">
                    Successfully processed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-red-900">Rejected</CardTitle>
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <X className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {rows.filter(c => c.status === 'rejected').length.toLocaleString()}
                  </div>
                  <p className="text-sm text-red-700 font-medium">
                    Declined requests
                  </p>
                </CardContent>
              </Card>
            </div>
          
            {/* Collections Table */}
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      All Collections ({rows.length})
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Complete list of material collections from residents</p>
                  </div>
                  <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                    <Package className="w-4 h-4 mr-2" />
                    {rows.length} Collections
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collector</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (C/kg)</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value (C)</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rows.map((collection) => (
                        <tr key={collection.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                title={collection.id}
                                className="text-sm font-medium text-gray-900"
                              >
                                {collection.id.substring(0, 8)}...
                              </span>
                              <button
                                type="button"
                                title="Copy full Collection ID"
                                aria-label="Copy full Collection ID"
                                className="text-gray-500 hover:text-gray-700"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(collection.id);
                                    setNotice({ type: 'success', message: 'Collection ID copied to clipboard.' });
                                  } catch (e) {
                                    setNotice({ type: 'error', message: 'Failed to copy Collection ID.' });
                                  }
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                  <Users className="h-5 w-5 text-white" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">
                                  {resolvePersonName(collection.customer, 'Unknown Resident')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                                  <Package className="h-5 w-5 text-white" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">
                                  {resolvePersonName(collection.collector, 'Unassigned')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                                <Package className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {collection.material_type || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                                <TrendingUp className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {collection.weight_kg || 0} kg
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              C{collection.material_rate_per_kg?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600">
                              C{collection.computed_value?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                              collection.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                              collection.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                              'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                            }`}>
                              {collection.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              {new Date(collection.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {(collection.status === 'pending' || collection.status === 'submitted') && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                    onClick={() => handleUpdate(collection.id, 'approved')}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => handleUpdate(collection.id, 'rejected')}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => openDetails(collection.id)}
                              >
                                <Activity className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {collection.status === 'approved' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                  onClick={() => handleResetTransactions(collection)}
                                  title="Reset transactions for this collection"
                                >
                                  <Settings className="w-4 h-4 mr-1" />
                                  Reset
                                </Button>
                              )}
                              {isSuperAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(collection.id)}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
        )}
        
        {/* Details Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeDetails} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 text-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Collection Details</h3>
              <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">Loading…</div>
              ) : !details ? (
                <div className="text-center py-8 text-red-600">Failed to load details.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-800">Collection ID</div>
                      <div className="font-medium break-all">{details.base?.id}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Status</div>
                      <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {details.base?.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">Customer</div>
                      <div className="font-medium">{details.base?.customer_name || details.base?.user_id || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Collector</div>
                      <div className="font-medium">{details.base?.collector_name || details.base?.collector_id || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Created</div>
                      <div className="font-medium">{details.base?.created_at ? new Date(details.base.created_at).toLocaleString() : '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Total Weight (kg)</div>
                      <div className="font-medium">{details.base?.total_weight_kg ?? details.base?.weight_kg ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Total Credits (C)</div>
                      <div className="font-medium">{Number(details.base?.total_value ?? details.base?.computed_value ?? 0).toFixed(2)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Materials</div>
                    {details.items?.length === 0 ? (
                      <div className="text-sm text-gray-500">No materials recorded.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-800">
                              <th className="py-2 pr-4">Material</th>
                              <th className="py-2 pr-4">Quantity (kg)</th>
                              <th className="py-2 pr-4">Unit Price</th>
                              <th className="py-2">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.items.map((it: any) => (
                              <tr key={it.id} className="border-t">
                                <td className="py-2 pr-4">{it.material?.name || '—'}</td>
                                <td className="py-2 pr-4">{Number(it.quantity || 0).toFixed(2)}</td>
                                <td className="py-2 pr-4">{Number(it.unit_price || 0).toFixed(2)}</td>
                                <td className="py-2">{(Number(it.quantity || 0) * Number(it.unit_price || 0)).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Photos</div>
                    {details.photos?.length === 0 ? (
                      <div className="text-sm text-gray-500">No photos uploaded.</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {details.photos.map((ph: any) => (
                          <a key={ph.id} href={ph.photo_url} target="_blank" rel="noreferrer" className="block">
                            <img src={ph.photo_url} alt={ph.photo_type || 'photo'} className="w-full h-24 object-cover rounded" />
                            <div className="text-xs text-gray-500 mt-1">{ph.photo_type || 'photo'}</div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={closeDetails} className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Transactions Dialog */}
      {selectedCollectionForReset && (
        <ResetTransactionsDialog
          isOpen={resetDialogOpen}
          onClose={() => {
            setResetDialogOpen(false);
            setSelectedCollectionForReset(null);
          }}
          collectionId={selectedCollectionForReset.id}
          collectionName={selectedCollectionForReset.name}
          onSuccess={handleResetSuccess}
        />
      )}
      </div>
    </div>
  );
}

function PickupsContent() {
  return <PickupsPage />;
}

function AnalyticsContent() {
  return <AnalyticsPage />;
}

function ConfigContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">System Configuration</h1>
            <p className="text-gray-600">Manage system settings and configurations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">System Status</p>
                  <p className="text-2xl font-bold">Online</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Database</p>
                  <p className="text-2xl font-bold">Connected</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">API Status</p>
                  <p className="text-2xl font-bold">Active</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Uptime</p>
                  <p className="text-2xl font-bold">99.9%</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Sections */}
        <div className="space-y-6">
          <NotificationSettings />
          
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Additional Configuration</h3>
                  <p className="text-gray-100 text-sm">System settings and preferences</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                Additional system configuration options will be implemented here
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, logout } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);
  const [softReason, setSoftReason] = useState('Tea Break');
  const { notifications, removeNotification } = useNotifications();
  const { lock, lockImmediate, touch, setup, needsSetup, isLocked } = usePwaLock(15);
  const prevPageRef = useRef<string>('dashboard');
  const isFirstMountRef = useRef<boolean>(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  
  // Refresh/reconnect when any sidebar page is clicked (non-blocking)
  useEffect(() => {
    // Skip initial mount
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevPageRef.current = currentPage;
      return;
    }
    
    // Only refresh if page actually changed
    if (prevPageRef.current !== currentPage) {
      console.log('🔄 Sidebar page navigation - triggering refresh/reconnect...', { from: prevPageRef.current, to: currentPage });
      
      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Prevent multiple simultaneous refreshes
      if (isRefreshingRef.current) {
        console.log('⏸️ Refresh already in progress, skipping...');
        prevPageRef.current = currentPage;
        return;
      }
      
      // Debounce refresh to prevent UI blocking (100ms delay)
      refreshTimeoutRef.current = setTimeout(() => {
        isRefreshingRef.current = true;
        
        // Non-blocking refresh (NO aggressive reconnection to prevent loops)
        const performRefresh = () => {
          try {
            // 1. Ensure keepalive is running (synchronous, fast)
            if (!keepAliveManager.getActive()) {
              console.log('🔄 Starting keepalive manager...');
              keepAliveManager.start();
            }
            
            // 2. Dispatch refresh events immediately (non-blocking)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('app:refresh'));
              
              // If Dashboard button was clicked, also trigger dashboard refresh
              if (currentPage === 'dashboard') {
                window.dispatchEvent(new CustomEvent('dashboard-refresh-requested'));
              }
            }
            
            // 3. Refresh auth session in background (non-blocking, don't await)
            // Only refresh if session is about to expire (not on every page change)
            supabase.auth.getSession().then(({ data: { session }, error }) => {
              if (session && !error) {
                // Only refresh if session expires in less than 2 minutes
                const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
                const timeUntilExpiry = expiresAt - Date.now();
                if (timeUntilExpiry < 2 * 60 * 1000) {
                  supabase.auth.refreshSession().then(() => {
                    console.log('✅ Auth session refreshed');
                  }).catch((authErr) => {
                    console.warn('⚠️ Auth refresh error:', authErr);
                  });
                }
              }
            }).catch(console.warn);
            
            // 4. DON'T force reconnect realtime - let it manage itself
            // Only reconnect if we detect it's actually disconnected
            // realtimeManager.reconnectNow(); // REMOVED - causes reconnection loops
            
            // 5. DON'T ping database on every page change - too aggressive
            // Database pings are handled by keepalive manager
            
          } catch (err) {
            console.error('❌ Refresh error:', err);
          } finally {
            // Reset refreshing flag after a short delay
            setTimeout(() => {
              isRefreshingRef.current = false;
            }, 500);
          }
        };
        
        // Execute refresh (non-blocking)
        performRefresh();
      }, 100); // 100ms debounce
    }
    
    // Update previous page reference immediately
    prevPageRef.current = currentPage;
  }, [currentPage]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsClient(true);
    console.log('AdminDashboardClient: isClient set to true');
    
    // Ensure keepalive is running on mount
    if (typeof window !== 'undefined') {
      if (!keepAliveManager.getActive()) {
        console.log('🔄 Starting keepalive manager on mount...');
        keepAliveManager.start();
      }
    }
  }, []);
  
  // Periodic connection health check (every 30 seconds)
  useEffect(() => {
    if (!user?.id) return;
    
    const healthCheckInterval = setInterval(async () => {
      try {
        // Quick ping to verify connection
        await supabase.from('users').select('id').limit(1).single();
      } catch (err: any) {
        if (err.code !== 'PGRST116') {
          console.warn('⚠️ Health check failed, reconnecting...', err.code);
          realtimeManager.reconnectNow();
          
          // Refresh auth session
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              supabase.auth.refreshSession().catch(console.warn);
            }
          });
        }
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(healthCheckInterval);
  }, [user?.id]);

  // Check if user needs to set up session lock credentials
  useEffect(() => {
    if (!user || !isClient) return;
    
    // Check current pathname to avoid redirect loop
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    // Don't redirect if we're already on the lock page (prevents redirect loop)
    if (currentPath === '/admin/lock') {
      return;
    }
    
    // Only redirect to lock screen if the session is actually locked (user was idle)
    // Don't redirect on initial login - only redirect if explicitly locked
    // needsSetup should not force redirect on first load - let user access dashboard first
    if (isLocked) {
      router.replace('/admin/lock');
    }
    // Note: needsSetup is handled separately - user can set up PIN later via settings
  }, [user, isClient, isLocked, router]);



  // Check authentication and admin/super_admin role
  useEffect(() => {
    if (!isClient || authLoading) return;
    const email = user?.email?.toLowerCase?.() || '';
    const role = profile?.role?.toLowerCase?.();
    const isPrivileged = isAdminUser(user, profile);
    if (!user || !isPrivileged) {
      console.log('AdminDashboardClient: User not authenticated or not privileged, redirecting to login');
      router.push('/admin-login');
    }
  }, [isClient, user, profile, authLoading, router]);

  const handleLogout = async () => {
    try {
      console.log('🚪 AdminDashboardClient: Starting logout process...');
      await logout();
      console.log('✅ AdminDashboardClient: Logout successful, redirecting to admin-login');
      router.push('/admin-login');
    } catch (error) {
      console.error('❌ AdminDashboardClient: Logout error:', error);
      // Still redirect even if logout fails
      router.push('/admin-login');
    }
  };

  // Use the existing PWA lock system
  const handleSessionLock = () => {
    lock();
  };


  // Show loading state during SSR or initial load.
  // If a user is already present, don't block on authLoading to avoid a stuck spinner.
  if (!isClient || (authLoading && !user)) {
    console.log('AdminDashboardClient: Showing loading state', { isClient, authLoading });
    
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Admin Dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Initializing...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated and has admin/super_admin role
  const isPrivileged = isAdminUser(user, profile);
  if (!user || !isPrivileged) {
    console.log('AdminDashboardClient: Access denied, redirecting to login');
    return null;
  }

  // Check if user is super admin
  const isSuperAdmin = user?.email?.toLowerCase() === 'superadmin@wozamali.co.za';

  console.log('AdminDashboardClient: Rendering dashboard for admin user:', profile?.email || user?.email);
  console.log('AdminDashboardClient: Is super admin:', isSuperAdmin);

  // Render page content based on current page
  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent 
          onPageChange={setCurrentPage} 
          onAddUser={() => setShowAddUserModal(true)} 
          isSuperAdmin={isSuperAdmin} 
          softOpen={softOpen} 
          setSoftOpen={setSoftOpen} 
          softReason={softReason} 
          setSoftReason={setSoftReason}
        />;
      case 'users':
        return <UsersContent />;
      case 'admin-activity':
        return <AdminActivityContent />;
      case 'settings':
        return <AdminSettingsPage />;
      case 'team-members':
        return <TeamMembersPage />;
      case 'withdrawals':
        return <WithdrawalsContent />;
      case 'rewards':
        return <RewardsContent />;
      case 'tiers':
        return <TiersContent />;
      case 'beneficiaries':
        return <BeneficiariesPage />;
      case 'green-scholar':
        return <AdminGreenScholarFund />;
      case 'collections':
        return <CollectionsContent key="collections" />;
      case 'pickups':
        return <PickupsContent />;
      case 'transactions':
        return <TransactionsPage />;
      case 'analytics':
        return <AnalyticsContent />;
      case 'config':
        return <ConfigContent />;
      default:
        return <DashboardContent onPageChange={setCurrentPage} onAddUser={() => setShowAddUserModal(true)} isSuperAdmin={isSuperAdmin} softOpen={softOpen} setSoftOpen={setSoftOpen} softReason={softReason} setSoftReason={setSoftReason} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <AdminSidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
      />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Welcome, {profile?.full_name || user?.email?.split('@')[0] || 'Admin'}!
                  </h3>
                  <p className="text-sm text-gray-600">Manage your system efficiently</p>
                </div>
                <RealtimeStatusDot className="scale-125" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <Button
                  onClick={() => setCurrentPage('admin-activity')}
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
            {renderPageContent()}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={() => {
          // Refresh dashboard data when a new user is created
          // loadDashboardData();
          // loadRecentActivity();
        }}
      />


      {/* PWA Lock System - Setup only (unlock handled on /admin/lock) */}
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
                // After setup, keep session locked; user will be redirected to /admin/lock by layout
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

      {/* Notification Toasts */}
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          type={(notification.type === 'system' || notification.type === 'error') ? 'collection' : notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}
