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

async function applyAutoResidentRole() {
  try {
    console.log('🔧 Setting up auto resident role for new users...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'SETUP_AUTO_RESIDENT_ROLE.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of SETUP_AUTO_RESIDENT_ROLE.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Test by creating a new user in Main App');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This setup will:');
    console.log('   - Create a trigger function to auto-assign resident role');
    console.log('   - Set up trigger on auth.users table');
    console.log('   - Migrate existing auth users to users table');
    console.log('   - Ensure all new Main App users get resident role automatically');
    
    console.log('\n🎯 After applying this setup:');
    console.log('   - All new users from Main App will be saved to users table');
    console.log('   - They will automatically get "resident" role');
    console.log('   - No manual intervention needed for new signups');
    console.log('   - Existing auth users will be migrated');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

applyAutoResidentRole();
