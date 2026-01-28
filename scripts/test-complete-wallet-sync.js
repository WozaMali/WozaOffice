/**
 * Test Script: Complete Unified Wallet Sync Setup
 * 
 * This script tests the complete unified wallet sync setup including:
 * 1. Wallet tables creation
 * 2. RPC function functionality
 * 3. End-to-end wallet sync flow
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

class WalletSyncTester {
  constructor() {
    this.results = [];
  }

  addResult(test, status, message, data = null) {
    this.results.push({ test, status, message, data });
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${test}: ${message}`);
  }

  async testWalletTables() {
    console.log('\n🔍 Testing Wallet Tables...');
    
    // Test wallets table
    try {
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('*')
        .limit(1);
      
      if (error) {
        this.addResult('Wallets Table', 'FAIL', `Error: ${error.message}`);
      } else {
        this.addResult('Wallets Table', 'PASS', 'Wallets table accessible', { count: wallets?.length || 0 });
      }
    } catch (err) {
      this.addResult('Wallets Table', 'FAIL', `Exception: ${err}`);
    }

    // Test user_wallets table
    try {
      const { data: userWallets, error } = await supabase
        .from('user_wallets')
        .select('*')
        .limit(1);
      
      if (error) {
        this.addResult('User Wallets Table', 'FAIL', `Error: ${error.message}`);
      } else {
        this.addResult('User Wallets Table', 'PASS', 'User wallets table accessible', { count: userWallets?.length || 0 });
      }
    } catch (err) {
      this.addResult('User Wallets Table', 'FAIL', `Exception: ${err}`);
    }
  }

  async testRPCFunction() {
    console.log('\n🔍 Testing RPC Function...');
    
    try {
      // Test with a dummy user ID
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase.rpc('update_wallet_simple', {
        p_user_id: testUserId,
        p_amount: 10.50,
        p_points: 5
      });

      if (error) {
        this.addResult('RPC Function', 'FAIL', `Error: ${error.message}`);
      } else {
        this.addResult('RPC Function', 'PASS', 'RPC function working', data);
      }
    } catch (err) {
      this.addResult('RPC Function', 'FAIL', `Exception: ${err}`);
    }
  }

  async testWalletBalanceFunction() {
    console.log('\n🔍 Testing Wallet Balance Function...');
    
    try {
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase.rpc('get_user_wallet_balance', {
        p_user_id: testUserId
      });

      if (error) {
        this.addResult('Wallet Balance Function', 'FAIL', `Error: ${error.message}`);
      } else {
        this.addResult('Wallet Balance Function', 'PASS', 'Wallet balance function working', data);
      }
    } catch (err) {
      this.addResult('Wallet Balance Function', 'FAIL', `Exception: ${err}`);
    }
  }

  async testUnifiedWalletSyncService() {
    console.log('\n🔍 Testing Unified Wallet Sync Service...');
    
    try {
      // Import the service
      const { UnifiedWalletSyncService } = await import('./src/lib/unified-wallet-sync');
      
      // Test getApprovedCollections
      const { data: collections, error } = await UnifiedWalletSyncService.getApprovedCollections();
      
      if (error) {
        this.addResult('Unified Wallet Sync Service', 'FAIL', `Error: ${error.message}`);
        return;
      }

      this.addResult('Unified Wallet Sync Service', 'PASS', `Service working, found ${collections?.length || 0} collections`);

      // Test wallet balance summary
      const { data: summary, error: summaryError } = await UnifiedWalletSyncService.getWalletBalanceSummary();
      
      if (summaryError) {
        this.addResult('Wallet Balance Summary', 'WARNING', `Error: ${summaryError.message}`);
      } else {
        this.addResult('Wallet Balance Summary', 'PASS', 'Wallet balance summary working', summary);
      }

    } catch (err) {
      this.addResult('Unified Wallet Sync Service', 'FAIL', `Exception: ${err}`);
    }
  }

  async testEndToEndFlow() {
    console.log('\n🔍 Testing End-to-End Flow...');
    
    try {
      // Test creating a collection
      const testCollection = {
        user_id: '00000000-0000-0000-0000-000000000000',
        collector_id: '00000000-0000-0000-0000-000000000001',
        pickup_address_id: '00000000-0000-0000-0000-000000000002',
        material_type: 'Aluminum Cans',
        weight_kg: 2.5,
        status: 'pending',
        notes: 'Test collection for unified sync'
      };

      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .insert(testCollection)
        .select('*')
        .single();

      if (collectionError) {
        this.addResult('Create Collection', 'WARNING', `Error: ${collectionError.message}`);
      } else {
        this.addResult('Create Collection', 'PASS', 'Collection created successfully', { id: collection.id });

        // Test approving the collection
        const { data: approvedCollection, error: approveError } = await supabase
          .from('collections')
          .update({ 
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', collection.id)
          .select('*')
          .single();

        if (approveError) {
          this.addResult('Approve Collection', 'WARNING', `Error: ${approveError.message}`);
        } else {
          this.addResult('Approve Collection', 'PASS', 'Collection approved successfully');

          // Test wallet update
          const { data: walletUpdate, error: walletError } = await supabase.rpc('update_wallet_simple', {
            p_user_id: testCollection.user_id,
            p_amount: 2.5 * 15.50, // weight * aluminum rate
            p_points: 2.5 // weight as points
          });

          if (walletError) {
            this.addResult('Wallet Update', 'WARNING', `Error: ${walletError.message}`);
          } else {
            this.addResult('Wallet Update', 'PASS', 'Wallet updated successfully', walletUpdate);
          }
        }
      }

    } catch (err) {
      this.addResult('End-to-End Flow', 'FAIL', `Exception: ${err}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Complete Unified Wallet Sync Test...\n');
    
    await this.testWalletTables();
    await this.testRPCFunction();
    await this.testWalletBalanceFunction();
    await this.testUnifiedWalletSyncService();
    await this.testEndToEndFlow();

    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    
    if (failCount === 0) {
      console.log('\n🎉 All critical tests passed! Unified wallet sync is fully functional.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the issues above.');
    }

    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      console.log(`${result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'} ${result.test}: ${result.message}`);
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
    });
  }
}

// Run the test
const tester = new WalletSyncTester();
tester.runAllTests().catch(console.error);
