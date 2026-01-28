import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: missing Supabase URL/anon key' },
        { status: 500 }
      );
    }
    if (!serviceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      );
    }

    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing Authorization bearer token' },
        { status: 401 }
      );
    }

    // Validate token / identify user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session', details: userError?.message },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = (body?.id || '').trim();
    const email = (body?.email || '').trim().toLowerCase();
    const first_name = (body?.first_name || '').trim();
    const last_name = (body?.last_name || '').trim();
    const nameFromBody = (body?.full_name || '').trim();
    const nameFromParts = `${first_name} ${last_name}`.trim();
    const nameFromMeta =
      (userData.user.user_metadata as any)?.full_name ||
      (userData.user.user_metadata as any)?.name ||
      '';
    const fallbackNameFromEmail = email ? email.split('@')[0] : 'User';
    const full_name = (nameFromBody || nameFromParts || String(nameFromMeta || '').trim() || fallbackNameFromEmail).trim();
    const role = (body?.role || 'admin').trim().toLowerCase();
    const status = (body?.status || 'pending_approval').trim();

    // Security: only allow creating/updating your own row
    if (!id || id !== userData.user.id) {
      return NextResponse.json(
        { success: false, error: 'User id mismatch' },
        { status: 403 }
      );
    }
    if (!email || email !== (userData.user.email || '').toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Email mismatch' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    // Ensure role exists; create if missing
    let roleId: string | null = null;
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role)
      .maybeSingle();

    if (roleErr) {
      return NextResponse.json(
        { success: false, error: `Failed to resolve role: ${roleErr.message}` },
        { status: 400 }
      );
    }

    if (roleRow?.id) {
      roleId = roleRow.id as any;
    } else {
      const { data: newRole, error: createRoleErr } = await supabaseAdmin
        .from('roles')
        .insert({
          name: role,
          description: `${role.charAt(0).toUpperCase() + role.slice(1)} role`,
          permissions: role === 'admin'
            ? { can_manage_users: true, can_view_analytics: true }
            : { can_access: true },
        })
        .select('id')
        .single();

      if (createRoleErr) {
        return NextResponse.json(
          { success: false, error: `Role creation failed: ${createRoleErr.message}` },
          { status: 400 }
        );
      }
      roleId = (newRole as any)?.id || null;
    }

    // Upsert into unified users table
    const now = new Date().toISOString();
    const { data: upserted, error: upsertErr } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id,
          email,
          first_name: first_name || null,
          last_name: last_name || null,
          // NOTE: full_name is NOT NULL in the unified schema used by this app
          full_name,
          role_id: roleId,
          role,
          status,
          updated_at: now,
          created_at: now,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (upsertErr) {
      return NextResponse.json(
        { success: false, error: `User upsert failed: ${upsertErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: upserted,
    });
  } catch (error: any) {
    console.error('POST /api/auth/register-admin error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

