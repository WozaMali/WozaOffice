const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAllApps() {
  try {
    console.log('🧪 Testing all 3 apps functionality...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'COMPREHENSIVE_APP_TEST.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Comprehensive test required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of COMPREHENSIVE_APP_TEST.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Review all test results');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This comprehensive test checks:');
    console.log('   - Database structure and relationships');
    console.log('   - User authentication and roles');
    console.log('   - Role distribution across apps');
    console.log('   - RLS policies for security');
    console.log('   - RPC functions for soft delete');
    console.log('   - Realtime subscriptions for live updates');
    console.log('   - Foreign key relationships');
    console.log('   - Data integrity');
    console.log('   - Authentication triggers');
    
    console.log('\n🎯 Apps being tested:');
    console.log('   - Main App (localhost:8080) - User registration and authentication');
    console.log('   - Office App (localhost:8081) - Admin dashboard and user management');
    console.log('   - Collector App (localhost:8082) - Collector operations');
    
    console.log('\n📊 Expected results:');
    console.log('   - All database relationships working');
    console.log('   - User roles properly assigned');
    console.log('   - RLS policies protecting data');
    console.log('   - RPC functions operational');
    console.log('   - Realtime features working');
    console.log('   - Authentication triggers active');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testAllApps();
