import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Cache for 30 seconds (analytics data changes less frequently)
export const revalidate = 30;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          systemImpact: null,
          materialPerformance: [],
          collectorPerformance: [],
          customerPerformance: [],
          activeUsersCount: 0,
          error: 'Supabase admin client is not configured on the server',
        },
        { status: 200 }
      );
    }

    // Query all analytics data in parallel - OPTIMIZED
    const queries = [
      supabaseAdmin.from('system_impact_view').select('*').maybeSingle(),
      supabaseAdmin.from('material_performance_view').select('*').limit(100),
      supabaseAdmin.from('collector_performance_view').select('*').limit(100),
      supabaseAdmin.from('customer_performance_view').select('*').limit(100),
      supabaseAdmin.from('users').select('id').eq('status', 'active').limit(1)
    ];

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );

    let results;
    try {
      results = await Promise.race([
        Promise.allSettled(queries),
        timeoutPromise
      ]) as PromiseSettledResult<any>[];
    } catch (timeoutErr: any) {
      return NextResponse.json({
        systemImpact: null,
        materialPerformance: [],
        collectorPerformance: [],
        customerPerformance: [],
        activeUsersCount: 0,
        error: 'Query timeout'
      }, { status: 200 });
    }

    const systemImpact = results[0].status === 'fulfilled' && !results[0].value.error
      ? results[0].value.data
      : null;
    
    const materialPerformance = results[1].status === 'fulfilled' && !results[1].value.error
      ? (results[1].value.data || [])
      : [];
    
    const collectorPerformance = results[2].status === 'fulfilled' && !results[2].value.error
      ? (results[2].value.data || [])
      : [];
    
    const customerPerformance = results[3].status === 'fulfilled' && !results[3].value.error
      ? (results[3].value.data || [])
      : [];

    // Get active users count
    let activeUsersCount = 0;
    if (results[4].status === 'fulfilled' && !results[4].value.error) {
      const countResult = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      activeUsersCount = countResult.count || 0;
    }

    return NextResponse.json({
      systemImpact,
      materialPerformance,
      collectorPerformance,
      customerPerformance,
      activeUsersCount
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        systemImpact: null,
        materialPerformance: [],
        collectorPerformance: [],
        customerPerformance: [],
        activeUsersCount: 0,
        error: error?.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}

