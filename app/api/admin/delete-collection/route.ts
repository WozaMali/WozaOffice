import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { collectionId } = await req.json().catch(() => ({}));
    if (!collectionId || typeof collectionId !== 'string') {
      return NextResponse.json({ error: 'collectionId required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Helper to ignore missing-table errors gracefully
    const safeDelete = async (table: string, match: Record<string, any>): Promise<{ ok: boolean; message?: string }> => {
      try {
        const { error } = await supabase.from(table).delete().match(match);
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e?.message || String(e) };
      }
    };

    // Prefer SECURITY DEFINER RPC if available (bypasses RLS cleanly)
    try {
      const { error: rpcErr } = await (supabase as any).rpc('admin_delete_collection', { _id: collectionId });
      if (!rpcErr) {
        return NextResponse.json({ ok: true, via: 'rpc' }, { status: 200 });
      }
       
      console.debug('RPC admin_delete_collection not available or failed, falling back to direct deletes:', rpcErr?.message);
    } catch (e: any) {
       
      console.debug('RPC call exception, falling back to direct deletes:', e?.message || e);
    }

    // Delete children in parallel
    // Wallet transactions may reference the collection via different fields across environments
    const deleteWalletTransactions = async () => {
      // Primary canonical link based on your schema: source_id = collectionId
      const primary = await safeDelete('wallet_transactions', { source_id: collectionId });
      // Also clear by type just in case (collection_approval records)
      const typed = await safeDelete('wallet_transactions', { source_id: collectionId, source_type: 'collection_approval' });
      return [primary, typed];
    };

    console.log('🗑️ Starting deletion of collection:', collectionId);

    const children = [
      await safeDelete('collection_photos', { collection_id: collectionId }),
      await safeDelete('collection_materials', { collection_id: collectionId }),
      // Ensure Main app History no longer shows this by removing queue entries
      await safeDelete('wallet_update_queue', { collection_id: collectionId }),
      // Remove any Green Scholar PET contribution rows tied to this collection
      await safeDelete('green_scholar_transactions', { source_type: 'collection', source_id: collectionId }),
      ...(await deleteWalletTransactions()),
      await safeDelete('transactions', { source_id: collectionId })
    ];

    // Delete parents in parallel
    const parents = await Promise.all([
      safeDelete('unified_collections', { id: collectionId }),
      safeDelete('collections', { id: collectionId })
    ]);

    // Log results of delete operations
    const failedChildren = children.filter(r => !r.ok);
    const failedParents = parents.filter(r => !r.ok);
    
    if (failedChildren.length > 0 || failedParents.length > 0) {
      console.error('❌ Some delete operations failed:', {
        collectionId,
        failedChildren: failedChildren.map(r => ({ table: 'child', message: r.message })),
        failedParents: failedParents.map(r => ({ table: 'parent', message: r.message }))
      });
    } else {
      console.log('✅ All delete operations completed successfully');
    }

    // Best-effort refresh of Green Scholar balance snapshot (ignore if RPC not present)
    try {
      await (supabase as any).rpc('refresh_green_scholar_fund_balance');
    } catch (refreshError: any) {
       
      console.warn('Green Scholar balance refresh skipped:', refreshError?.message || refreshError);
    }

    // Verify deletion actually happened (avoid false positive OK)
    const verifyUnified = await supabase
      .from('unified_collections')
      .select('id')
      .eq('id', collectionId)
      .maybeSingle();

    const verifyLegacy = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .maybeSingle();

    // Also verify no wallet_transactions or wallet_update_queue remain linked by common patterns
    const verifyWalletTx = await (async () => {
      try {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('id')
          .eq('source_id', collectionId)
          .limit(1);
        if (error) return { remaining: false };
        return { remaining: Array.isArray(data) && data.length > 0 };
      } catch { return { remaining: false }; }
    })();

    // Verify no Green Scholar PET contribution remains for this collection
    const verifyGreenScholar = await (async () => {
      try {
        const { data, error } = await supabase
          .from('green_scholar_transactions')
          .select('id')
          .eq('source_type', 'collection')
          .eq('source_id', collectionId)
          .limit(1);
        if (error) return { remaining: false };
        return { remaining: Array.isArray(data) && data.length > 0 };
      } catch { return { remaining: false }; }
    })();

    const verifyQueue = await (async () => {
      try {
        const { data, error } = await supabase
          .from('wallet_update_queue')
          .select('collection_id')
          .eq('collection_id', collectionId)
          .limit(1);
        if (error) return { remaining: false };
        return { remaining: Array.isArray(data) && data.length > 0 };
      } catch {
        return { remaining: false };
      }
    })();

    if ((!verifyUnified.error && verifyUnified.data) || (!verifyLegacy.error && verifyLegacy.data) || verifyWalletTx.remaining || verifyGreenScholar.remaining || verifyQueue.remaining) {
      const reasons = [...children, ...parents].filter(r => !r.ok).map(r => r.message).filter(Boolean);
      console.error('❌ Collection deletion verification failed:', {
        collectionId,
        verifyUnified: verifyUnified.data ? 'still exists' : 'deleted',
        verifyLegacy: verifyLegacy.data ? 'still exists' : 'deleted',
        walletTxRemaining: verifyWalletTx.remaining,
        greenScholarRemaining: verifyGreenScholar.remaining,
        queueRemaining: verifyQueue.remaining,
        failedOperations: reasons
      });
      return NextResponse.json({ ok: false, reason: 'not_deleted', details: reasons }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}


