import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: withdrawalId } = await params;
    const body = await request.json();
    const { status, adminNotes, payoutMethod } = body;

    console.log('🔍 API: Updating withdrawal status:', { withdrawalId, status, adminNotes, payoutMethod });

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const update: any = {
      status,
      notes: adminNotes || null,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved' || status === 'completed' || status === 'processing') {
      update.processed_at = new Date().toISOString();
    }

    if (payoutMethod) {
      update.payout_method = payoutMethod;
    }

    // Update the withdrawal request
    const { data: updatedWithdrawal, error: updateError } = await supabaseAdmin
      .from('withdrawal_requests')
      .update(update)
      .eq('id', withdrawalId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ API: Error updating withdrawal:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('✅ API: Withdrawal updated successfully:', updatedWithdrawal);

    // If approved, handle wallet balance deduction
    if (status === 'approved') {
      try {
        // Fetch withdrawal details
        const { data: withdrawal, error: fetchError } = await supabaseAdmin
          .from('withdrawal_requests')
          .select('user_id, amount')
          .eq('id', withdrawalId)
          .single();

        if (fetchError || !withdrawal) {
          console.warn('⚠️ Could not fetch withdrawal after approval:', fetchError);
          return NextResponse.json({ 
            withdrawal: updatedWithdrawal,
            warning: 'Withdrawal approved but wallet balance not updated'
          });
        }

        // Try unified user_wallets first; fallback to legacy wallets
        let newBalance: number | null = null;
        let updatedVia: 'user_wallets' | 'wallets' | null = null;

        // Attempt unified user_wallets
        try {
          const { data: uw, error: uwErr } = await supabaseAdmin
            .from('user_wallets')
            .select('current_points')
            .eq('user_id', withdrawal.user_id)
            .maybeSingle();

          // If table exists and row found, update it
          if (!uwErr && uw) {
            const current = Number(uw.current_points || 0);
            newBalance = Math.max(0, current - Number(withdrawal.amount || 0));
            const { error: uwUpdateErr } = await supabaseAdmin
              .from('user_wallets')
              .update({ current_points: newBalance })
              .eq('user_id', withdrawal.user_id);
            if (uwUpdateErr) {
              console.warn('⚠️ Could not update user_wallets balance:', uwUpdateErr);
              newBalance = null; // force fallback
            } else {
              updatedVia = 'user_wallets';
            }
          }
        } catch (e) {
          // Likely table missing; proceed to legacy fallback
        }

        // Fallback to legacy wallets if unified path didn't update
        if (newBalance === null) {
          const { data: currentWallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', withdrawal.user_id)
            .maybeSingle();

          if (walletError || !currentWallet) {
            console.warn('⚠️ Could not fetch wallet for user:', withdrawal.user_id);
            return NextResponse.json({ 
              withdrawal: updatedWithdrawal,
              warning: 'Withdrawal approved but wallet balance not updated'
            });
          }

          const current = Number(currentWallet.balance || 0);
          newBalance = Math.max(0, current - Number(withdrawal.amount || 0));

          const { error: balanceError } = await supabaseAdmin
            .from('wallets')
            .update({ balance: newBalance })
            .eq('user_id', withdrawal.user_id);

          if (balanceError) {
            console.warn('⚠️ Could not update wallet balance (wallets):', balanceError);
            return NextResponse.json({ 
              withdrawal: updatedWithdrawal,
              warning: 'Withdrawal approved but wallet balance not updated'
            });
          }
          updatedVia = 'wallets';
        }

        // Create wallet transaction record (works for both schemas)
        try {
          const { error: transactionError } = await supabaseAdmin
            .from('wallet_transactions')
            .insert({
              user_id: withdrawal.user_id,
              amount: -Number(withdrawal.amount || 0),
              type: 'withdrawal',
              description: `Withdrawal approved - ${payoutMethod || 'bank_transfer'} (${updatedVia})`,
              reference_id: withdrawalId,
              balance_after: newBalance
            });
          if (transactionError) {
            console.warn('⚠️ Could not create wallet transaction:', transactionError);
          }
        } catch (e) {
          console.warn('⚠️ Wallet transaction insert failed:', e);
        }

        console.log('✅ API: Wallet balance updated successfully via', updatedVia);

      } catch (walletError) {
        console.error('❌ API: Error updating wallet:', walletError);
        return NextResponse.json({ 
          withdrawal: updatedWithdrawal,
          warning: 'Withdrawal approved but wallet operations failed'
        });
      }
    }

    return NextResponse.json({ 
      withdrawal: updatedWithdrawal,
      message: 'Withdrawal status updated successfully'
    });

  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
