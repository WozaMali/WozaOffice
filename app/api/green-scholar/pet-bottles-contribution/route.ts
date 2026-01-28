import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string

export async function POST(req: Request) {
  try {
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured for Supabase' }, { status: 500 })
    }
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { collectionId } = await req.json()
    if (!collectionId) {
      return NextResponse.json({ error: 'collectionId is required' }, { status: 400 })
    }

    // Compute PET-only total for the collection (use fixed C1.50/kg)
    const { data: rows, error: qErr } = await supabase
      .from('collection_materials')
      .select('quantity, materials(name)')
      .eq('collection_id', collectionId)

    if (qErr) throw qErr
    // PET only (exclude generic plastics)
    const items = (rows || []).filter((r: any) => (r.materials?.name || '').toLowerCase().includes('pet'))
    const totalKg = items.reduce((s: number, r: any) => s + Number(r.quantity || 0), 0)
    const petRate = 1.5 // C1.50 per kg
    const petTotal = Number((totalKg * petRate).toFixed(2))

    // If nothing to contribute, return ok
    if (!petTotal || petTotal <= 0) {
      return NextResponse.json({ ok: true, created: false, amount: 0 })
    }

    // Idempotency: if a pet_contribution already exists for this collection, skip
    const { data: existing, error: existErr } = await supabase
      .from('green_scholar_transactions')
      .select('id')
      .eq('source_type', 'collection')
      .eq('source_id', collectionId)
      .in('transaction_type', ['pet_contribution'])
      .limit(1)

    if (!existErr && Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ ok: true, created: false, amount: petTotal })
    }

    // Insert PET contribution at fixed rate
    const { error: insErr } = await supabase
      .from('green_scholar_transactions')
      .insert({
        transaction_type: 'pet_contribution',
        amount: petTotal,
        source_type: 'collection',
        source_id: collectionId,
        description: `PET contribution from collection ${collectionId} @ C${petRate.toFixed(2)}/kg`
      })
    if (insErr) throw insErr

    return NextResponse.json({ ok: true, created: true, amount: petTotal })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}


