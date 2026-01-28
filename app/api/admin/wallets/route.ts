import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create admin client with service role key (only if env vars exist)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAdmin) {
      console.error('❌ Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }

    console.log('🔍 API: getWallets called');

    // Try unified user_wallets table first
    let wallets: any[] = [];
    let source: 'user_wallets' | 'wallets' = 'user_wallets';

    const { data: userWallets, error: userWalletsError } = await supabaseAdmin
      .from('user_wallets')
      .select('current_points, total_points_earned, total_points_spent, user_id');

    if (userWalletsError && (userWalletsError.code === 'PGRST205' || userWalletsError.message?.includes("Could not find the table 'public.user_wallets'"))) {
      console.warn('⚠️ API: user_wallets table not found, falling back to wallets table...');
      source = 'wallets';
      
      const { data: legacyWallets, error: legacyError } = await supabaseAdmin
        .from('wallets')
        .select('balance, total_points, user_id');
      
      if (legacyError) {
        console.error('❌ API: Error fetching from wallets table:', legacyError);
        // Return empty data instead of error to prevent dashboard breakage
        return NextResponse.json({
          wallets: [],
          totalWallets: 0,
          totalWalletBalance: 0,
          totalPointsEarned: 0,
          totalPointsSpent: 0,
          source: 'wallets',
          error: legacyError.message
        });
      }
      
      wallets = legacyWallets || [];
      console.log('✅ API: Fetched', wallets.length, 'wallets from legacy wallets table');
    } else if (userWalletsError) {
      console.error('❌ API: Error fetching from user_wallets table:', userWalletsError);
      // Try fallback to wallets table before returning error
      console.warn('⚠️ API: Trying fallback to wallets table...');
      source = 'wallets';
      
      const { data: legacyWallets, error: legacyError } = await supabaseAdmin
        .from('wallets')
        .select('balance, total_points, user_id');
      
      if (legacyError) {
        console.error('❌ API: Fallback to wallets also failed:', legacyError);
        // Return empty data instead of error
        return NextResponse.json({
          wallets: [],
          totalWallets: 0,
          totalWalletBalance: 0,
          totalPointsEarned: 0,
          totalPointsSpent: 0,
          source: 'wallets',
          error: userWalletsError.message
        });
      }
      
      wallets = legacyWallets || [];
      console.log('✅ API: Fetched', wallets.length, 'wallets from legacy wallets table (fallback)');
    } else {
      wallets = userWallets || [];
      console.log('✅ API: Fetched', wallets.length, 'wallets from user_wallets table');
    }

    // Calculate totals
    const totalWallets = wallets.length;
    const totalWalletBalance = wallets.reduce((sum: number, w: any) => {
      const points = source === 'user_wallets' ? w.current_points : w.balance;
      const pointsNum = typeof points === 'number' ? points : (typeof points === 'string' ? parseFloat(points) || 0 : 0);
      return sum + pointsNum;
    }, 0);
    
    const totalPointsEarned = wallets.reduce((sum: number, w: any) => {
      const earned = source === 'user_wallets' ? w.total_points_earned : w.total_points;
      const earnedNum = typeof earned === 'number' ? earned : (typeof earned === 'string' ? parseFloat(earned) || 0 : 0);
      return sum + earnedNum;
    }, 0);
    
    const totalPointsSpent = wallets.reduce((sum: number, w: any) => {
      const spent = w.total_points_spent ?? 0;
      const spentNum = typeof spent === 'number' ? spent : (typeof spent === 'string' ? parseFloat(spent) || 0 : 0);
      return sum + spentNum;
    }, 0);

    console.log('📊 API: Wallet summary:', {
      totalWallets,
      totalWalletBalance,
      totalPointsEarned,
      totalPointsSpent,
      source,
      sampleWallet: wallets.length > 0 ? {
        current_points: wallets[0].current_points,
        balance: wallets[0].balance,
        total_points_earned: wallets[0].total_points_earned,
        total_points: wallets[0].total_points
      } : null
    });

    // Always return the data structure, even if empty
    const response = {
      wallets: wallets || [],
      totalWallets: totalWallets || 0,
      totalWalletBalance: totalWalletBalance || 0,
      totalPointsEarned: totalPointsEarned || 0,
      totalPointsSpent: totalPointsSpent || 0,
      source: source || 'unknown'
    };

    console.log('📤 API: Returning wallet data:', response);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

