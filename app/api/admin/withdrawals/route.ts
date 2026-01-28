import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔑 API Route Environment Check:');
console.log('🔑 SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('🔑 SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
console.log('🔑 SERVICE_ROLE_KEY length:', supabaseServiceKey?.length || 0);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
console.log('✅ API Route: Supabase admin client created');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    console.log('🔍 API: getWithdrawals called with status:', status);

    // Query withdrawal requests using admin client
    let query = supabaseAdmin
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    console.log('🔍 API: About to execute query with admin client');
    const { data: withdrawals, error } = await query;
    
    if (error) {
      console.error('❌ API: Error fetching withdrawals:', error);
      console.error('❌ API: Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('📊 API: Raw withdrawal data:', withdrawals?.length || 0, 'records');

    // Get user profiles for enrichment
    const userIds = Array.from(new Set((withdrawals || []).map(r => r.user_id).filter(Boolean)));
    console.log('👥 API: User IDs to fetch:', userIds);

    let profiles: any[] = [];
    let users: any[] = [];

    if (userIds.length > 0) {
      // Try to get from user_profiles table
      const { data: profilesData } = await supabaseAdmin
        .from('user_profiles')
        .select('id, user_id, full_name, email')
        .in('user_id', userIds);

      // Try to get from users table
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      profiles = profilesData || [];
      users = usersData || [];
    }

    console.log('👤 API: User profiles:', profiles.length);
    console.log('👤 API: Users:', users.length);

    // Enrich withdrawal data with user information
    const profileMap: Record<string, any> = {};
    profiles.forEach((p: any) => { profileMap[String(p.user_id)] = p; });
    const usersMap: Record<string, any> = {};
    users.forEach((u: any) => { usersMap[String(u.id)] = u; });

    const enrichedWithdrawals = (withdrawals || []).map((withdrawal: any) => {
      const byProfile = profileMap[String(withdrawal.user_id)] || null;
      const byUser = usersMap[String(withdrawal.user_id)] || null;
      const userBlock = byProfile || byUser || null;
      
      return {
        ...withdrawal,
        user: userBlock ? { 
          full_name: userBlock.full_name, 
          email: userBlock.email 
        } : null
      };
    });

    console.log('✅ API: Final enriched withdrawals:', enrichedWithdrawals.length);

    return NextResponse.json({ 
      withdrawals: enrichedWithdrawals,
      count: enrichedWithdrawals.length 
    });

  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
