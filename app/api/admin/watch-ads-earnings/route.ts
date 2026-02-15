import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';

    console.log('🔍 API: Fetching watch ad earnings with filter:', statusFilter);

    // Fetch video watches - first get the watches, then fetch related data separately
    // This avoids schema cache relationship issues
    let query = supabaseAdmin
      .from('video_watches')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by approval status
    if (statusFilter === 'pending') {
      query = query.or('approval_status.is.null,approval_status.eq.pending');
    } else if (statusFilter === 'approved') {
      query = query.eq('approval_status', 'approved');
    } else if (statusFilter === 'rejected') {
      query = query.eq('approval_status', 'rejected');
    }

    const { data: watches, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ API: Error fetching watch ad earnings:', fetchError);
      return NextResponse.json(
        { error: fetchError.message || 'Failed to fetch watch ad earnings' },
        { status: 500 }
      );
    }

    // Filter to show only completed watches that need approval or are pending
    const filteredWatches = (watches || []).filter((watch: any) => {
      // Show if it's completed and either has no approval_status or is pending
      const needsApproval = watch.watch_completed_at && 
        (!watch.approval_status || watch.approval_status === 'pending');
      const isApproved = watch.approval_status === 'approved';
      const isRejected = watch.approval_status === 'rejected';
      
      if (statusFilter === 'all') {
        return watch.watch_completed_at; // Show all completed watches
      } else if (statusFilter === 'pending') {
        return needsApproval;
      } else if (statusFilter === 'approved') {
        return isApproved;
      } else if (statusFilter === 'rejected') {
        return isRejected;
      }
      return false;
    });

    // Get unique user IDs and video IDs
    const userIds = Array.from(new Set(filteredWatches.map((w: any) => w.user_id).filter(Boolean)));
    const videoIds = Array.from(new Set(filteredWatches.map((w: any) => w.video_id).filter(Boolean)));

    // Fetch users and videos separately
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, full_name, phone')
        .in('id', userIds);
      
      if (!usersError && users) {
        users.forEach((user: any) => {
          usersMap[user.id] = user;
        });
      }
    }

    let videosMap: Record<string, any> = {};
    if (videoIds.length > 0) {
      const { data: videos, error: videosError } = await supabaseAdmin
        .from('watch_ads_videos')
        .select('id, title, description, credit_amount, thumbnail_url, watch_duration_seconds, watch_percentage_required')
        .in('id', videoIds);
      
      if (!videosError && videos) {
        videos.forEach((video: any) => {
          videosMap[video.id] = video;
        });
      }
    }

    // Enrich watches with user and video data
    const earnings = filteredWatches.map((watch: any) => ({
      ...watch,
      user: usersMap[watch.user_id] || null,
      video: videosMap[watch.video_id] || null
    }));

    console.log('✅ API: Successfully fetched', earnings.length, 'watch ad earnings');
    
    return NextResponse.json({ 
      earnings,
      count: earnings.length
    });

  } catch (error: any) {
    console.error('❌ API: Exception in GET handler:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
