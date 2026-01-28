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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // First, check if user exists in auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { success: false, error: `Failed to check users: ${listError.message}` },
        { status: 500 }
      );
    }

    const user = authUsers.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      // User doesn't exist in auth.users - create them
      console.log(`User ${normalizedEmail} not found in auth.users, creating...`);
      
      // Check if user exists in public.users table
      const { data: publicUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (!publicUser) {
        return NextResponse.json(
          { success: false, error: `User with email ${email} not found in database` },
          { status: 404 }
        );
      }

      // Create auth user
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          employee_number: publicUser.employee_number,
          role: publicUser.role,
          system_generated: true
        }
      });

      if (createError) {
        console.error('Error creating auth user:', createError);
        return NextResponse.json(
          { success: false, error: `Failed to create auth user: ${createError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Auth user created successfully for ${email}. You can now log in.`,
        data: {
          user_id: newAuthUser.user.id,
          email: newAuthUser.user.email
        }
      });
    }

    // User exists - update password
    // Clear must_change_password flag and ensure email is confirmed
    // Try updating password multiple times if needed (sometimes Supabase needs a retry)
    let updateData;
    let updateError;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Attempting to update password (attempt ${attempts}/${maxAttempts})...`);
      
      const result = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          password: newPassword,
          email_confirm: true, // Ensure email is confirmed
          user_metadata: {
            ...user.user_metadata,
            must_change_password: false // Clear the flag
          }
        }
      );
      
      updateData = result.data;
      updateError = result.error;
      
      if (!updateError) {
        break; // Success, exit loop
      }
      
      console.warn(`Password update attempt ${attempts} failed:`, updateError.message);
      
      // Wait a bit before retrying
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (updateError) {
      console.error('Error updating password after all attempts:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to update password after ${maxAttempts} attempts: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Verify the password was actually set by trying to sign in
    // Note: We can't directly check encrypted_password, but we can verify the update succeeded
    console.log('Password update successful, user data:', {
      id: updateData?.user?.id,
      email: updateData?.user?.email,
      email_confirmed: !!updateData?.user?.email_confirmed_at
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${email}. You can now log in with the new password.`,
      data: {
        user_id: user.id,
        email: user.email,
        email_confirmed: updateData?.user?.email_confirmed_at ? true : false,
        must_change_password: false,
        attempts: attempts
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

