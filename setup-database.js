const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔧 Setting up database schema...');
  
  try {
    // Test connection first
    console.log('🔍 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('game_rooms')
      .select('count')
      .limit(1);
    
    if (testError && testError.code === 'PGRST116') {
      console.log('📋 Tables do not exist. This is expected for first setup.');
    } else if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    } else {
      console.log('✅ Connection successful! Tables already exist.');
      console.log('🎮 Your database is ready to use!');
      return;
    }
    
    console.log('⚠️  Database schema needs to be set up manually.');
    console.log('📝 Please follow these steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/kirntwtapzudclowzefj/sql');
    console.log('2. Click "New Query"');
    console.log('3. Copy and paste the contents of database_schema_multi_player.sql');
    console.log('4. Click "Run" to execute the schema');
    console.log('5. Run this script again to verify setup');
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('🌐 This appears to be a network connectivity issue.');
      console.log('💡 Try:');
      console.log('   - Check your internet connection');
      console.log('   - Disable VPN if using one');
      console.log('   - Try again in a few minutes');
    }
  }
}

setupDatabase(); 