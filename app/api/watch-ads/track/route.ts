import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Start tracking a video watch
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { user_id, video_id, ip_address, user_agent } = body;

    if (!user_id || !video_id) {
      return NextResponse.json(
        { error: 'user_id and video_id are required' },
        { status: 400 }
      );
    }

    // Check if user can watch this video
    const { data: canWatch, error: canWatchError } = await supabaseAdmin.rpc(
      'can_user_watch_video',
      {
        p_user_id: user_id,
        p_video_id: video_id
      }
    );

    if (canWatchError) {
      console.error('Error checking if user can watch:', canWatchError);
    }

    if (!canWatch) {
      return NextResponse.json(
        { error: 'Daily watch limit reached for this video' },
        { status: 403 }
      );
    }

    // Create watch record
    const { data: watch, error } = await supabaseAdmin
      .from('video_watches')
      .insert({
        user_id,
        video_id,
        watch_started_at: new Date().toISOString(),
        ip_address,
        user_agent
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating watch record:', error);
      return NextResponse.json(
        { error: 'Failed to start tracking video watch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ watch }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/watch-ads/track:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update video watch progress and complete it
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      watch_id,
      watch_duration_seconds,
      watch_percentage,
      is_completed = false
    } = body;

    if (!watch_id) {
      return NextResponse.json(
        { error: 'watch_id is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      watch_duration_seconds,
      watch_percentage,
      updated_at: new Date().toISOString()
    };

    if (is_completed) {
      updateData.watch_completed_at = new Date().toISOString();
    }

    // Update watch record
    const { data: watch, error } = await supabaseAdmin
      .from('video_watches')
      .update(updateData)
      .eq('id', watch_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating watch record:', error);
      return NextResponse.json(
        { error: 'Failed to update video watch' },
        { status: 500 }
      );
    }

    // If completed and qualifies, award credits to wallet
    if (is_completed && watch && !watch.is_qualified) {
      try {
        const { data: awardResult, error: awardError } = await supabaseAdmin.rpc(
          'award_video_watch_credits',
          {
            p_watch_id: watch_id
          }
        );

        if (awardError) {
          console.error('Error awarding credits:', awardError);
          // Return error but don't fail the watch update
          return NextResponse.json({
            watch,
            error: 'Failed to award credits to wallet',
            credits_awarded: null
          });
        } else if (awardResult?.success) {
          // Reload watch to get updated credits_awarded
          const { data: updatedWatch } = await supabaseAdmin
            .from('video_watches')
            .select('*')
            .eq('id', watch_id)
            .single();

          return NextResponse.json({
            watch: updatedWatch,
            credits_awarded: awardResult.credits_awarded,
            new_balance: awardResult.new_balance,
            success: true,
            message: `Credits C ${awardResult.credits_awarded} added to your wallet!`
          });
        } else {
          // Function returned but success is false
          return NextResponse.json({
            watch,
            error: awardResult?.error || 'Failed to qualify for credits',
            credits_awarded: null
          });
        }
      } catch (error: any) {
        console.error('Exception awarding credits:', error);
        return NextResponse.json({
          watch,
          error: 'Error processing credits award',
          credits_awarded: null
        });
      }
    }

    return NextResponse.json({ watch });
  } catch (error: any) {
    console.error('Error in PUT /api/watch-ads/track:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's video watch history
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { data: watches, error } = await supabaseAdmin
      .from('video_watches')
      .select(`
        *,
        watch_ads_videos (
          id,
          title,
          credit_amount,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching watch history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch watch history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ watches: watches || [] });
  } catch (error: any) {
    console.error('Error in GET /api/watch-ads/track:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

