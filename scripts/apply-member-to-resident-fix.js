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

async function applyMemberToResidentFix() {
  try {
    console.log('🔧 Applying member to resident role fix...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'FIX_MEMBER_TO_RESIDENT.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of FIX_MEMBER_TO_RESIDENT.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Verify all members are now residents');
    
    console.log('\n📄 SQL file location:', sqlPath);
    console.log('✅ This fix:');
    console.log('   - Updates all users with "member" role to "resident" role');
    console.log('   - Shows before and after user roles');
    console.log('   - Displays role distribution');
    console.log('   - Ensures proper role assignment');
    
    console.log('\n🎯 After applying this fix:');
    console.log('   - All "member" users will become "resident" users');
    console.log('   - Role distribution will be updated');
    console.log('   - User permissions will be properly assigned');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

applyMemberToResidentFix();
