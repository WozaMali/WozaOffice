import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Helper function to verify user token and get user
async function verifyUserToken(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) return null;

  // Create a regular client to verify the token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Set the session with the token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

// Create export request
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { export_type, report_title, filename, request_data } = body;

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // Verify token using regular client
    const user = await verifyUserToken(token);

    if (!user) {
      console.error('Auth error in POST: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    if (!export_type || !report_title || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create export request
    const { data, error } = await supabaseAdmin
      .from('export_requests')
      .insert({
        requested_by: user.id,
        export_type,
        report_title,
        filename,
        request_data: request_data || {},
        status: 'pending',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating export request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data });
  } catch (error: any) {
    console.error('Error in POST /api/admin/export-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get export requests
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // Verify token using regular client
    const user = await verifyUserToken(token);

    if (!user) {
      console.error('Auth error in GET: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Check if user is superadmin or adminmanager
    let roleName = '';
    let isSuperAdmin = false;
    let isAdminManager = false;
    
    try {
      const { data: userData, error: userDataError } = await supabaseAdmin
        .from('users')
        .select('role_id, role, roles!inner(name)')
        .eq('id', user.id)
        .single();

      if (!userDataError && userData) {
        // Try to get role from joined roles table first
        roleName = (userData as any)?.roles?.name?.toLowerCase() || 
                   (userData as any)?.role?.toLowerCase() || '';
      } else {
        // Fallback: try without join
        const { data: fallbackData } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        roleName = (fallbackData as any)?.role?.toLowerCase() || '';
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      // Continue with empty roleName - will default to regular admin
    }

    isSuperAdmin = roleName === 'superadmin' || roleName === 'super_admin' ||
      user.email?.toLowerCase() === 'superadmin@wozamali.co.za';
    isAdminManager = roleName === 'adminmanager' || roleName === 'admin_manager';
    const canApprove = isSuperAdmin || isAdminManager;

    let query = supabaseAdmin
      .from('export_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (canApprove) {
      // SuperAdmins and AdminManagers see pending requests
      query = query.eq('status', 'pending');
    } else {
      // Regular admins see their own requests
      query = query.eq('requested_by', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching export requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user data for each request (both requester and approver)
    const requestsWithUsers = await Promise.all(
      (data || []).map(async (req: any) => {
        let requestedByUser = null;
        let approvedByUser = null;

        try {
          // Get requester user data
          const { data: requesterData } = await supabaseAdmin
            .from('users')
            .select('full_name, email')
            .eq('id', req.requested_by)
            .single();
          requestedByUser = requesterData;
        } catch (err) {
          // Requester not found
        }

        // Get approver user data if request was approved/rejected
        if (req.approved_by) {
          try {
            const { data: approverData } = await supabaseAdmin
              .from('users')
              .select('full_name, email')
              .eq('id', req.approved_by)
              .single();
            approvedByUser = approverData;
          } catch (err) {
            // Approver not found
          }
        }
        
        return {
          ...req,
          requested_by_user: requestedByUser,
          approved_by_user: approvedByUser,
        };
      })
    );

    return NextResponse.json({ requests: requestsWithUsers || [] });
  } catch (error: any) {
    console.error('Error in GET /api/admin/export-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

