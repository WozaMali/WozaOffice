import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { userId, role, status } = await req.json()
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Service role not configured' }, { status: 500 })
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { error } = await admin
      .from('users')
      .update({ role: role || 'admin', status: status || 'pending_approval', updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


