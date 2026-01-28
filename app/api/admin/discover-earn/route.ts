import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// No caching - admin needs immediate updates
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// GET - Fetch all discover & earn cards
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          cards: [],
          count: 0,
          error: 'Supabase admin client is not configured on the server',
        },
        { status: 200 }
      );
    }

    // Query cards using admin client (bypasses RLS)
    const { data: cards, error } = await supabaseAdmin
      .from('discover_earn_cards')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({
        cards: [],
        count: 0,
        error: error.message
      }, { status: 200 });
    }

    return NextResponse.json({
      cards: cards || [],
      count: (cards || []).length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        cards: [],
        count: 0,
        error: error?.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}

// POST - Create a new discover & earn card
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client is not configured on the server' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      card_type,
      display_order,
      is_active,
      image_url,
      title,
      description,
      subtitle,
      button_text,
      button_action,
      button_color,
      additional_data,
      card_width,
      card_height
    } = body;

    // Validate required fields
    if (!card_type || !image_url || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: card_type, image_url, and title are required' },
        { status: 400 }
      );
    }

    // Validate card_type
    const validCardTypes = ['monthly_challenge', 'daily_tips', 'watch_ads', 'dropoff_points', 'upcoming_events'];
    if (!validCardTypes.includes(card_type)) {
      return NextResponse.json(
        { error: `Invalid card_type. Must be one of: ${validCardTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use upsert to handle UNIQUE constraint - if card_type exists, update it; otherwise insert
    const { data, error } = await supabaseAdmin
      .from('discover_earn_cards')
      .upsert({
        card_type,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
        image_url,
        title,
        description: description || null,
        subtitle: subtitle || null,
        button_text: button_text || null,
        button_action: button_action || null,
        button_color: button_color || 'yellow',
        additional_data: additional_data || {},
        card_width: card_width || '140px',
        card_height: card_height || '140px',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'card_type'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ card: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a discover & earn card
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client is not configured on the server' },
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

    // Validate card_type if provided
    if (updates.card_type) {
      const validCardTypes = ['monthly_challenge', 'daily_tips', 'watch_ads', 'dropoff_points', 'upcoming_events'];
      if (!validCardTypes.includes(updates.card_type)) {
        return NextResponse.json(
          { error: `Invalid card_type. Must be one of: ${validCardTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Ensure updated_at is set
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('discover_earn_cards')
      .update(updatesWithTimestamp)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ card: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a discover & earn card
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client is not configured on the server' },
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
      .from('discover_earn_cards')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

