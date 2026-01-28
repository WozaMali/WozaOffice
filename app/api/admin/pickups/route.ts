import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Cache for 20 seconds
export const revalidate = 20;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          pickups: [],
          count: 0,
          error: 'Supabase admin client is not configured on the server',
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    // Query unified_collections using admin client (bypasses RLS) - OPTIMIZED
    let query = supabaseAdmin
      .from('unified_collections')
      .select(`
        id,
        customer_id,
        pickup_address_id,
        total_weight_kg,
        computed_value,
        total_value,
        status,
        created_at,
        updated_at,
        customer_name,
        customer_email,
        customer_phone,
        collector_name,
        collector_email,
        collector_phone,
        pickup_address,
        suburb,
        city,
        postal_code
      `)
      .order('created_at', { ascending: false })
      .limit(300); // Reduced for speed

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Add timeout to prevent hanging
    const queryPromise = query;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    let rows, error;
    try {
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      rows = result.data || [];
      error = result.error;
    } catch (timeoutErr: any) {
      return NextResponse.json({
        pickups: [],
        count: 0,
        error: 'Query timeout'
      }, { status: 200 });
    }

    if (error) {
      return NextResponse.json({
        pickups: [],
        count: 0,
        error: error.message
      }, { status: 200 });
    }

    return NextResponse.json({
      pickups: rows || [],
      count: rows?.length || 0
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        pickups: [],
        count: 0,
        error: error?.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}
