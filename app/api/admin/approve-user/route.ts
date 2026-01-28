import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { userId, reason } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) {
      return NextResponse.json({ success: false, error: 'Service role missing' }, { status: 500 });
    }

    const admin = createClient(url, service);

    // Generate a strong temporary password
    const tmp = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => (b % 36).toString(36))
      .join('') + '!A9';

    // 1) Mark user approved and active
    const nowIso = new Date().toISOString();
    const { error: updErr } = await admin
      .from('users')
      .update({ status: 'active', is_approved: true, approval_date: nowIso, updated_at: nowIso })
      .eq('id', userId);
    if (updErr) throw updErr;

    // 2) Fetch user email
    const { data: profile } = await admin
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
    if (!profile?.email) {
      return NextResponse.json({ success: true, warning: 'Approved but email missing' });
    }

    // 3) Set a temporary password and flag must_change_password
    const { error: updAuthErr } = await (admin as any).auth.admin.updateUserById(userId, {
      password: tmp,
      user_metadata: { must_change_password: true }
    });
    if (updAuthErr) throw updAuthErr;

    // 4) Optional: store temp password in a transient table or return it for UI display
    // For security, do not persist plaintext server-side. We'll return it for immediate display.

    return NextResponse.json({ success: true, tempPassword: tmp });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


