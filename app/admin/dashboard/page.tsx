'use client';

import { useEffect, useState, useRef, useCallback, useMemo, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Package,
  Users,
  BarChart3,
  Plus,
  TrendingUp,
  Shield,
  CreditCard,
  Calendar,
  Gift,
  Clock,
  Wallet,
  Crown,
  Settings,
  Star,
  Video,
  Eye,
  EyeOff,
} from 'lucide-react';
import { keepAliveManager } from '@/lib/keepalive-manager';
import { UnifiedAdminService, useDashboardData } from '@/lib/unified-admin-service';
import { notificationManager } from '@/lib/notificationManager';
import { useBackgroundRefresh } from '@/hooks/useBackgroundRefresh';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { getPickups } from '@/lib/admin-services';
import AddUserModal from '../AddUserModalSimple';

type RecentActivity = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp?: string;
};

// This is a simplified version - you'll need to extract the full DashboardContent component
export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);
  const [softReason, setSoftReason] = useState('Tea Break');
  const [showBlurredAmounts, setShowBlurredAmounts] = useState(true); // Default to blurred
  
  // Check if user is super admin
  const isSuperAdmin = user?.email?.toLowerCase() === 'superadmin@wozamali.co.za' || 
    profile?.role === 'superadmin' || 
    profile?.role === 'super_admin' || 
    profile?.role === 'SUPER_ADMIN';
  
  // Internal data state
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
    totalVideoCredits: 0,
    walletPermissionError: false,
    walletErrorMessage: ''
  });
  
  const [displayData, setDisplayData] = useState(() => ({ ...dashboardData, totalVideoCredits: 0 }));
  const displayUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDisplayUpdateRef = useRef<number>(0);
  const MIN_DISPLAY_UPDATE_INTERVAL = 500;
  
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const { data: unifiedDashboardData, loading: unifiedLoading, error: unifiedError } = useDashboardData();
  
  const isInitialLoadRef = useRef<boolean>(true);
  const hasLoadedUnifiedDataRef = useRef<boolean>(false);
  const unifiedDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDashboardData = useCallback((updates: Partial<typeof dashboardData>) => {
    setDashboardData(prev => {
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
      const now = Date.now();
      const timeSinceLastUpdate = now - lastDisplayUpdateRef.current;
      
      if (displayUpdateTimeoutRef.current) {
        clearTimeout(displayUpdateTimeoutRef.current);
      }
      
      if (timeSinceLastUpdate >= MIN_DISPLAY_UPDATE_INTERVAL) {
        lastDisplayUpdateRef.current = now;
        startTransition(() => {
          setDisplayData(newData);
        });
      } else {
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

  // Fetch dashboard data function - Use direct Supabase queries (Vite doesn't have API routes)
  const fetchDashboardData = useCallback(async () => {
    console.log('🔄 Dashboard: Fetching dashboard data...');
    try {
      const { UnifiedAdminService } = await import('@/lib/unified-admin-service');
      const { data, error } = await UnifiedAdminService.getDashboardData();
      
      if (error) {
        console.error('❌ Dashboard: Error fetching dashboard data:', error);
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.warn('⚠️ Dashboard: No data returned');
        setLoading(false);
        return;
      }
      
      console.log('✅ Dashboard: Data fetched successfully:', data);
      setLoading(false);
      
      startTransition(() => {
        updateDashboardData({
          totalUsers: data.totalUsers || 0,
          totalPickups: data.totalCollections || 0,
          totalWeight: data.totalWeight || 0,
          totalRevenue: data.totalRevenue || 0,
          activeUsers: data.totalUsers || 0, 
          pendingPickups: data.pendingCollections || 0,
          totalPayments: 0, 
          pendingPayments: 0, 
          totalWallets: data.totalWallets || 0,
          totalCashBalance: data.totalWalletBalance || 0,
          totalCurrentPoints: data.totalWalletBalance || 0, 
          totalPointsEarned: data.totalPointsEarned || 0,
          totalPointsSpent: data.totalPointsSpent || 0,
          totalLifetimeEarnings: data.totalPointsEarned || 0,
          totalVideoCredits: 0, 
          walletPermissionError: false,
          walletErrorMessage: ''
        });
      });
      
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        hasLoadedUnifiedDataRef.current = true;
      }
    } catch (error: any) {
      console.error('❌ Dashboard: Exception fetching dashboard data:', error);
      setLoading(false);
    }
  }, [updateDashboardData]);

  const loadRecentActivity = useCallback(async () => {
    try {
      const pickups = await getPickups();
      const recentPickups = pickups
        .filter((p: any) => p.status === 'submitted' || p.status === 'approved')
        .slice(0, 5)
        .map((p: any) => ({
          id: p.id,
          type: p.status === 'approved' ? 'pickup_approved' : 'pickup_created',
          title: p.status === 'approved' ? 'Pickup Approved' : 'New Pickup Submitted',
          description: `Collection from ${p.customer?.full_name || p.customer?.email || 'Unknown'} - ${p.total_kg || 0}kg`,
          timestamp: p.created_at || p.submitted_at
        }));
      setRecentActivity(recentPickups);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  }, []);

  // Background refresh - refreshes every 30 seconds
  const { forceRefresh, isRefreshing } = useBackgroundRefresh(
    'dashboard',
    fetchDashboardData
  );

  // Realtime subscriptions - stable array (same pattern as collections page)
  // Use refs to access latest functions without recreating subscriptions
  const fetchDashboardDataRef = useRef(fetchDashboardData);
  fetchDashboardDataRef.current = fetchDashboardData;
  
  const realtimeSubscriptions = useMemo(() => [
    {
      table: 'unified_collections',
      onUpdate: (payload: any) => {
        if (isInitialLoadRef.current) return;
        console.log('📡 Collection changed:', payload);
        fetchDashboardDataRef.current();
      },
      onInsert: (payload: any) => {
        if (isInitialLoadRef.current) return;
        console.log('📡 New collection:', payload);
        notificationManager.addNotification({
          type: 'collection',
          title: 'New Collection Submitted',
          message: `Collection from ${payload.new?.customer_name || 'Unknown'} - ${payload.new?.total_weight_kg || 0}kg`
        });
        fetchDashboardDataRef.current();
      }
    },
    {
      table: 'pickups',
      onUpdate: (payload: any) => {
        if (isInitialLoadRef.current) return;
        console.log('📡 Pickup changed:', payload);
        fetchDashboardDataRef.current();
      }
    },
    {
      table: 'users',
      onUpdate: (payload: any) => {
        if (isInitialLoadRef.current) return;
        console.log('📡 User changed:', payload);
        fetchDashboardDataRef.current();
      }
    }
  ], []); // Empty deps - subscriptions never change, use refs for callbacks

  // Realtime subscriptions - updates instantly when data changes
  // Always enabled (same pattern as collections page) - keeps connection stable
  const { isConnected } = useRealtimeConnection();

  // Initial load - use API route directly (same pattern as Collections/Pickups/Withdrawals)
  useEffect(() => {
    if (!hasLoadedUnifiedDataRef.current) {
      fetchDashboardData();
      loadRecentActivity();
    }
  }, [fetchDashboardData, loadRecentActivity]);

  // Ensure keepalive is running
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!keepAliveManager.getActive()) {
        keepAliveManager.start();
      }
    }
  }, []);

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
    totalLifetimeEarnings: displayData.totalLifetimeEarnings,
    totalVideoCredits: displayData.totalVideoCredits,
    totalVideoCreditsDisplay: `C ${displayData.totalVideoCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
    displayData.totalLifetimeEarnings,
    displayData.totalVideoCredits
  ]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={forceRefresh} 
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBlurredAmounts(!showBlurredAmounts)}
                className="flex items-center gap-2"
                aria-label={showBlurredAmounts ? "Show amounts" : "Blur amounts"}
              >
                {showBlurredAmounts ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Show Amounts</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Blur Amounts</span>
                  </>
                )}
              </Button>
            </div>
            <Button onClick={() => setShowAddUserModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
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
              <div className={`text-3xl font-bold text-blue-600 mb-1 transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
              {loading ? '...' : cardValues.totalPickups.toLocaleString()}
            </div>
              <p className={`text-sm text-blue-700 font-medium transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
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
              <div className={`text-3xl font-bold text-green-600 mb-1 transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
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
              <div className={`text-3xl font-bold text-yellow-600 mb-1 transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
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
              <div className={`text-3xl font-bold text-orange-600 mb-1 transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
              {loading ? '...' : cardValues.totalRevenueDisplay}
            </div>
              <p className="text-sm text-orange-700 font-medium">
              Generated Credits
            </p>
          </CardContent>
        </Card>
      </div>

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
              <div className={`text-3xl font-bold text-yellow-600 mb-1 transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
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
              <div className={`text-3xl font-bold text-indigo-600 mb-1 transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
              {loading ? '...' : cardValues.totalPayments}
            </div>
              <p className="text-sm text-indigo-700 font-medium">
              Processed
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-900">Video Credits</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <Video className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className={`text-3xl font-bold text-purple-600 mb-1 transition-all duration-500 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
              {loading ? '...' : cardValues.totalVideoCreditsDisplay}
            </div>
              <p className="text-sm text-purple-700 font-medium">
              Generated from Video Watches
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
                    <div className={`text-3xl font-bold text-emerald-600 mb-1 transition-all duration-300 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
                    {loading ? '...' : cardValues.totalCurrentPoints.toLocaleString()}
                  </div>
                    <p className={`text-sm text-emerald-700 font-medium transition-all duration-300 ease-in-out ${showBlurredAmounts ? 'blur-effect' : ''}`}>
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
              onClick={() => router.push('/admin/pickups')}
            >
                <Package className="mr-3 h-5 w-5" />
              Manage Pickups
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => router.push('/admin/rewards')}
            >
                <BarChart3 className="mr-3 h-5 w-5" />
              Configure Rewards
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => router.push('/admin/analytics')}
            >
                <TrendingUp className="mr-3 h-5 w-5" />
              View Reports
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => router.push('/admin/users')}
            >
                <Users className="mr-3 h-5 w-5" />
              Manage Users
            </Button>
            <Button 
                className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="lg"
              onClick={() => router.push('/admin/withdrawals')}
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
                  onClick={() => router.push('/admin/config')}
                >
                  <Settings className="mr-3 h-5 w-5" />
                  System Configuration
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  size="lg"
                  onClick={() => router.push('/admin/transactions')}
                >
                  <Wallet className="mr-3 h-5 w-5" />
                  Transaction Management
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  size="lg"
                  onClick={() => router.push('/admin/analytics')}
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
              recentActivity.map((activity: any) => (
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

      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

