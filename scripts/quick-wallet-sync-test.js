/**
 * Quick Test: Verify Unified Wallet Sync Fix
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickTest() {
  console.log('🔍 Quick Test: Unified Wallet Sync Fix\n');
  
  const testUserId = '00000000-0000-0000-0000-000000000000';
  
  try {
    // Test 1: Check if test user exists
    console.log('1. Checking test user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role_id')
      .eq('id', testUserId)
      .single();
    
    if (userError) {
      console.log('❌ Test user not found:', userError.message);
    } else {
      console.log('✅ Test user found:', user.email, `(Role ID: ${user.role_id})`);
    }

    // Test 2: Check wallet access
    console.log('\n2. Testing wallet access...');
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (walletError) {
      console.log('❌ Wallet access error:', walletError.message);
    } else {
      console.log('✅ Wallet accessible:', `Balance: R${wallet.balance}, Points: ${wallet.total_points}`);
    }

    // Test 3: Test RPC function
    console.log('\n3. Testing RPC function...');
    const { data: rpcResult, error: rpcError } = await supabase.rpc('update_wallet_simple', {
      p_user_id: testUserId,
      p_amount: 5.00,
      p_points: 3
    });

    if (rpcError) {
      console.log('❌ RPC function error:', rpcError.message);
    } else {
      console.log('✅ RPC function working:', rpcResult);
    }

    // Test 4: Test wallet balance function
    console.log('\n4. Testing wallet balance function...');
    const { data: balance, error: balanceError } = await supabase.rpc('get_user_wallet_balance', {
      p_user_id: testUserId
    });

    if (balanceError) {
      console.log('❌ Balance function error:', balanceError.message);
    } else {
      console.log('✅ Balance function working:', balance);
    }

    // Test 5: Test collections access
    console.log('\n5. Testing collections access...');
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .limit(5);
    
    if (collectionsError) {
      console.log('❌ Collections access error:', collectionsError.message);
    } else {
      console.log('✅ Collections accessible:', `${collections?.length || 0} collections found`);
    }

    console.log('\n🎉 Quick test completed!');
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

quickTest();
