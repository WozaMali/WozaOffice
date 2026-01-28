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

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    const ctype = req.headers.get('content-type') || '';
    let name: string | undefined;
    let description: string | undefined;
    let points_required: number | undefined;
    let category: string | undefined;
    let is_active: boolean = true;
    let logo_url: string | undefined;
    let redeem_url: string | null | undefined;
    let order_url: string | null | undefined;

    if (ctype.includes('multipart/form-data')) {
      const form = await req.formData();
      name = String(form.get('name') || '') || undefined;
      description = String(form.get('description') || '') || undefined;
      const pr = form.get('points_required');
      points_required = pr != null ? Number(pr) : undefined;
      category = String(form.get('category') || '') || undefined;
      const ia = form.get('is_active');
      is_active = ia != null ? (String(ia) === 'true' || String(ia) === '1') : true;
      redeem_url = (form.get('redeem_url') as string) || null;
      order_url = (form.get('order_url') as string) || null;
      const file = form.get('logo') as File | null;
      if (file && file.size > 0) {
        // Ensure bucket exists
        try {
          const { data: buckets } = await (supabaseAdmin as any).storage.listBuckets?.() || { data: [] };
          const exists = Array.isArray(buckets) && buckets.some((b: any) => b.name === 'reward-logos');
          if (!exists && (supabaseAdmin as any).storage.createBucket) {
            await (supabaseAdmin as any).storage.createBucket('reward-logos', { public: true });
          }
        } catch {}
        const safeName = (name || 'reward').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const timestamp = Date.now();
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `${safeName}/${safeName}-${timestamp}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage.from('reward-logos').upload(path, file, { upsert: false });
        if (!upErr) {
          const { data } = supabaseAdmin.storage.from('reward-logos').getPublicUrl(path);
          logo_url = data.publicUrl;
        }
      }
    } else {
      const body = await req.json();
      name = body?.name;
      description = body?.description;
      points_required = typeof body?.points_required === 'number' ? body.points_required : Number(body?.points_required);
      category = body?.category;
      is_active = body?.is_active ?? true;
      logo_url = body?.logo_url;
      redeem_url = body?.redeem_url ?? null;
      order_url = body?.order_url ?? null;
    }

    if (!name || !category || typeof points_required !== 'number' || Number.isNaN(points_required)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const insertPayload: any = {
      name,
      description: description || '',
      points_required,
      category,
      is_active,
    };
    if (logo_url) insertPayload.logo_url = logo_url;
    if (redeem_url) insertPayload.redeem_url = redeem_url;
    if (order_url) insertPayload.order_url = order_url;

    const { data, error } = await supabaseAdmin
      .from('rewards')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/admin/rewards] Insert error:', {
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code,
      });
      return NextResponse.json({
        error: (error as any)?.message || 'Insert failed',
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code,
      }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error('[API /api/admin/rewards] Unexpected error:', e);
    const message = e?.message || 'Internal error';
    const status = message.includes('Missing Supabase service') ? 500 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


