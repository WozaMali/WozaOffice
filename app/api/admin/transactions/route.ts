import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Cache for 20 seconds
export const revalidate = 20;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          pointsTransactions: [],
          monetaryTransactions: [],
          error: 'Supabase admin client is not configured on the server',
        },
        { status: 200 }
      );
    }

    // Query both transaction types in parallel - OPTIMIZED
    const [pointsPromise, monetaryPromise] = [
      supabaseAdmin
        .from('points_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from('monetary_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
    ];

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );

    let pointsResult, monetaryResult;
    try {
      const [points, monetary] = await Promise.allSettled([
        Promise.race([pointsPromise, timeoutPromise]),
        Promise.race([monetaryPromise, timeoutPromise])
      ]);

      pointsResult = points.status === 'fulfilled' ? (points.value as any) : { data: [], error: null };
      monetaryResult = monetary.status === 'fulfilled' ? (monetary.value as any) : { data: [], error: null };
    } catch (timeoutErr: any) {
      return NextResponse.json({
        pointsTransactions: [],
        monetaryTransactions: [],
        error: 'Query timeout'
      }, { status: 200 });
    }

    const pointsTransactions = pointsResult.data || [];
    const monetaryTransactions = monetaryResult.data || [];

    return NextResponse.json({
      pointsTransactions,
      monetaryTransactions,
      count: pointsTransactions.length + monetaryTransactions.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        pointsTransactions: [],
        monetaryTransactions: [],
        error: error?.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}

