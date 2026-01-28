import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Cache for 20 seconds
export const revalidate = 20;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          schools: [],
          homes: [],
          requests: [],
          applications: [],
          error: 'Supabase admin client is not configured on the server',
        },
        { status: 200 }
      );
    }

    // Query all beneficiary data in parallel - OPTIMIZED
    const queries = [
      supabaseAdmin.from('schools').select('*').order('school_name').limit(500),
      supabaseAdmin.from('child_headed_homes').select('*').order('name').limit(500),
      supabaseAdmin.from('green_scholar_requests').select('*').order('created_at', { ascending: false }).limit(500),
      supabaseAdmin.from('green_scholar_applications').select('*').order('created_at', { ascending: false }).limit(500)
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
        schools: [],
        homes: [],
        requests: [],
        applications: [],
        error: 'Query timeout'
      }, { status: 200 });
    }

    const schools = results[0].status === 'fulfilled' && !results[0].value.error
      ? (results[0].value.data || [])
      : [];
    
    const homes = results[1].status === 'fulfilled' && !results[1].value.error
      ? (results[1].value.data || [])
      : [];
    
    const requests = results[2].status === 'fulfilled' && !results[2].value.error
      ? (results[2].value.data || [])
      : [];
    
    const applications = results[3].status === 'fulfilled' && !results[3].value.error
      ? (results[3].value.data || [])
      : [];

    return NextResponse.json({
      schools,
      homes,
      requests,
      applications,
      count: schools.length + homes.length + requests.length + applications.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        schools: [],
        homes: [],
        requests: [],
        applications: [],
        error: error?.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}

