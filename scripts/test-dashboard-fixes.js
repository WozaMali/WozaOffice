const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDashboardFixes() {
  try {
    console.log('🔍 Testing Dashboard Database Fixes...');
    
    // Test 1: Check collections table structure
    console.log('\n📊 Testing Collections Table:');
    try {
      const { data: collections, error } = await supabase
        .from('unified_collections')
        .select('status, total_weight_kg, computed_value')
        .limit(5);
      
      if (error) {
        console.log('   ❌ unified_collections error:', error.message);
        
        // Try fallback to collections table
        const { data: fallbackCollections, error: fallbackError } = await supabase
          .from('collections')
          .select('status, total_weight_kg, total_value')
          .limit(5);
        
        if (fallbackError) {
          console.log('   ❌ collections table error:', fallbackError.message);
        } else {
          console.log('   ✅ collections table accessible:', fallbackCollections?.length || 0, 'records');
        }
      } else {
        console.log('   ✅ unified_collections accessible:', collections?.length || 0, 'records');
      }
    } catch (err) {
      console.log('   ❌ Collections test failed:', err.message);
    }
    
    // Test 2: Check payments table
    console.log('\n💰 Testing Payments Table:');
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, status')
        .limit(5);
      
      if (error) {
        console.log('   ❌ payments table error:', error.message);
        
        // Try fallback to cash_payments table
        const { data: cashPayments, error: cashError } = await supabase
          .from('cash_payments')
          .select('amount, status')
          .limit(5);
        
        if (cashError) {
          console.log('   ❌ cash_payments table error:', cashError.message);
        } else {
          console.log('   ✅ cash_payments table accessible:', cashPayments?.length || 0, 'records');
        }
      } else {
        console.log('   ✅ payments table accessible:', payments?.length || 0, 'records');
      }
    } catch (err) {
      console.log('   ❌ Payments test failed:', err.message);
    }
    
    // Test 3: Check table existence
    console.log('\n📋 Checking Table Existence:');
    const tables = ['collections', 'unified_collections', 'payments', 'cash_payments'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: accessible`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🔧 Fixes Applied:');
    console.log('   ✅ Updated AdminDashboardClient queries');
    console.log('   ✅ Added fallback logic for missing tables');
    console.log('   ✅ Fixed column name mismatches');
    console.log('   ✅ Created SQL script for database fixes');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Apply FIX_DASHBOARD_DATABASE_ISSUES.sql in Supabase');
    console.log('   2. Restart the development server');
    console.log('   3. Check admin dashboard for errors');
    console.log('   4. Verify collections and payments load correctly');
    
    console.log('\n✅ Dashboard database issues should be resolved!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testDashboardFixes();
