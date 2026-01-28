const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuthRedirect() {
  try {
    console.log('🔍 Checking authentication redirect configuration...');
    console.log('📍 Current environment variables:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
    console.log('   NEXT_PUBLIC_SUPABASE_REDIRECT_URL:', process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL);
    console.log('   NEXT_PUBLIC_SUPABASE_SITE_URL:', process.env.NEXT_PUBLIC_SUPABASE_SITE_URL);
    console.log('   NEXT_PUBLIC_MAIN_URL:', process.env.NEXT_PUBLIC_MAIN_URL);
    console.log('   NEXT_PUBLIC_OFFICE_URL:', process.env.NEXT_PUBLIC_OFFICE_URL);
    
    console.log('\n🔧 To fix the redirect issue:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Authentication > URL Configuration');
    console.log('3. Add these URLs to "Site URL":');
    console.log('   - http://localhost:8081');
    console.log('   - http://localhost:8080');
    console.log('4. Add these URLs to "Redirect URLs":');
    console.log('   - http://localhost:8081/**');
    console.log('   - http://localhost:8080/**');
    console.log('   - http://localhost:8081/admin-login');
    console.log('   - http://localhost:8080/admin-login');
    console.log('5. Save the configuration');
    console.log('6. Restart your development server');
    
    console.log('\n📋 Current Supabase configuration should include:');
    console.log('   Site URL: http://localhost:8081');
    console.log('   Redirect URLs: http://localhost:8081/**, http://localhost:8080/**');
    
  } catch (error) {
    console.error('❌ Error checking auth redirect:', error);
  }
}

checkAuthRedirect();
