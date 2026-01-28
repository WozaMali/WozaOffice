import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Service role not configured' }, { status: 500 })
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const body = await req.json()
    const {
      userId,
      email,
      firstName,
      lastName,
      dateOfBirth,
      phone,
      addressLine1,
      addressLine2,
      townshipId,
      suburb,
      city,
      postalCode,
    } = body || {}

    if (!userId || !email) {
      return NextResponse.json({ success: false, error: 'Missing userId or email' }, { status: 400 })
    }

    const street = [addressLine1, addressLine2].filter(Boolean).join(' ').trim() || null

    const { error } = await admin
      .from('users')
      .upsert({
        id: userId,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: [firstName, lastName].filter(Boolean).join(' ') || null,
        date_of_birth: dateOfBirth || null,
        phone: phone || null,
        street_addr: street,
        township_id: townshipId || null,
        subdivision: suburb || null,
        city: city || null,
        postal_code: postalCode || null,
        role: 'admin',
        status: 'pending_approval',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


