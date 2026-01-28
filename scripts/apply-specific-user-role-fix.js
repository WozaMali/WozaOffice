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

async function applySpecificUserRoleFix() {
  try {
    console.log('🔧 Applying specific user role fix...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'FIX_SPECIFIC_USER_ROLE.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of FIX_SPECIFIC_USER_ROLE.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Verify the specific user has collector role');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This fix:');
    console.log('   - Updates user 8fc09ffb-a916-4ab4-a86a-02340f4b9f27 to collector role');
    console.log('   - Shows before and after role for the specific user');
    console.log('   - Displays all users and their roles');
    console.log('   - Shows role distribution');
    
    console.log('\n🎯 After applying this fix:');
    console.log('   - The specific user will have "collector" role');
    console.log('   - Role assignment will be verified');
    console.log('   - All user roles will be displayed');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

applySpecificUserRoleFix();
