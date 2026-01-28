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
      employeeNumber
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !role || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate employee number by role if not provided
    let empNumber = (employeeNumber && String(employeeNumber).trim()) || '';
    if (!empNumber) {
      const isCollector = String(role).toLowerCase() === 'collector';
      const prefix = isCollector ? 'SNW-C' : 'SNW';

      // Find latest matching pattern for this role
      const { data: latest } = await supabaseAdmin
        .from('users')
        .select('employee_number')
        .not('employee_number', 'is', null)
        .ilike('employee_number', `${prefix}%`)
        .order('employee_number', { ascending: false })
        .limit(1)
        .single();

      const fallback = isCollector ? 'SNW-C0001' : 'SNW0001';
      if (!latest?.employee_number) {
        empNumber = fallback;
      } else {
        const current = String(latest.employee_number);
        const base = isCollector ? current.replace(/^SNW-C/, '') : current.replace(/^SNW/, '');
        const n = parseInt(base, 10);
        const next = isNaN(n) ? 1 : n + 1;
        empNumber = `${prefix}${String(next).padStart(4, '0')}`;
      }
    }

    // Step 1: Create user in auth.users using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        employee_number: empNumber,
        township: township,
        department: department
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
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

    // Step 2: Get role ID (handle both UUID and text types)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    let roleId = null;
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
      roleId = newRole.id;
    } else {
      roleId = roleData.id;
    }

    // Step 3: Create user profile directly in users table
    const userInsertData: any = {
      id: authData.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: phone,
      role: role,
      status: 'active',
      employee_number: empNumber,
      township_id: null, // Set to null to avoid UUID conversion issues
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add role_id based on its type
    if (typeof roleId === 'string' && roleId.includes('-')) {
      // It's a UUID
      userInsertData.role_id = roleId;
    } else {
      // It's text or needs conversion
      userInsertData.role_id = roleId.toString();
    }

    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert(userInsertData);

    if (userError) {
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: `User profile creation failed: ${userError.message}` },
        { status: 400 }
      );
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
