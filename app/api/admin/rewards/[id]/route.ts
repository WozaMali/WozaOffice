import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service configuration');
  }
  return createClient(url, serviceKey);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabaseAdmin = getAdminClient();
    const { id: rewardId } = await params;
    if (!rewardId) {
      return NextResponse.json({ error: 'Missing reward id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('rewards')
      .delete()
      .eq('id', rewardId);

    if (error) {
       
      console.error('[API /api/admin/rewards/:id] Delete error:', {
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code,
      });
      return NextResponse.json({ error: (error as any)?.message || 'Delete failed' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
     
    console.error('[API /api/admin/rewards/:id] Unexpected error:', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabaseAdmin = getAdminClient();
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing reward id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const update: any = {};
    if (typeof body?.name === 'string') update.name = body.name;
    if (typeof body?.description === 'string') update.description = body.description;
    if (body?.points_required != null) {
      const pr = Number(body.points_required);
      if (!Number.isNaN(pr)) update.points_required = pr;
    }
    if (typeof body?.category === 'string') update.category = body.category;
    if (typeof body?.is_active === 'boolean') update.is_active = body.is_active;
    if (typeof body?.logo_url === 'string') update.logo_url = body.logo_url;
    if (body?.redeem_url !== undefined) update.redeem_url = body.redeem_url || null;
    if (body?.order_url !== undefined) update.order_url = body.order_url || null;
    update.updated_at = new Date().toISOString();

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('rewards')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
       
      console.error('[API /api/admin/rewards/:id] Update error:', {
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code,
      });
      return NextResponse.json({ error: (error as any)?.message || 'Update failed' }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
     
    console.error('[API /api/admin/rewards/:id] Unexpected error (PATCH):', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}


