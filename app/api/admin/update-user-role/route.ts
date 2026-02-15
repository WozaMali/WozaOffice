import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    // Normalize role name
    let normalizedRole = role.toLowerCase();
    if (normalizedRole === 'admin_manager' || normalizedRole === 'adminmanager') {
      normalizedRole = 'admin_manager';
    } else if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
      normalizedRole = 'super_admin';
    } else if (normalizedRole === 'admin') {
      normalizedRole = 'admin';
    } else if (normalizedRole === 'staff') {
      normalizedRole = 'staff';
    }

    // Get role ID
    let roleData: any = null;
    
    // Try normalized role first
    const { data: data1, error: error1 } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .eq('name', normalizedRole)
      .single();
    
    if (!error1 && data1) {
      roleData = data1;
    } else {
      // Try uppercase version
      const { data: data2, error: error2 } = await supabaseAdmin
        .from('roles')
        .select('id, name')
        .eq('name', role.toUpperCase())
        .single();
      
      if (!error2 && data2) {
        roleData = data2;
      } else {
        // Try SUPER_ADMIN as fallback for superadmin
        if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
          const { data: data3 } = await supabaseAdmin
            .from('roles')
            .select('id, name')
            .or('name.eq.SUPER_ADMIN,name.eq.super_admin,name.eq.superadmin')
            .limit(1)
            .single();
          
          if (data3) {
            roleData = data3;
          }
        }
      }
    }

    if (!roleData) {
      return NextResponse.json(
        { success: false, error: `Role '${role}' not found. Available roles: SUPER_ADMIN, ADMIN, ADMIN_MANAGER, STAFF` },
        { status: 400 }
      );
    }

    // Update user role
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role_id: roleData.id,
        role: roleData.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to update role: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${roleData.name} successfully`,
      data: {
        role_id: roleData.id,
        role: roleData.name
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

