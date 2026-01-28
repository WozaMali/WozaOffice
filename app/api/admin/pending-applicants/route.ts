import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Service role not configured' }, { status: 500 })
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    const { data, error } = await admin
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        status,
        employee_number,
        subdivision,
        city,
        created_at,
        updated_at
      `)
      .in('status', ['pending_approval','pending'])
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


