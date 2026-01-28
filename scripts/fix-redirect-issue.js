const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixRedirectIssue() {
  try {
    console.log('🔍 Diagnosing redirect issue...');
    console.log('\n📍 Current Environment Variables:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
    console.log('   NEXT_PUBLIC_SUPABASE_REDIRECT_URL:', process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL);
    console.log('   NEXT_PUBLIC_SUPABASE_SITE_URL:', process.env.NEXT_PUBLIC_SUPABASE_SITE_URL);
    console.log('   NEXT_PUBLIC_MAIN_URL:', process.env.NEXT_PUBLIC_MAIN_URL);
    console.log('   NEXT_PUBLIC_OFFICE_URL:', process.env.NEXT_PUBLIC_OFFICE_URL);
    
    console.log('\n🚨 CRITICAL: You must update your Supabase dashboard settings!');
    console.log('\n📋 Step-by-step fix:');
    console.log('1. Go to: https://supabase.com/dashboard/project/mljtjntkddwkcjixkyuy');
    console.log('2. Navigate to: Authentication > URL Configuration');
    console.log('3. Update these settings:');
    console.log('\n   SITE URL:');
    console.log('   - Change from: https://office.wozamali.co.za');
    console.log('   - Change to: http://localhost:8081');
    console.log('\n   REDIRECT URLs (add these):');
    console.log('   - http://localhost:8081/**');
    console.log('   - http://localhost:8080/**');
    console.log('   - http://localhost:8081/admin-login');
    console.log('   - http://localhost:8080/admin-login');
    console.log('   - http://localhost:8081/auth/callback');
    console.log('   - http://localhost:8080/auth/callback');
    console.log('\n4. Click "Save"');
    console.log('5. Restart your development server');
    
    console.log('\n🔧 Alternative: Temporarily disable authentication redirects');
    console.log('   Add this to your .env file:');
    console.log('   NEXT_PUBLIC_DISABLE_AUTH_REDIRECT=true');
    
    console.log('\n📱 Test URLs after fix:');
    console.log('   - Main app: http://localhost:8080');
    console.log('   - Office app: http://localhost:8081');
    console.log('   - Login should stay on localhost, not redirect to production');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRedirectIssue();
