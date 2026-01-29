import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const superAdminEmail = 'superadmin@wozamali.co.za';

    // First, find the user by email
    const { data: users, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', superAdminEmail)
      .maybeSingle();

    if (findError || !users) {
      // Try to find in auth.users via admin API
      const { data: authUsers, error: authFindError } = await (supabaseAdmin as any).auth.admin.listUsers();
      
      if (authFindError) {
        console.error('❌ Error finding superadmin user:', authFindError);
        return NextResponse.json(
          { success: false, error: 'Could not find superadmin user' },
          { status: 404 }
        );
      }

      const superAdminUser = authUsers?.users?.find((u: any) => u.email === superAdminEmail);
      
      if (!superAdminUser) {
        return NextResponse.json(
          { success: false, error: 'Superadmin user not found. Please create the user first.' },
          { status: 404 }
        );
      }

      // Update password using admin API
      const { data: updateData, error: updateError } = await (supabaseAdmin as any).auth.admin.updateUserById(
        superAdminUser.id,
        {
          password: password,
          user_metadata: {}
        }
      );

      if (updateError) {
        console.error('❌ Error updating password:', updateError);
        return NextResponse.json(
          { success: false, error: updateError.message || 'Failed to update password' },
          { status: 500 }
        );
      }

      console.log('✅ Superadmin password updated successfully');
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
        email: superAdminEmail
      });
    }

    // If user exists in users table, use their ID
    const userId = users.id;

    // Update password using admin API
    const { data: updateData, error: updateError } = await (supabaseAdmin as any).auth.admin.updateUserById(
      userId,
      {
        password: password,
        user_metadata: {}
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update password' },
        { status: 500 }
      );
    }

    console.log('✅ Superadmin password updated successfully');
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      email: superAdminEmail
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

