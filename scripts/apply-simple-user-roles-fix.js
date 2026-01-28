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

async function applySimpleUserRolesFix() {
  try {
    console.log('🔧 Applying simple user roles fix...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'SIMPLE_USER_ROLES_FIX.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of SIMPLE_USER_ROLES_FIX.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Check the results to verify the role updates');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This will fix user roles:');
    console.log('   - Drops the problematic constraint temporarily');
    console.log('   - Updates all user roles correctly');
    console.log('   - Recreates the constraint with proper values');
    console.log('   - collector@wozamali.com → collector role');
    console.log('   - admin@wozamali.com → admin role');
    console.log('   - superadmin@wozamali.co.za → superadmin role');
    console.log('   - All "member" users → resident role');
    console.log('   - Users without roles → resident role');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

applySimpleUserRolesFix();
