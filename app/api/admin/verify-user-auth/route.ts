import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Get user from auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json(
        { success: false, error: `Failed to list users: ${listError.message}` },
        { status: 500 }
      );
    }

    const user = authUsers.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found in auth.users',
        exists: false
      });
    }

    // Get user from public.users
    const { data: publicUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        auth_user: {
          id: user.id,
          email: user.email,
          email_confirmed: !!user.email_confirmed_at,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          has_password: !!user.encrypted_password
        },
        public_user: publicUser ? {
          id: publicUser.id,
          email: publicUser.email,
          status: publicUser.status,
          role: publicUser.role,
          is_approved: publicUser.is_approved
        } : null,
        sync_status: {
          ids_match: user.id === publicUser?.id,
          both_exist: !!publicUser
        }
      }
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

