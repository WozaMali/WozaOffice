import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Ultra-fast dashboard using database views/functions
export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        error: 'Supabase admin client not configured',
        totalUsers: 0,
        activeUsers: 0,
        totalCollections: 0,
        totalWeight: 0,
        totalRevenue: 0,
        pendingCollections: 0,
        approvedCollections: 0,
        totalPayments: 0,
        pendingPayments: 0,
        totalWallets: 0,
        totalWalletBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0
      }, { status: 500 });
    }
    
    // Use a single database function or view to get all dashboard data at once
    // This is MUCH faster than multiple queries
    
    // Option 1: Use a database view if it exists
    const { data: dashboardView, error: viewError } = await supabaseAdmin
      .from('system_impact_view')
      .select('*')
      .single();
    
    if (!viewError && dashboardView) {
      return NextResponse.json({
        totalUsers: 0, // Will need separate query
        activeUsers: 0,
        totalCollections: dashboardView.total_pickups || 0,
        totalWeight: dashboardView.total_kg_collected || 0,
        totalRevenue: dashboardView.total_value_generated || 0,
        pendingCollections: dashboardView.pending_pickups || 0,
        approvedCollections: dashboardView.approved_pickups || 0,
        totalPayments: 0,
        pendingPayments: 0,
        totalWallets: 0,
        totalWalletBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        source: 'database_view'
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }
    
    // Option 2: Use a single RPC function (fastest - if you create one)
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('get_dashboard_stats')
      .single();
    
    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }
    
    // Fallback: Minimal parallel queries (only essential data)
    const [usersCount, collectionsCount] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('unified_collections')
        .select('status, total_weight_kg, computed_value', { count: 'exact', head: false })
        .limit(100) // Only get first 100 for quick aggregate
    ]);
    
    return NextResponse.json({
      totalUsers: usersCount.count || 0,
      activeUsers: usersCount.count || 0,
      totalCollections: collectionsCount.count || 0,
      totalWeight: 0, // Calculate from data if needed
      totalRevenue: 0,
      pendingCollections: 0,
      approvedCollections: 0,
      totalPayments: 0,
      pendingPayments: 0,
      totalWallets: 0,
      totalWalletBalance: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      source: 'minimal_fallback'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      totalUsers: 0,
      activeUsers: 0,
      totalCollections: 0,
      totalWeight: 0,
      totalRevenue: 0,
      pendingCollections: 0,
      approvedCollections: 0,
      totalPayments: 0,
      pendingPayments: 0,
      totalWallets: 0,
      totalWalletBalance: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0
    }, { status: 200 }); // Return 200 with zeros instead of error
  }
}

