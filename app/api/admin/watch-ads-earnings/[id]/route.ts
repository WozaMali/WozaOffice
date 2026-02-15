import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const watchId = id;
    const body = await request.json();
    const { status } = body;

    console.log(`🔍 API: PATCH request received for watch ID: ${watchId}, status: ${status}`);

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    if (!watchId) {
      return NextResponse.json(
        { error: 'Watch ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 API: Updating watch ad earning ${watchId} to status: ${status}`);

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }

    // Check if the watch exists
    const { data: existingWatch, error: checkError } = await supabaseAdmin
      .from('video_watches')
      .select('id, user_id, video_id, is_qualified, credits_awarded, approval_status')
      .eq('id', watchId)
      .single();

    if (checkError) {
      console.error('❌ API: Error checking watch existence:', checkError);
      // If it's a "not found" error (PGRST116), return 404
      if (checkError.code === 'PGRST116' || checkError.message?.includes('No rows')) {
        return NextResponse.json(
          { error: 'Watch ad earning not found' },
          { status: 404 }
        );
      }
      // Otherwise, return the actual error
      return NextResponse.json(
        { error: checkError.message || 'Failed to check watch existence' },
        { status: 500 }
      );
    }

    if (!existingWatch) {
      console.error('❌ API: Watch not found for ID:', watchId);
      return NextResponse.json(
        { error: 'Watch ad earning not found' },
        { status: 404 }
      );
    }

    // Update the approval status
    const updateData: any = {
      approval_status: status,
      updated_at: new Date().toISOString(),
    };

    // If approving and credits haven't been awarded yet, award them
    if (status === 'approved' && existingWatch.is_qualified && !existingWatch.credits_awarded) {
      try {
        // Call the award function
        const { data: awardResult, error: awardError } = await supabaseAdmin.rpc(
          'award_video_watch_credits',
          {
            p_watch_id: watchId
          }
        );

        if (awardError) {
          console.error('Error awarding credits:', awardError);
          // Continue with approval even if credit award fails
        } else if (awardResult?.success) {
          console.log('✅ Credits awarded successfully:', awardResult.credits_awarded);
        }
      } catch (error: any) {
        console.error('Exception awarding credits:', error);
        // Continue with approval even if credit award fails
      }
    }

    // Update the watch record
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('video_watches')
      .update(updateData)
      .eq('id', watchId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ API: Error updating watch ad earning:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update watch ad earning' },
        { status: 500 }
      );
    }

    console.log('✅ API: Successfully updated watch ad earning');
    
    return NextResponse.json({ 
      watch: updated,
      success: true 
    });

  } catch (error: any) {
    console.error('❌ API: Exception in PATCH handler:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const watchId = id;

    console.log(`🔍 API: DELETE request received for watch ID: ${watchId}`);

    if (!watchId) {
      return NextResponse.json(
        { error: 'Watch ID is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }

    // Check if the watch exists
    const { data: existingWatch, error: checkError } = await supabaseAdmin
      .from('video_watches')
      .select('id, user_id, video_id, credits_awarded')
      .eq('id', watchId)
      .single();

    if (checkError) {
      console.error('❌ API: Error checking watch existence:', checkError);
      if (checkError.code === 'PGRST116' || checkError.message?.includes('No rows')) {
        return NextResponse.json(
          { error: 'Watch ad earning not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: checkError.message || 'Failed to check watch existence' },
        { status: 500 }
      );
    }

    if (!existingWatch) {
      console.error('❌ API: Watch not found for ID:', watchId);
      return NextResponse.json(
        { error: 'Watch ad earning not found' },
        { status: 404 }
      );
    }

    // If credits were awarded, we might want to reverse them
    // For now, we'll just delete the record
    // You can add credit reversal logic here if needed

    // Delete the watch record
    const { error: deleteError } = await supabaseAdmin
      .from('video_watches')
      .delete()
      .eq('id', watchId);

    if (deleteError) {
      console.error('❌ API: Error deleting watch ad earning:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete watch ad earning' },
        { status: 500 }
      );
    }

    console.log('✅ API: Successfully deleted watch ad earning');
    
    return NextResponse.json({ 
      success: true,
      message: 'Watch ad earning deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ API: Exception in DELETE handler:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
