const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyQuickAuthFix() {
  try {
    console.log('🔧 Applying quick authentication fix...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'QUICK_AUTH_FIX.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of QUICK_AUTH_FIX.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Refresh the office app to test authentication');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This quick fix:');
    console.log('   - Temporarily disables RLS for development');
    console.log('   - Grants all permissions to all roles');
    console.log('   - Ensures roles table exists with proper data');
    console.log('   - Updates user roles to fix authentication');
    console.log('   - Allows the office app to work immediately');
    
    console.log('\n🎯 After applying this fix:');
    console.log('   - Authentication should work properly');
    console.log('   - No more redirect loops');
    console.log('   - Admin dashboard should load');
    console.log('   - WebSocket errors should be reduced');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

applyQuickAuthFix();
