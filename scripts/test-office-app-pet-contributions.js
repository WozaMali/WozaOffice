/**
 * Test PET contributions in the office app
 * This script verifies that the office app can access and display PET contributions
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function testOfficeAppPetContributions() {
  console.log('🧪 Testing Office App PET Contributions...\n');

  try {
    // 1. Test Green Scholar Fund service logic (simulate what the office app does)
    console.log('1. Testing Green Scholar Fund service logic...');
    
    // Simulate getFundOverview()
    const { data: balance } = await supabase
      .from('green_scholar_fund_balance')
      .select('*')
      .order('last_updated', { ascending: false })
      .limit(1)
      .maybeSingle();

    let petRevenue = 0;
    if (balance) {
      petRevenue = Number(balance.pet_donations_total || balance.total_contributions || 0);
      console.log(`   📊 From balance table: R${petRevenue}`);
    } else {
      // Fallback to transactions
      const { data: transactions } = await supabase
        .from('green_scholar_transactions')
        .select('amount, transaction_type');
      
      if (transactions) {
        const sum = (arr, key) => arr.filter(r => r.transaction_type === key).reduce((s, r) => s + Number(r.amount || 0), 0);
        const petContrib = sum(transactions, 'pet_contribution');
        const petDonation = sum(transactions, 'pet_donation');
        petRevenue = petContrib || petDonation || 0;
        console.log(`   📊 From transactions: R${petRevenue} (pet_contribution: R${petContrib}, pet_donation: R${petDonation})`);
      }
    }

    // 2. Test listDisbursements() logic
    console.log('\n2. Testing disbursements logic...');
    const { data: disbursements, error: disbError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .in('transaction_type', ['distribution', 'expense'])
      .order('created_at', { ascending: false });

    if (disbError) {
      console.log('   ❌ Error querying disbursements:', disbError.message);
    } else {
      console.log(`   📊 Found ${disbursements.length} disbursements`);
      disbursements.forEach((d, i) => {
        console.log(`     ${i + 1}. R${d.amount} - ${d.description} - ${d.created_at}`);
      });
    }

    // 3. Test scholars logic
    console.log('\n3. Testing scholars logic...');
    const { data: scholars, error: scholarsError } = await supabase
      .from('scholars')
      .select('id, name, school, grade, region');

    if (scholarsError) {
      console.log('   ❌ Error querying scholars:', scholarsError.message);
      // Fallback to users table
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role_id', 'scholar');
      console.log(`   📊 Fallback: Found ${users?.length || 0} users with scholar role`);
    } else {
      console.log(`   📊 Found ${scholars.length} scholars`);
      scholars.forEach((s, i) => {
        console.log(`     ${i + 1}. ${s.name} - ${s.school || 'No school'} - ${s.grade || 'No grade'}`);
      });
    }

    // 4. Test impact metrics
    console.log('\n4. Testing impact metrics...');
    const { data: stats } = await supabase
      .from('user_recycling_stats')
      .select('total_kg, total_points');

    if (stats) {
      const totalKg = stats.reduce((sum, r) => sum + Number(r.total_kg || 0), 0);
      const totalPoints = stats.reduce((sum, r) => sum + Number(r.total_points || 0), 0);
      const co2Saved = totalKg * 1.7;
      const nextTierProgress = Math.min(100, (totalPoints % 1000) / 10);
      
      console.log(`   📊 Total recycled: ${totalKg.toFixed(1)} kg`);
      console.log(`   📊 CO₂ saved: ${co2Saved.toFixed(1)} kg`);
      console.log(`   📊 Points earned: ${totalPoints}`);
      console.log(`   📊 Next tier progress: ${nextTierProgress.toFixed(1)}%`);
    } else {
      console.log('   ℹ️  No recycling stats found');
    }

    // 5. Test monthly breakdown
    console.log('\n5. Testing monthly breakdown...');
    const { data: monthly, error: monthlyError } = await supabase
      .from('green_scholar_monthly_breakdown')
      .select('*')
      .order('month', { ascending: false });

    if (monthlyError) {
      console.log('   ❌ Error querying monthly breakdown:', monthlyError.message);
    } else {
      console.log(`   📊 Found ${monthly.length} monthly records`);
      monthly.slice(0, 3).forEach((m, i) => {
        console.log(`     ${i + 1}. ${m.month}: PET R${m.pet_revenue}, Donations R${m.donations}, Net R${m.net_change}`);
      });
    }

    // 6. Summary
    console.log('\n6. Summary for Office App:');
    console.log(`   ✅ PET Revenue: R${petRevenue}`);
    console.log(`   ✅ Disbursements: ${disbursements?.length || 0}`);
    console.log(`   ✅ Scholars: ${scholars?.length || 0}`);
    console.log(`   ✅ Monthly Records: ${monthly?.length || 0}`);
    
    if (petRevenue > 0) {
      console.log('\n🎉 SUCCESS: PET contributions are working!');
      console.log('   The Green Scholar Fund page should now display the correct data.');
    } else {
      console.log('\n⚠️  WARNING: No PET revenue found.');
      console.log('   Make sure to approve some collections with PET materials.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testOfficeAppPetContributions().catch(console.error);
