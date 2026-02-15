import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

// GET - Get stats about which users watched which ads
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('video_id');
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // First, check if video_watches table exists by trying a simple query
    try {
      const { error: tableCheckError } = await supabaseAdmin
        .from('video_watches')
        .select('id')
        .limit(1);
      
      // Check for table not found errors
      if (tableCheckError && (
        tableCheckError.code === 'PGRST116' || 
        tableCheckError.message?.includes('relation') ||
        tableCheckError.message?.includes('does not exist')
      )) {
        // Table doesn't exist - return empty stats
        return NextResponse.json({
          success: true,
          summary: {
            total_watches: 0,
            qualified_watches: 0,
            total_credits_awarded: 0,
            qualification_rate: '0.00'
          },
          by_video: [],
          by_user: [],
          watches: [],
          pagination: {
            total: 0,
            limit,
            offset,
            has_more: false
          },
          message: 'No watch data available yet. The video_watches table may not exist or be empty.'
        });
      }
    } catch (tableErr: any) {
      console.warn('Table check error (non-fatal):', tableErr);
      // Continue anyway - the main query will handle the error
    }

    // Build query - fetch watches first, then join with users and videos separately
    let query = supabaseAdmin
      .from('video_watches')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (videoId) {
      query = query.eq('video_id', videoId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: watchesData, error, count } = await query;
    const watches = watchesData as any[] | null;

    if (error) {
      console.error('Error fetching video watch stats:', error);
      
      // If table doesn't exist, return empty stats instead of error
      if (error.code === 'PGRST116' || 
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          summary: {
            total_watches: 0,
            qualified_watches: 0,
            total_credits_awarded: 0,
            qualification_rate: '0.00'
          },
          by_video: [],
          by_user: [],
          watches: [],
          pagination: {
            total: 0,
            limit,
            offset,
            has_more: false
          },
          message: 'No watch data available yet. The video_watches table may not exist or be empty.'
        });
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Failed to fetch stats',
          details: error.details || null,
          code: error.code || null
        },
        { status: 400 }
      );
    }

    // Handle case where watches is null or empty
    if (!watches) {
      return NextResponse.json({
        success: true,
        summary: {
          total_watches: 0,
          qualified_watches: 0,
          total_credits_awarded: 0,
          qualification_rate: '0.00'
        },
        by_video: [],
        by_user: [],
        watches: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false
        }
      });
    }

    // Fetch user and video data separately
    const userIds = watches && watches.length > 0 
      ? Array.from(new Set(watches.map(w => w.user_id).filter(Boolean)))
      : [];
    const videoIds = watches && watches.length > 0
      ? Array.from(new Set(watches.map(w => w.video_id).filter(Boolean)))
      : [];

    // Fetch users - handle gracefully if table doesn't exist or has errors
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      try {
        // Try to fetch from public.users table
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id, email, first_name, last_name, full_name, phone, employee_number')
          .in('id', userIds);
        
        if (!usersError && users && users.length > 0) {
          users.forEach(user => {
            usersMap[user.id] = user;
          });
        }
      } catch (err) {
        console.warn('Could not fetch users from public.users table:', err);
      }
      
      // For any missing users, create placeholder entries
      userIds.forEach(userId => {
        if (!usersMap[userId]) {
          usersMap[userId] = {
            id: userId,
            email: 'Unknown',
            first_name: null,
            last_name: null,
            full_name: 'Unknown User',
            phone: null,
            employee_number: null
          };
        }
      });
    }

    // Fetch videos - handle gracefully if errors occur
    let videosMap: Record<string, any> = {};
    if (videoIds.length > 0) {
      try {
        const { data: videos, error: videosError } = await supabaseAdmin
          .from('watch_ads_videos')
          .select('id, title, advertiser_name, credit_amount')
          .in('id', videoIds);
        
        if (!videosError && videos && videos.length > 0) {
          videos.forEach(video => {
            videosMap[video.id] = video;
          });
        }
      } catch (err) {
        console.warn('Could not fetch videos from watch_ads_videos table:', err);
      }
      
      // For any missing videos, create placeholder entries
      videoIds.forEach(videoId => {
        if (!videosMap[videoId]) {
          videosMap[videoId] = {
            id: videoId,
            title: 'Unknown Video',
            advertiser_name: null,
            credit_amount: 0
          };
        }
      });
    }

    // Enrich watches with user and video data
    const enrichedWatches = watches?.map(watch => ({
      ...watch,
      user: usersMap[watch.user_id] || null,
      video: videosMap[watch.video_id] || null
    })) || [];

    // Get summary stats - build query with proper chaining
    // Include additional fields for enhanced metrics
    let summaryQuery = supabaseAdmin
      .from('video_watches')
      .select('video_id, user_id, is_qualified, credits_awarded, watch_duration_seconds, watch_percentage', { count: 'exact' });

    if (videoId) {
      summaryQuery = summaryQuery.eq('video_id', videoId);
    }

    if (userId) {
      summaryQuery = summaryQuery.eq('user_id', userId);
    }

    if (startDate) {
      summaryQuery = summaryQuery.gte('created_at', startDate);
    }

    if (endDate) {
      summaryQuery = summaryQuery.lte('created_at', endDate);
    }

    let allWatches: any[] = [];
    let totalWatches = 0;
    let qualifiedWatches = 0;
    let totalCreditsAwarded = 0;
    let uniqueViewers = 0;
    let avgWatchDuration = 0;
    let completionRate = 0;
    
    try {
      const { data: summaryData, error: summaryError } = await summaryQuery;
      
      // Handle summary query errors gracefully
      if (summaryError) {
        console.error('Error fetching summary stats:', summaryError);
        // Use watches data we already have for summary if summary query fails
        allWatches = watches || [];
      } else {
        allWatches = summaryData || [];
      }

      // Calculate summary statistics
      totalWatches = allWatches.length;
      qualifiedWatches = allWatches.filter((w: any) => w.is_qualified).length;
      totalCreditsAwarded = allWatches.reduce((sum: number, w: any) => {
        const credits = parseFloat(w.credits_awarded?.toString() || '0');
        return sum + (isNaN(credits) ? 0 : credits);
      }, 0);

      // Calculate unique viewers
      const uniqueUserIds = new Set(allWatches.map((w: any) => w.user_id).filter(Boolean));
      uniqueViewers = uniqueUserIds.size;

      // Calculate average watch duration (in seconds)
      const watchDurations = allWatches
        .map((w: any) => w.watch_duration_seconds)
        .filter((d: any) => d !== null && d !== undefined && !isNaN(parseInt(d?.toString() || '0')));
      
      if (watchDurations.length > 0) {
        const totalDuration = watchDurations.reduce((sum: number, d: any) => {
          const duration = parseInt(d?.toString() || '0');
          return sum + (isNaN(duration) ? 0 : duration);
        }, 0);
        avgWatchDuration = Math.round(totalDuration / watchDurations.length);
      }

      // Calculate completion rate (watches with 100% completion)
      const completedWatches = allWatches.filter((w: any) => {
        const percentage = parseInt(w.watch_percentage?.toString() || '0');
        return percentage >= 100;
      }).length;
      
      completionRate = totalWatches > 0 ? (completedWatches / totalWatches) * 100 : 0;
    } catch (summaryErr: any) {
      console.error('Exception in summary query:', summaryErr);
      // Fallback to using watches data we already fetched
      allWatches = watches || [];
      totalWatches = allWatches.length;
      qualifiedWatches = allWatches.filter((w: any) => w.is_qualified).length;
      totalCreditsAwarded = allWatches.reduce((sum: number, w: any) => {
        const credits = parseFloat(w.credits_awarded?.toString() || '0');
        return sum + (isNaN(credits) ? 0 : credits);
      }, 0);

      // Calculate unique viewers from enriched watches
      const uniqueUserIds = new Set((watches || []).map((w: any) => w.user_id).filter(Boolean));
      uniqueViewers = uniqueUserIds.size;

      // Calculate average watch duration from enriched watches
      const watchDurations = (watches || [])
        .map((w: any) => w.watch_duration_seconds)
        .filter((d: any) => d !== null && d !== undefined && !isNaN(parseInt(d?.toString() || '0')));
      
      if (watchDurations.length > 0) {
        const totalDuration = watchDurations.reduce((sum: number, d: any) => {
          const duration = parseInt(d?.toString() || '0');
          return sum + (isNaN(duration) ? 0 : duration);
        }, 0);
        avgWatchDuration = Math.round(totalDuration / watchDurations.length);
      }

      // Calculate completion rate from enriched watches
      const completedWatches = (watches || []).filter((w: any) => {
        const percentage = parseInt(w.watch_percentage?.toString() || '0');
        return percentage >= 100;
      }).length;
      
      completionRate = totalWatches > 0 ? (completedWatches / totalWatches) * 100 : 0;
    }

    // Group by video
    const byVideo = (enrichedWatches || []).reduce((acc: any, watch: any) => {
      if (!watch || !watch.video_id) return acc;
      const videoId = watch.video_id;
      if (!acc[videoId]) {
        acc[videoId] = {
          video_id: videoId,
          video_title: watch.video?.title || 'Unknown',
          total_watches: 0,
          qualified_watches: 0,
          total_credits: 0,
          users: []
        };
      }
      acc[videoId].total_watches++;
      if (watch.is_qualified) {
        acc[videoId].qualified_watches++;
        const credits = parseFloat(watch.credits_awarded?.toString() || '0');
        acc[videoId].total_credits += (isNaN(credits) ? 0 : credits);
      }
      if (watch.user) {
        acc[videoId].users.push({
          watch_id: watch.id, // Add unique watch ID for React keys
          user_id: watch.user.id,
          email: watch.user.email,
          name: watch.user.full_name || `${watch.user.first_name || ''} ${watch.user.last_name || ''}`.trim() || 'Unknown',
          employee_number: watch.user.employee_number,
          watched_at: watch.created_at,
          is_qualified: watch.is_qualified,
          credits_awarded: watch.credits_awarded
        });
      }
      return acc;
    }, {});

    // Group by user
    const byUser = (enrichedWatches || []).reduce((acc: any, watch: any) => {
      if (!watch || !watch.user_id) return acc;
      const userId = watch.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          user_email: watch.user?.email || 'Unknown',
          user_name: watch.user?.full_name || `${watch.user?.first_name || ''} ${watch.user?.last_name || ''}`.trim() || 'Unknown',
          employee_number: watch.user?.employee_number,
          total_watches: 0,
          qualified_watches: 0,
          total_credits: 0,
          videos: []
        };
      }
      acc[userId].total_watches++;
      if (watch.is_qualified) {
        acc[userId].qualified_watches++;
        const credits = parseFloat(watch.credits_awarded?.toString() || '0');
        acc[userId].total_credits += (isNaN(credits) ? 0 : credits);
      }
      if (watch.video) {
        acc[userId].videos.push({
          watch_id: watch.id, // Add unique watch ID for React keys
          video_id: watch.video.id,
          video_title: watch.video.title || 'Unknown',
          watched_at: watch.created_at,
          is_qualified: watch.is_qualified,
          credits_awarded: watch.credits_awarded
        });
      }
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      summary: {
        total_watches: totalWatches,
        qualified_watches: qualifiedWatches,
        total_credits_awarded: totalCreditsAwarded,
        qualification_rate: totalWatches > 0 ? (qualifiedWatches / totalWatches * 100).toFixed(2) : '0.00',
        unique_viewers: uniqueViewers,
        avg_watch_duration_seconds: avgWatchDuration,
        completion_rate: completionRate.toFixed(2)
      },
      by_video: Object.values(byVideo || {}),
      by_user: Object.values(byUser || {}),
      watches: enrichedWatches || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/watch-ads/stats:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

