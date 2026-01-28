/**
 * Debug script to check PET contributions in the database
 * This script will help identify why PET transactions are not showing up
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url') {
  console.log('❌ Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function debugPetContributions() {
  console.log('🔍 Debugging PET Contributions...\n');

  try {
    // 1. Check if green_scholar_transactions table exists and has data
    console.log('1. Checking green_scholar_transactions table...');
    const { data: transactions, error: transError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (transError) {
      console.log('❌ Error querying green_scholar_transactions:', transError.message);
    } else {
      console.log(`✅ Found ${transactions.length} transactions in green_scholar_transactions`);
      if (transactions.length > 0) {
        console.log('📋 Recent transactions:');
        transactions.forEach((t, i) => {
          console.log(`   ${i + 1}. ${t.transaction_type} - R${t.amount} - ${t.description} - ${t.created_at}`);
        });
      }
    }

    // 2. Check specifically for pet_contribution transactions
    console.log('\n2. Checking for pet_contribution transactions...');
    const { data: petContributions, error: petError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .eq('transaction_type', 'pet_contribution')
      .order('created_at', { ascending: false });

    if (petError) {
      console.log('❌ Error querying pet_contribution transactions:', petError.message);
    } else {
      console.log(`✅ Found ${petContributions.length} pet_contribution transactions`);
      if (petContributions.length > 0) {
        console.log('📋 PET contributions:');
        petContributions.forEach((t, i) => {
          console.log(`   ${i + 1}. R${t.amount} - ${t.description} - ${t.created_at}`);
        });
      }
    }

    // 3. Check green_scholar_fund_balance table
    console.log('\n3. Checking green_scholar_fund_balance table...');
    const { data: balance, error: balanceError } = await supabase
      .from('green_scholar_fund_balance')
      .select('*')
      .order('last_updated', { ascending: false })
      .limit(1);

    if (balanceError) {
      console.log('❌ Error querying green_scholar_fund_balance:', balanceError.message);
    } else {
      console.log(`✅ Found ${balance.length} balance records`);
      if (balance.length > 0) {
        const b = balance[0];
        console.log('📊 Current balance:');
        console.log(`   Total Balance: R${b.total_balance || 0}`);
        console.log(`   PET Donations: R${b.pet_donations_total || 0}`);
        console.log(`   Direct Donations: R${b.direct_donations_total || 0}`);
        console.log(`   Expenses: R${b.expenses_total || 0}`);
        console.log(`   Last Updated: ${b.last_updated}`);
      }
    }

    // 4. Check for collections with PET materials
    console.log('\n4. Checking for collections with PET materials...');
    const { data: collections, error: collError } = await supabase
      .from('unified_collections')
      .select('id, status, created_at')
      .in('status', ['approved', 'completed'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (collError) {
      console.log('❌ Error querying collections:', collError.message);
    } else {
      console.log(`✅ Found ${collections.length} approved collections`);
      
      // Check materials for each collection
      for (const collection of collections) {
        const { data: materials, error: matError } = await supabase
          .from('collection_materials')
          .select('quantity, materials(name)')
          .eq('collection_id', collection.id);

        if (!matError && materials) {
          const petMaterials = materials.filter(m => 
            (m.materials?.name || '').toLowerCase().includes('pet')
          );
          if (petMaterials.length > 0) {
            const totalKg = petMaterials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
            console.log(`   Collection ${collection.id}: ${petMaterials.length} PET materials, ${totalKg}kg total`);
          }
        }
      }
    }

    // 5. Test the API endpoint directly
    console.log('\n5. Testing PET contribution API...');
    if (collections && collections.length > 0) {
      const testCollectionId = collections[0].id;
      console.log(`   Testing with collection ID: ${testCollectionId}`);
      
      try {
        const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/green-scholar/pet-bottles-contribution`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId: testCollectionId })
        });
        
        const result = await response.json();
        console.log(`   API Response: ${response.status} - ${JSON.stringify(result)}`);
      } catch (apiError) {
        console.log(`   ❌ API Error: ${apiError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the debug
debugPetContributions().catch(console.error);
