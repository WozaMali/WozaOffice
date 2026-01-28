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

async function applyCheckUserRoles() {
  try {
    console.log('🔍 Checking all user roles...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'CHECK_ALL_USER_ROLES.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Manual check required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of CHECK_ALL_USER_ROLES.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Review all users and their roles');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This script will show:');
    console.log('   - All users with their roles');
    console.log('   - Role distribution (how many users per role)');
    console.log('   - Users without roles');
    console.log('   - Specific user details');
    console.log('   - All available roles');
    
    console.log('\n🎯 After running this script:');
    console.log('   - You can see all user roles in the database');
    console.log('   - Verify the specific user has collector role');
    console.log('   - Check role distribution');
    console.log('   - Identify any users without roles');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

applyCheckUserRoles();
