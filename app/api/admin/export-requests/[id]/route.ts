import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Get single export request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id } = await params;

    const { data: requestData, error } = await supabaseAdmin
      .from('export_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch requester and approver user data
    let requestedByUser = null;
    let approvedByUser = null;

    try {
      const { data: requesterData } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', requestData.requested_by)
        .single();
      requestedByUser = requesterData;
    } catch (err) {
      // Requester not found
    }

    if (requestData.approved_by) {
      try {
        const { data: approverData } = await supabaseAdmin
          .from('users')
          .select('full_name, email')
          .eq('id', requestData.approved_by)
          .single();
        approvedByUser = approverData;
      } catch (err) {
        // Approver not found
      }
    }

    return NextResponse.json({ 
      request: {
        ...requestData,
        requested_by_user: requestedByUser,
        approved_by_user: approvedByUser,
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/export-requests/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update export request (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejection_reason } = body;

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is superadmin or adminmanager
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role_id, roles!inner(name)')
      .eq('id', user.id)
      .single();

    const roleName = (userData as any)?.roles?.name?.toLowerCase() || '';
    const isSuperAdmin = roleName === 'superadmin' || roleName === 'super_admin' ||
      user.email?.toLowerCase() === 'superadmin@wozamali.co.za';
    const isAdminManager = roleName === 'adminmanager' || roleName === 'admin_manager';
    const canApprove = isSuperAdmin || isAdminManager;

    if (!canApprove) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin or AdminManager access required' }, { status: 403 });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const update: any = {
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === 'rejected' && rejection_reason) {
      update.rejection_reason = rejection_reason;
    }

    const { data, error } = await supabaseAdmin
      .from('export_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating export request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/export-requests/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

