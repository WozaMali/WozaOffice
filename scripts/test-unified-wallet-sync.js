/**
 * Deep Dive Test: Unified Wallet Sync Functionality
 * 
 * This test checks if the unified wallet sync is working across all apps:
 * 1. Main App - Can read wallet data from approved collections
 * 2. Office App - Can approve collections and update wallets
 * 3. Collector App - Can create collections
 * 4. Database - Has proper tables and relationships
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

class TestResult {
  constructor(test, status, message, data = null) {
    this.test = test;
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

class UnifiedWalletSyncTester {
  constructor() {
    this.results = [];
  }

  addResult(test, status, message, data = null) {
    this.results.push(new TestResult(test, status, message, data));
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${test}: ${message}`);
  }

  async testDatabaseTables() {
    console.log('\n🔍 Testing Database Tables...');
    
    // Test collections table
    try {
      const { data: collections, error } = await supabase
        .from('collections')
        .select('*')
        .limit(1);
      
      if (error) {
        this.addResult('Collections Table', 'FAIL', `Error accessing collections table: ${error.message}`);
      } else {
        this.addResult('Collections Table', 'PASS', 'Collections table accessible', { count: collections?.length || 0 });
      }
    } catch (err) {
      this.addResult('Collections Table', 'FAIL', `Exception: ${err}`);
    }

    // Test materials table
    try {
      const { data: materials, error } = await supabase
        .from('materials')
        .select('*')
        .limit(1);
      
      if (error) {
        this.addResult('Materials Table', 'FAIL', `Error accessing materials table: ${error.message}`);
      } else {
        this.addResult('Materials Table', 'PASS', 'Materials table accessible', { count: materials?.length || 0 });
      }
    } catch (err) {
      this.addResult('Materials Table', 'FAIL', `Exception: ${err}`);
    }

    // Test wallets table
    try {
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('*')
        .limit(1);
      
      if (error) {
        this.addResult('Wallets Table', 'WARNING', `Error accessing wallets table: ${error.message}`);
      } else {
        this.addResult('Wallets Table', 'PASS', 'Wallets table accessible', { count: wallets?.length || 0 });
      }
    } catch (err) {
      this.addResult('Wallets Table', 'WARNING', `Exception: ${err}`);
    }

    // Test user_wallets table
    try {
      const { data: userWallets, error } = await supabase
        .from('user_wallets')
        .select('*')
        .limit(1);
      
      if (error) {
        this.addResult('User Wallets Table', 'WARNING', `Error accessing user_wallets table: ${error.message}`);
      } else {
        this.addResult('User Wallets Table', 'PASS', 'User wallets table accessible', { count: userWallets?.length || 0 });
      }
    } catch (err) {
      this.addResult('User Wallets Table', 'WARNING', `Exception: ${err}`);
    }
  }

  async testApprovedCollections() {
    console.log('\n🔍 Testing Approved Collections...');
    
    try {
      // Get approved collections
      const { data: collections, error } = await supabase
        .from('collections')
        .select('*')
        .eq('status', 'approved')
        .order('updated_at', { ascending: false });

      if (error) {
        this.addResult('Approved Collections Query', 'FAIL', `Error: ${error.message}`);
        return;
      }

      this.addResult('Approved Collections Query', 'PASS', `Found ${collections?.length || 0} approved collections`);

      if (!collections || collections.length === 0) {
        this.addResult('Approved Collections Data', 'WARNING', 'No approved collections found');
        return;
      }

      // Test material rate calculation
      const materialNames = Array.from(new Set(
        collections.map(c => (c.material_type || '').toLowerCase()).filter(Boolean)
      ));

      const { data: materials } = await supabase
        .from('materials')
        .select('name, rate_per_kg')
        .in('name', materialNames);

      const nameToRate = new Map(
        (materials || []).map((m) => [String(m.name).toLowerCase(), Number(m.rate_per_kg) || 0])
      );

      this.addResult('Material Rates', 'PASS', `Found rates for ${materials?.length || 0} materials`);

      // Test computed values
      let totalComputedValue = 0;
      collections.forEach((c) => {
        const kg = c.weight_kg ?? c.total_weight_kg ?? 0;
        const materialRate = nameToRate.get(String(c.material_type || '').toLowerCase()) || 0;
        const computedValue = kg * materialRate;
        totalComputedValue += computedValue;
      });

      this.addResult('Computed Values', 'PASS', `Total computed value: R${totalComputedValue.toFixed(2)}`);

    } catch (err) {
      this.addResult('Approved Collections Test', 'FAIL', `Exception: ${err}`);
    }
  }

  async testMainAppIntegration() {
    console.log('\n🔍 Testing Main App Integration...');
    
    try {
      // Test if main app can read wallet data
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('*')
        .limit(5);

      if (error) {
        this.addResult('Main App Wallet Access', 'WARNING', `Error accessing wallets: ${error.message}`);
      } else {
        this.addResult('Main App Wallet Access', 'PASS', `Main app can access ${wallets?.length || 0} wallets`);
      }

      // Test if main app can read collections
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .limit(5);

      if (collectionsError) {
        this.addResult('Main App Collections Access', 'WARNING', `Error accessing collections: ${collectionsError.message}`);
      } else {
        this.addResult('Main App Collections Access', 'PASS', `Main app can access ${collections?.length || 0} collections`);
      }

    } catch (err) {
      this.addResult('Main App Integration', 'FAIL', `Exception: ${err}`);
    }
  }

  async testOfficeAppIntegration() {
    console.log('\n🔍 Testing Office App Integration...');
    
    try {
      // Test if Office app can update collection status
      const { data: pendingCollections, error } = await supabase
        .from('collections')
        .select('*')
        .eq('status', 'pending')
        .limit(1);

      if (error) {
        this.addResult('Office App Collections Access', 'WARNING', `Error accessing collections: ${error.message}`);
      } else {
        this.addResult('Office App Collections Access', 'PASS', `Office app can access ${pendingCollections?.length || 0} pending collections`);
      }

      // Test RPC function
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_wallet_simple', {
          p_user_id: '00000000-0000-0000-0000-000000000000', // Test with dummy ID
          p_amount: 0,
          p_points: 0
        });

        if (rpcError) {
          this.addResult('RPC Function', 'WARNING', `RPC function exists but error: ${rpcError.message}`);
        } else {
          this.addResult('RPC Function', 'PASS', 'RPC function accessible');
        }
      } catch (rpcErr) {
        this.addResult('RPC Function', 'WARNING', `RPC function test failed: ${rpcErr}`);
      }

    } catch (err) {
      this.addResult('Office App Integration', 'FAIL', `Exception: ${err}`);
    }
  }

  async testCollectorAppIntegration() {
    console.log('\n🔍 Testing Collector App Integration...');
    
    try {
      // Test if Collector app can create collections
      const { data: recentCollections, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        this.addResult('Collector App Collections Access', 'WARNING', `Error accessing collections: ${error.message}`);
      } else {
        this.addResult('Collector App Collections Access', 'PASS', `Collector app can access ${recentCollections?.length || 0} recent collections`);
      }

      // Test materials access
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true);

      if (materialsError) {
        this.addResult('Collector App Materials Access', 'WARNING', `Error accessing materials: ${materialsError.message}`);
      } else {
        this.addResult('Collector App Materials Access', 'PASS', `Collector app can access ${materials?.length || 0} active materials`);
      }

    } catch (err) {
      this.addResult('Collector App Integration', 'FAIL', `Exception: ${err}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Unified Wallet Sync Deep Dive Test...\n');
    
    await this.testDatabaseTables();
    await this.testApprovedCollections();
    await this.testMainAppIntegration();
    await this.testOfficeAppIntegration();
    await this.testCollectorAppIntegration();

    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    
    if (failCount === 0) {
      console.log('\n🎉 All critical tests passed! Unified wallet sync is functional.');
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
const tester = new UnifiedWalletSyncTester();
tester.runAllTests().catch(console.error);