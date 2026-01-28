import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Public-facing community events API for the main app Discover & Earn experience
// Uses anon client with RLS so only authenticated users can read, per policies.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'upcoming';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    let query = supabase
      .from('community_events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (fromDate) {
      query = query.gte('event_date', fromDate);
    }
    if (toDate) {
      query = query.lte('event_date', toDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { events: [], count: 0, error: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { events: data || [], count: (data || []).length },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { events: [], count: 0, error: error?.message || 'Internal server error' },
      { status: 200 }
    );
  }
}


