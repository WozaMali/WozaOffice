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

async function applySoftDeleteFix() {
  try {
    console.log('🔧 Applying soft delete RPC fix...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'FIX_SOFT_DELETE_RPC.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });
    
    if (error) {
      console.error('❌ Error applying soft delete fix:', error);
      return;
    }
    
    console.log('✅ Soft delete RPC fix applied successfully!');
    console.log('📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of FIX_SOFT_DELETE_RPC.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Test the soft delete functionality in the office app');
    
  } catch (error) {
    console.error('❌ Exception applying soft delete fix:', error);
  }
}

applySoftDeleteFix();
