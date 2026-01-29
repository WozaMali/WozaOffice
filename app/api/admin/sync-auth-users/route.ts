import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(_req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: 'Service role key missing' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
 
    // 1) Fetch all office users (admins/staff) with emails
    const { data: officeUsers, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, phone, role')
      .not('email', 'is', null)

    if (usersErr) {
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 })
    }

    const desiredEmails = new Set<string>((officeUsers || []).map(u => (u.email || '').trim().toLowerCase()))

    // 2) List existing auth users and build a set of emails
    const existingEmails = new Set<string>()
    let page = 1
    const perPage = 1000
    // Iterate pages until we get less than perPage
    // @ts-ignore auth.admin.listUsers types
    while (true) {
      const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ page, perPage })
      if (error) {
        return NextResponse.json({ success: false, error: `List users failed: ${error.message}` }, { status: 500 })
      }
      const users = (data?.users || []) as Array<{ email?: string }>
      for (const u of users) {
        if (u.email) existingEmails.add(u.email.trim().toLowerCase())
      }
      if (!data || users.length < perPage) break
      page += 1
    }

    // 3) For any office user email not in auth, create auth user (email_confirmed)
    const created: Array<{ email: string }> = []
    for (const u of (officeUsers || [])) {
      const email = (u.email || '').trim().toLowerCase()
      if (!email || existingEmails.has(email)) continue
      const password = 'TempPassword123!'
      const { error: createErr } = await (supabaseAdmin as any).auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          phone: u.phone || '',
          role: u.role || 'admin'
        }
      })
      if (createErr) {
        // Continue syncing others; report failure
         
        console.error('Auth create failed for', email, createErr)
        continue
      }
      created.push({ email })
    }

    return NextResponse.json({ success: true, created })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}

