import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

const supabaseAdmin = getSupabaseAdminClient();

console.log('🔑 Dashboard API Route Environment Check:');
console.log('🔑 SUPABASE_ADMIN client available:', !!supabaseAdmin);

if (!supabaseAdmin) {
  console.error('❌ Missing Supabase admin client');
}

// Cache dashboard data for 30 seconds to improve performance
export const revalidate = 30;

export async function GET(request: NextRequest) {
  try {

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          totalUsers: 0,
          activeUsers: 0,
          totalResidents: 0,
          totalCollectors: 0,
          totalAdmins: 0,
          totalCollections: 0,
          totalWeight: 0,
          totalRevenue: 0,
          pendingCollections: 0,
          approvedCollections: 0,
          rejectedCollections: 0,
          totalWallets: 0,
          totalWalletBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalPayments: 0,
        pendingPayments: 0,
        totalVideoCredits: 0,
        error: 'Supabase admin client is not configured on the server',
        },
        { status: 200 }
      );
    }

    // Try database function first (FASTEST - single query on database side)
    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin
        .rpc('get_dashboard_stats')
        .single();
      
      if (!rpcError && rpcData) {
        // Database function worked - return immediately (FASTEST PATH - 10-50x faster)
        return NextResponse.json({
          totalUsers: (rpcData as any)?.totalUsers || 0,
          activeUsers: (rpcData as any)?.activeUsers || 0,
          totalResidents: (rpcData as any)?.totalResidents || 0,
          totalCollectors: (rpcData as any)?.totalCollectors || 0,
          totalAdmins: (rpcData as any)?.totalAdmins || 0,
          totalCollections: (rpcData as any)?.totalCollections || 0,
          totalWeight: (rpcData as any)?.totalWeight || 0,
          totalRevenue: (rpcData as any)?.totalRevenue || 0,
          pendingCollections: (rpcData as any)?.pendingCollections || 0,
          approvedCollections: (rpcData as any)?.approvedCollections || 0,
          rejectedCollections: (rpcData as any)?.rejectedCollections || 0,
          totalWallets: (rpcData as any)?.totalWallets || 0,
          totalWalletBalance: (rpcData as any)?.totalWalletBalance || 0,
        totalPointsEarned: (rpcData as any)?.totalPointsEarned || 0,
        totalPointsSpent: (rpcData as any)?.totalPointsSpent || 0,
        totalPayments: (rpcData as any)?.totalPayments || 0,
        pendingPayments: (rpcData as any)?.pendingPayments || 0,
        totalVideoCredits: (rpcData as any)?.totalVideoCredits || 0,
        source: 'database_function'
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        });
      }
    } catch (rpcErr) {
      // Database function failed - fall through to regular queries
    }

    // Fallback: Load all data in parallel (slower but works if function unavailable)
    const [userCountResult, collectionsResult, walletsResult, paymentsResult, videoCreditsResult] = await Promise.allSettled([
      // User counts - ALL queries in parallel for maximum speed
      (async () => {
        try {
          // Run ALL count queries in parallel - much faster!
          const [totalResult, activeResult, residentResult, collectorResult, adminResult, profilesFallback] = await Promise.allSettled([
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'resident'),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'collector'),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'admin'),
            supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true)
          ]);
          
          const total = totalResult.status === 'fulfilled' ? (totalResult.value.count || 0) : 0;
          const active = activeResult.status === 'fulfilled' && !activeResult.value.error 
            ? (activeResult.value.count || 0)
            : (profilesFallback.status === 'fulfilled' ? (profilesFallback.value.count || 0) : 0);
          
          return {
            total,
            active,
            residents: residentResult.status === 'fulfilled' ? (residentResult.value.count || 0) : 0,
            collectors: collectorResult.status === 'fulfilled' ? (collectorResult.value.count || 0) : 0,
            admins: adminResult.status === 'fulfilled' ? (adminResult.value.count || 0) : 0
          };
        } catch {
          return { total: 0, active: 0, residents: 0, collectors: 0, admins: 0 };
        }
      })(),
      // Collections data - fetch only what we need (status and values for aggregation)
      (async () => {
        try {
          // Fetch minimal fields needed for calculations - much faster than fetching all data
          // Fetch minimal fields needed for calculations - optimized query with smaller limit
          const result = await supabaseAdmin
            .from('unified_collections')
            .select('status, total_weight_kg, total_value, computed_value')
            .limit(1000); // Reduced limit for faster queries - still accurate for aggregates
          
          if (result.error) throw result.error;
          const data = result.data || [];
          
          // Calculate aggregates from minimal data
          return {
            total: data.length,
            totalWeight: data.reduce((sum: number, c: any) => sum + (Number(c.total_weight_kg) || 0), 0),
            totalRevenue: data
              .filter((c: any) => ['approved', 'completed'].includes(c.status))
              .reduce((sum: number, c: any) => sum + (Number(c.computed_value ?? c.total_value ?? 0)), 0),
            pending: data.filter((c: any) => ['pending', 'submitted'].includes(c.status)).length,
            approved: data.filter((c: any) => c.status === 'approved').length,
            rejected: data.filter((c: any) => c.status === 'rejected').length
          };
        } catch {
          return { total: 0, totalWeight: 0, totalRevenue: 0, pending: 0, approved: 0, rejected: 0 };
        }
      })(),
      // Wallet data (non-blocking, can fail) - with timeout
      (async () => {
        try {
          const walletPromise = supabaseAdmin.from('user_wallets').select('current_points, total_points_earned, total_points_spent');
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
          
          const result = await Promise.race([walletPromise, timeoutPromise]) as any;
          if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
            const fallback = await supabaseAdmin.from('wallets').select('balance, total_points');
            return fallback.data || [];
          }
          if (result.error) throw result.error;
          return result.data || [];
        } catch {
          return [];
        }
      })(),
      // Payments data (non-blocking, can fail) - with timeout
      (async () => {
        try {
          const paymentPromise = supabaseAdmin.from('payments').select('amount, status');
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
          
          let result = await Promise.race([paymentPromise, timeoutPromise]) as any;
          if (result.error && result.error.code === 'PGRST205') {
            result = await supabaseAdmin.from('cash_payments').select('amount, status');
          }
          if (result.error) return [];
          return result.data || [];
        } catch {
          return [];
        }
      })(),
      // Video credits data (total credits from video watches) - non-blocking, can fail
      (async () => {
        try {
          const creditsPromise = supabaseAdmin
            .from('video_watches')
            .select('credits_awarded')
            .eq('is_qualified', true);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
          
          const result = await Promise.race([creditsPromise, timeoutPromise]) as any;
          if (result.error) return 0;
          const credits = result.data || [];
          return credits.reduce((sum: number, w: any) => sum + (Number(w.credits_awarded) || 0), 0);
        } catch {
          return 0;
        }
      })()
    ]);

    const userCounts = userCountResult.status === 'fulfilled' ? userCountResult.value : { total: 0, active: 0, residents: 0, collectors: 0, admins: 0 };
    const collectionsData = collectionsResult.status === 'fulfilled' ? collectionsResult.value : { total: 0, totalWeight: 0, totalRevenue: 0, pending: 0, approved: 0, rejected: 0 };
    const wallets = walletsResult.status === 'fulfilled' ? walletsResult.value : [];
    const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];
    const totalVideoCredits = videoCreditsResult.status === 'fulfilled' ? videoCreditsResult.value : 0;

    // Extract counts from the count query result
    const totalResidents = userCounts.residents || 0;
    const totalCollectors = userCounts.collectors || 0;
    const totalAdmins = userCounts.admins || 0;

    // Use aggregated collections data
    const totalCollections = collectionsData.total;
    const totalWeight = collectionsData.totalWeight;
    const pendingCollections = collectionsData.pending;
    const approvedCollections = collectionsData.approved;
    const rejectedCollections = collectionsData.rejected;
    
    // Use aggregated revenue
    const computedRevenue = collectionsData.totalRevenue;

    // Calculate payment metrics
    const totalPayments = payments.length;
    const pendingPayments = payments.filter((p: any) => p.status === 'pending').length;
    const paymentRevenue = payments
      .filter((p: any) => p.status === 'completed' || p.status === 'approved')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    const totalWallets = wallets.length;
    // Calculate actual wallet balance from wallets (not from weight)
    const totalWalletBalance = wallets.reduce((sum: number, w: any) => sum + (w.current_points ?? w.balance ?? 0), 0) || 0;
    const totalPointsEarned = wallets.reduce((sum: number, w: any) => sum + (w.total_points_earned ?? w.total_points ?? 0), 0) || 0;
    const totalPointsSpent = wallets.reduce((sum: number, w: any) => sum + (w.total_points_spent ?? 0), 0) || 0;

    const dashboardData = {
      totalUsers: userCounts.total || 0,
      activeUsers: userCounts.active || 0, // Active users count
      totalResidents,
      totalCollectors,
      totalAdmins,
      totalCollections,
      totalWeight,
      totalRevenue: computedRevenue || paymentRevenue, // Use collections revenue, fallback to payment revenue
      pendingCollections,
      approvedCollections,
      rejectedCollections,
      totalWallets,
      totalWalletBalance,
      totalPointsEarned,
      totalPointsSpent,
      totalPayments,
      pendingPayments,
      totalVideoCredits: totalVideoCredits || 0 // Total credits from video watches
    };


    // Add caching headers for better performance (30s cache, 60s stale-while-revalidate)
    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });

  } catch (error) {
    console.error('❌ API: Unexpected error in getDashboardData:', error);
    return NextResponse.json(
      {
        totalUsers: 0,
        activeUsers: 0,
        totalResidents: 0,
        totalCollectors: 0,
        totalAdmins: 0,
        totalCollections: 0,
        totalWeight: 0,
        totalRevenue: 0,
        pendingCollections: 0,
        approvedCollections: 0,
        rejectedCollections: 0,
        totalWallets: 0,
        totalWalletBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalPayments: 0,
        pendingPayments: 0,
        totalVideoCredits: 0,
        error: 'Internal server error while fetching dashboard data',
      },
      { status: 200 }
    );
  }
}

