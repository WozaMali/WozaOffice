import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function GET(request: NextRequest) {
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

    // If we don't have service key, still return auth user (UI can fall back to client-side profile)
    if (!serviceKey) {
      return NextResponse.json({
        success: true,
        user: userData.user,
        profile: null,
        warning: 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY not set; profile unavailable from server',
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    // Try unified users table first
    const { data: unifiedUser } = await supabaseAdmin
      .from('users')
      .select('id,email,full_name,phone,status,role,role_id,is_approved')
      .eq('id', userData.user.id)
      .maybeSingle();

    let roleName: string | null = null;
    const rawRole = (unifiedUser as any)?.role as string | undefined;
    if (rawRole) {
      roleName = rawRole;
    } else if ((unifiedUser as any)?.role_id) {
      const { data: roleRow } = await supabaseAdmin
        .from('roles')
        .select('name')
        .eq('id', (unifiedUser as any).role_id)
        .maybeSingle();
      roleName = (roleRow as any)?.name || null;
    }

    // Fallback to legacy profiles table
    let legacyProfile: any = null;
    if (!unifiedUser) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();
      legacyProfile = prof || null;
      if (legacyProfile?.role) roleName = legacyProfile.role;
    }

    const profile = unifiedUser
      ? {
          id: (unifiedUser as any).id,
          email: (unifiedUser as any).email,
          full_name: (unifiedUser as any).full_name || '',
          phone: (unifiedUser as any).phone || undefined,
          role: (roleName || '').toLowerCase(),
          status: (unifiedUser as any).status,
          is_approved: (unifiedUser as any).is_approved,
        }
      : legacyProfile
        ? {
            id: legacyProfile.id,
            email: legacyProfile.email,
            full_name: legacyProfile.full_name || '',
            phone: legacyProfile.phone || undefined,
            role: (roleName || '').toLowerCase(),
            is_active: legacyProfile.is_active,
          }
        : null;

    return NextResponse.json({
      success: true,
      user: userData.user,
      profile,
    });
  } catch (error: any) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

