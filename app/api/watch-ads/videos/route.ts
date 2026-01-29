import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

// GET - Get all active videos (for users) or all videos (for admins)
export async function GET(request: NextRequest) {
  try {
    if (!getSupabaseAdminClient()) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const adminView = searchParams.get('admin') === 'true';

    // Build query - get all videos for admin, only active videos for users
    let query = getSupabaseAdminClient()
      .from('watch_ads_videos')
      .select('*');
    
    // Only filter by is_active if not admin view
    if (!adminView) {
      query = query.eq('is_active', true);
    }
    
    // Get videos, sorted by display_order
    const { data: videos, error } = await query.order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching videos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    // If userId provided, check which videos user can watch (daily limits)
    if (userId && !adminView) {
      const videosWithAvailability = await Promise.all(
        (videos || []).map(async (video) => {
          const { data: canWatch } = await getSupabaseAdminClient()!.rpc('can_user_watch_video', {
            p_user_id: userId,
            p_video_id: video.id
          });

          // Get today's watch count
          const { count: todayCount } = await getSupabaseAdminClient()!
            .from('video_watches')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('video_id', video.id)
            .gte('created_at', new Date().toISOString().split('T')[0]);

          return {
            ...video,
            can_watch: canWatch ?? true,
            watches_today: todayCount ?? 0
          };
        })
      );

      return NextResponse.json({ videos: videosWithAvailability });
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (error: any) {
    console.error('Error in GET /api/watch-ads/videos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new video (Admin only)
export async function POST(request: NextRequest) {
  try {
    if (!getSupabaseAdminClient()) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      video_url,
      video_type = 'direct',
      thumbnail_url,
      credit_amount = 5.00,
      watch_duration_seconds = 30,
      watch_percentage_required = 80,
      display_order = 0,
      is_active = true,
      max_watches_per_day = 3,
      max_watches_total,
      advertiser_name,
      category
    } = body;

    if (!title || !video_url) {
      return NextResponse.json(
        { error: 'Title and video_url are required' },
        { status: 400 }
      );
    }

    // Build insert object, only including defined values
    const insertData: any = {
      title,
      video_url,
      video_type,
      credit_amount,
      watch_duration_seconds,
      watch_percentage_required,
      display_order,
      is_active
    };

    // Add optional fields only if they have values
    if (description) insertData.description = description;
    if (thumbnail_url) insertData.thumbnail_url = thumbnail_url;
    if (max_watches_per_day !== undefined && max_watches_per_day !== null) {
      insertData.max_watches_per_day = max_watches_per_day;
    }
    if (max_watches_total !== undefined && max_watches_total !== null) {
      insertData.max_watches_total = max_watches_total;
    }
    if (advertiser_name) insertData.advertiser_name = advertiser_name;
    if (category) insertData.category = category;

    console.log('Creating video with data:', insertData);

    const { data: video, error } = await getSupabaseAdminClient()
      .from('watch_ads_videos')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating video:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create video',
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ video }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/watch-ads/videos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a video (Admin only)
export async function PUT(request: NextRequest) {
  try {
    if (!getSupabaseAdminClient()) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const { data: video, error } = await getSupabaseAdminClient()
      .from('watch_ads_videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating video:', error);
      return NextResponse.json(
        { error: 'Failed to update video' },
        { status: 500 }
      );
    }

    return NextResponse.json({ video });
  } catch (error: any) {
    console.error('Error in PUT /api/watch-ads/videos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a video (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    if (!getSupabaseAdminClient()) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const { error } = await getSupabaseAdminClient()
      .from('watch_ads_videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting video:', error);
      return NextResponse.json(
        { error: 'Failed to delete video' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/watch-ads/videos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

