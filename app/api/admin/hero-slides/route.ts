import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// No caching - admin needs immediate updates
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// GET - Fetch all hero slides
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          slides: [],
          count: 0,
          error: 'Supabase admin client is not configured on the server',
        },
        { status: 200 }
      );
    }

    // Query slides using admin client (bypasses RLS)
    const { data: slides, error } = await supabaseAdmin
      .from('hero_slides')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({
        slides: [],
        count: 0,
        error: error.message
      }, { status: 200 });
    }

    return NextResponse.json({
      slides: slides || [],
      count: (slides || []).length
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
        slides: [],
        count: 0,
        error: error?.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}

// POST - Create a new hero slide
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
      display_order,
      is_active,
      image_url,
      background_position,
      card_text,
      card_route,
      auto_play_interval,
      brand_text,
      heading,
      description,
      button_text,
      button_route
    } = body;

    // Validate required fields
    if (!image_url) {
      return NextResponse.json(
        { error: 'Missing required field: image_url' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('hero_slides')
      .insert({
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
        image_url,
        background_position: background_position || 'center center',
        card_text: card_text || null,
        card_route: card_route || null,
        auto_play_interval: auto_play_interval ?? 5,
        brand_text: brand_text || null,
        heading: heading || null,
        description: description || null,
        button_text: button_text || null,
        button_route: button_route || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ slide: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a hero slide
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

    const { data, error } = await supabaseAdmin
      .from('hero_slides')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ slide: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a hero slide
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
      .from('hero_slides')
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

