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

async function applyUserRolesFix() {
  try {
    console.log('🔧 Applying user roles fix...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'FIX_USER_ROLES.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of FIX_USER_ROLES.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Check the results to verify the role updates');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This will fix user roles:');
    console.log('   - collector@wozamali.com → collector role');
    console.log('   - admin@wozamali.com → admin role');
    console.log('   - superadmin@wozamali.co.za → superadmin role');
    console.log('   - All "member" users → resident role');
    console.log('   - Users without roles → resident role');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

applyUserRolesFix();
