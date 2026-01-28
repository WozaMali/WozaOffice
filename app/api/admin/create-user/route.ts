import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if service role key is available
    if (!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error: Service role key not found' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      role, 
      department, 
      township, 
      password,
      sendInvite
    } = body;

    // Normalize
    const normEmail = (email || '').trim().toLowerCase();

    // Validate required fields (password only required when not sending invite)
    const passwordRequired = !(sendInvite === true);
    if (!firstName || !lastName || !normEmail || !role || (passwordRequired && !password)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate employee number
    const { data: latestUser } = await supabaseAdmin
      .from('users')
      .select('employee_number')
      .not('employee_number', 'is', null)
      .order('employee_number', { ascending: false })
      .limit(1)
      .single();

    let empNumber = 'EMP0001';
    if (latestUser?.employee_number) {
      const lastNumber = parseInt(latestUser.employee_number.replace('EMP', ''));
      empNumber = `EMP${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Step 1: Create user in auth.users using admin client
    let authData: any = { user: null };
    let authError: any = null;

    if (sendInvite === true) {
      // Send invitation email so the user confirms and sets password
      const redirectTo = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || 'http://localhost:8081/admin-login';
      const { data, error } = await (supabaseAdmin as any).auth.admin.inviteUserByEmail(normEmail, { redirectTo });
      authData = data;
      authError = error;
      // Attach metadata after invite to store profile info on the auth user
      if (authData?.user?.id) {
        try {
          await (supabaseAdmin as any).auth.admin.updateUserById(authData.user.id, {
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              employee_number: empNumber,
              township: township,
              department: department,
              role
            }
          });
        } catch (_) {}
      }
    } else {
      // Create with password immediately
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: normEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || '',
          employee_number: empNumber,
          township: township,
          department: department,
          role,
          system_generated: true,
          must_change_password: true
        }
      });
      authData = data;
      authError = error;
    }

    if (authError) {
      console.error('Auth creation error:', authError);
      console.error('Auth error details:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      // Check if it's a duplicate user error
      if (authError.message.includes('already') || authError.message.includes('exists') || authError.message.includes('duplicate')) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists in the system' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Auth creation failed: ${authError.message}` },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user in authentication system' },
        { status: 400 }
      );
    }

    // Step 2: Get role ID
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError) {
      // If role doesn't exist, create it
      const { data: newRole, error: createRoleError } = await supabaseAdmin
        .from('roles')
        .insert({
          name: role,
          description: `${role.charAt(0).toUpperCase() + role.slice(1)} role`,
          permissions: role === 'admin' ? 
            { can_manage_users: true, can_view_analytics: true } : 
            { can_collect: true }
        })
        .select('id')
        .single();

      if (createRoleError) {
        // Clean up auth user if role creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { success: false, error: `Role creation failed: ${createRoleError.message}` },
          { status: 400 }
        );
      }

      // Step 3: Check if user profile already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (existingUser) {
        // User profile already exists, clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 400 }
        );
      }

      // Step 4: Create user profile in users table
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: normEmail,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          phone: phone || '',
          role_id: newRole.id,
          role: role,
          status: 'active',
          employee_number: empNumber,
          township: township,
          department: department,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (userError) {
        // Clean up auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { success: false, error: `User profile creation failed: ${userError.message}` },
          { status: 400 }
        );
      }
    } else {
      // Step 3: Check if user profile already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (existingUser) {
        // User profile already exists, clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 400 }
        );
      }

      // Step 4: Create user profile in users table
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: normEmail,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          phone: phone || '',
          role_id: roleData.id,
          role: role,
          status: 'active',
          employee_number: empNumber,
          township: township,
          department: department,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (userError) {
        // Clean up auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { success: false, error: `User profile creation failed: ${userError.message}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: authData.user.id,
        employee_number: empNumber,
        message: 'User created successfully'
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
