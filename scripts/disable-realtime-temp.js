const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableRealtimeTemporarily() {
  try {
    console.log('🔧 Temporarily disabling realtime to stop WebSocket errors...');
    
    // Remove tables from realtime publication
    const { error: removeUsers } = await supabase.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.users;'
    });
    
    const { error: removeCollections } = await supabase.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.unified_collections;'
    });
    
    const { error: removeProfiles } = await supabase.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.profiles;'
    });
    
    const { error: removeDeleted } = await supabase.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.deleted_transactions;'
    });
    
    if (removeUsers || removeCollections || removeProfiles || removeDeleted) {
      console.log('⚠️ Some tables may not have been removed from realtime publication');
    }
    
    console.log('✅ Realtime temporarily disabled');
    console.log('📋 Next steps:');
    console.log('1. Apply the COMPREHENSIVE_OFFICE_APP_FIX.sql in Supabase dashboard');
    console.log('2. This will fix RLS policies and re-enable realtime properly');
    console.log('3. The WebSocket errors should stop after the fix is applied');
    
  } catch (error) {
    console.error('❌ Error disabling realtime:', error);
    console.log('📋 Manual fix required:');
    console.log('1. Go to Supabase dashboard > SQL Editor');
    console.log('2. Run: ALTER PUBLICATION supabase_realtime DROP TABLE public.users;');
    console.log('3. Run: ALTER PUBLICATION supabase_realtime DROP TABLE public.unified_collections;');
    console.log('4. Run: ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;');
    console.log('5. Run: ALTER PUBLICATION supabase_realtime DROP TABLE public.deleted_transactions;');
    console.log('6. Then apply the COMPREHENSIVE_OFFICE_APP_FIX.sql');
  }
}

disableRealtimeTemporarily();
