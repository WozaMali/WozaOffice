import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// No caching - admin needs immediate updates
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Helper: check admin client
function ensureSupabaseAdmin() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin client is not configured on the server' },
      { status: 500 }
    );
  }
  return null;
}

// GET - Fetch community events (optionally filtered by status and date range)
export async function GET(request: NextRequest) {
  try {
    const clientError = ensureSupabaseAdmin();
    if (clientError) return clientError;

    // TypeScript doesn't know ensureSupabaseAdmin checks this, so we assert it
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // upcoming | completed | cancelled
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    let query = supabaseAdmin
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
      {
        events: [],
        count: 0,
        error: error?.message || 'Internal server error',
      },
      { status: 200 }
    );
  }
}

// POST - Create a new community event
export async function POST(request: NextRequest) {
  try {
    const clientError = ensureSupabaseAdmin();
    if (clientError) return clientError;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      location,
      address,
      type,
      image_url,
      participants,
      rewards,
      status,
    } = body;

    if (!title || !event_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title and event_date are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('community_events')
      .insert({
        title,
        description: description || null,
        event_date,
        start_time: start_time || null,
        end_time: end_time || null,
        location: location || null,
        address: address || null,
        type: type || null,
        image_url: image_url || null,
        participants: typeof participants === 'number' ? participants : 0,
        rewards: rewards || null,
        status: status || 'upcoming',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing community event
export async function PUT(request: NextRequest) {
  try {
    const clientError = ensureSupabaseAdmin();
    if (clientError) return clientError;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('community_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ event: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a community event
export async function DELETE(request: NextRequest) {
  try {
    const clientError = ensureSupabaseAdmin();
    if (clientError) return clientError;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('community_events')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


