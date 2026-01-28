import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { withdrawalId } = await req.json().catch(() => ({}))
    if (!withdrawalId || typeof withdrawalId !== 'string') {
      return NextResponse.json({ error: 'withdrawalId required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

    // Delete any wallet transactions linked to this withdrawal (by source_id/source_type pattern)
    const safeDelete = async (table: string, match: Record<string, any>) => {
      try {
        const { error } = await (supabase as any).from(table).delete().match(match)
        return { ok: !error, message: error?.message }
      } catch (e: any) {
        return { ok: false, message: e?.message || String(e) }
      }
    }

    // Try SECURITY DEFINER RPC first if available
    try {
      const { data: rpcResult, error: rpcErr } = await (supabase as any).rpc('admin_delete_withdrawal', { _id: withdrawalId })
      if (!rpcErr && rpcResult?.success) {
        return NextResponse.json({ ok: true, via: 'rpc', result: rpcResult })
      }
      console.log('RPC failed or not available:', rpcErr?.message || 'No result')
    } catch (e: any) {
      console.log('RPC not available:', e?.message || String(e))
    }

    // Fallback: Manual deletion
    console.log('Using fallback deletion method')
    
    // Pre-update: mark as cancelled and zero amount to bypass possible constraints
    try {
      const { error: updateErr } = await (supabase as any)
        .from('withdrawal_requests')
        .update({ status: 'cancelled', amount: 0, updated_at: new Date().toISOString() })
        .eq('id', withdrawalId)
      
      if (updateErr) console.log('Pre-update failed:', updateErr.message)
    } catch (e: any) {
      console.log('Pre-update error:', e?.message || String(e))
    }

    // Child cleanup (best-effort)
    const childResults = await Promise.all([
      safeDelete('wallet_transactions', { source_id: withdrawalId }),
      safeDelete('wallet_transactions', { source_id: withdrawalId, source_type: 'withdrawal' }),
      safeDelete('wallet_transactions', { reference_id: withdrawalId })
    ])
    
    console.log('Child cleanup results:', childResults)

    // Parent delete
    const { error: delErr } = await (supabase as any)
      .from('withdrawal_requests')
      .delete()
      .match({ id: withdrawalId })

    if (delErr) {
      console.log('Parent delete failed:', delErr.message)
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 })
    }

    console.log('Manual deletion successful')
    return NextResponse.json({ ok: true, via: 'manual' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


