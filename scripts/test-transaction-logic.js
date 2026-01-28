/**
 * Test script to check transaction logic and identify the mismatch
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function testTransactionLogic() {
  console.log('🔍 Testing Transaction Logic...\n');

  try {
    // 1. Check what transaction types exist in the database
    console.log('1. Checking existing transaction types...');
    const { data: allTransactions, error: allError } = await supabase
      .from('green_scholar_transactions')
      .select('transaction_type, amount, description, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (allError) {
      console.log('❌ Error querying all transactions:', allError.message);
    } else {
      console.log(`✅ Found ${allTransactions.length} total transactions`);
      
      // Group by transaction type
      const typeGroups = {};
      allTransactions.forEach(t => {
        if (!typeGroups[t.transaction_type]) {
          typeGroups[t.transaction_type] = [];
        }
        typeGroups[t.transaction_type].push(t);
      });
      
      console.log('📊 Transaction types found:');
      Object.keys(typeGroups).forEach(type => {
        const count = typeGroups[type].length;
        const totalAmount = typeGroups[type].reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        console.log(`   - ${type}: ${count} transactions, R${totalAmount.toFixed(2)} total`);
      });
    }

    // 2. Check specifically for pet_contribution vs pet_donation
    console.log('\n2. Checking PET-related transactions...');
    const { data: petContributions, error: petContribError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .eq('transaction_type', 'pet_contribution');

    const { data: petDonations, error: petDonationError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .eq('transaction_type', 'pet_donation');

    console.log(`📋 pet_contribution transactions: ${petContributions?.length || 0}`);
    console.log(`📋 pet_donation transactions: ${petDonations?.length || 0}`);

    if (petContributions && petContributions.length > 0) {
      console.log('   pet_contribution details:');
      petContributions.forEach((t, i) => {
        console.log(`     ${i + 1}. R${t.amount} - ${t.description} - ${t.created_at}`);
      });
    }

    if (petDonations && petDonations.length > 0) {
      console.log('   pet_donation details:');
      petDonations.forEach((t, i) => {
        console.log(`     ${i + 1}. R${t.amount} - ${t.description} - ${t.created_at}`);
      });
    }

    // 3. Test the Green Scholar Fund service logic
    console.log('\n3. Testing Green Scholar Fund service logic...');
    
    // Simulate the getFundOverview logic
    const { data: serviceTransactions, error: serviceError } = await supabase
      .from('green_scholar_transactions')
      .select('amount, transaction_type');

    if (serviceError) {
      console.log('❌ Error querying for service logic:', serviceError.message);
    } else {
      const sum = (arr, key) => arr.filter(r => r.transaction_type === key).reduce((s, r) => s + Number(r.amount || 0), 0);
      
      const petContrib = sum(serviceTransactions, 'pet_contribution');
      const petDonation = sum(serviceTransactions, 'pet_donation');
      const donations = sum(serviceTransactions, 'donation') || sum(serviceTransactions, 'direct_donation');
      const disbursed = sum(serviceTransactions, 'distribution') || sum(serviceTransactions, 'expense');
      
      console.log('📊 Service calculation results:');
      console.log(`   pet_contribution total: R${petContrib}`);
      console.log(`   pet_donation total: R${petDonation}`);
      console.log(`   donations total: R${donations}`);
      console.log(`   disbursed total: R${disbursed}`);
      
      // This is what the service actually uses
      const pet = petContrib || petDonation || 0;
      console.log(`   Final PET revenue (pet_contribution || pet_donation): R${pet}`);
    }

    // 4. Check if there are any collections with PET materials
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
            const expectedContribution = totalKg * 1.5; // R1.50 per kg
            console.log(`   Collection ${collection.id}: ${petMaterials.length} PET materials, ${totalKg}kg, expected R${expectedContribution.toFixed(2)}`);
          }
        }
      }
    }

    // 5. Test the API endpoint directly
    console.log('\n5. Testing API endpoint...');
    if (collections && collections.length > 0) {
      const testCollectionId = collections[0].id;
      console.log(`   Testing with collection ID: ${testCollectionId}`);
      
      try {
        const response = await fetch('http://localhost:3000/api/green-scholar/pet-bottles-contribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId: testCollectionId })
        });
        
        const result = await response.json();
        console.log(`   API Response: ${response.status} - ${JSON.stringify(result)}`);
        
        if (result.created) {
          console.log('   ✅ API created a new transaction');
        } else {
          console.log('   ℹ️  API did not create a transaction (may already exist or no PET materials)');
        }
      } catch (apiError) {
        console.log(`   ❌ API Error: ${apiError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testTransactionLogic().catch(console.error);
