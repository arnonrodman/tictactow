import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Debug logging
console.log('🔧 Supabase Configuration:');
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING');
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

// Validate environment variables
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set!');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set!');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (e) {
  console.error('❌ Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable auth for anonymous usage
  },
  global: {
    headers: {
      'X-Client-Info': 'tictactow-app',
    },
  },
  // Add fetch configuration for better error handling
  ...(typeof window !== 'undefined' && {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }),
});

// Test connection function with more detailed error reporting
export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('🌐 Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
    console.log('🔗 URL:', supabaseUrl);
    
    // Try a simple query first
    const { data, error, status, statusText } = await supabase
      .from('game_rooms')
      .select('count')
      .limit(1);
    
    console.log('📊 Response status:', status);
    console.log('📊 Response statusText:', statusText);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { success: false, error: error.message, details: error };
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Response data:', data);
    return { success: true, data };
  } catch (e: any) {
    console.error('❌ Supabase connection exception:', e);
    console.error('❌ Exception details:', {
      name: e.name,
      message: e.message,
      stack: e.stack,
      cause: e.cause,
    });
    
    // More specific error analysis
    let errorType = 'Unknown';
    if (e.message?.includes('fetch')) {
      errorType = 'Network/Fetch';
    } else if (e.message?.includes('CORS')) {
      errorType = 'CORS';
    } else if (e.message?.includes('SSL') || e.message?.includes('certificate')) {
      errorType = 'SSL/Certificate';
    } else if (e.message?.includes('timeout')) {
      errorType = 'Timeout';
    }
    
    return { 
      success: false, 
      error: e.message,
      errorType,
      details: e
    };
  }
} 