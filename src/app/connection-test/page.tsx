"use client";
import React, { useEffect, useState } from 'react';
import { testSupabaseConnection } from '../../utils/supabaseClient';

const ConnectionTestPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    error?: string;
    data?: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [envVars, setEnvVars] = useState<{
    url: string;
    key: string;
  }>({ url: '', key: '' });

  useEffect(() => {
    // Check environment variables on client side
    setEnvVars({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT SET',
    });
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const result = await testSupabaseConnection();
      setConnectionStatus(result);
    } catch (e: any) {
      setConnectionStatus({
        success: false,
        error: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
        
        {/* Environment Variables Check */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                envVars.url === 'NOT SET' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {envVars.url === 'NOT SET' ? 'NOT SET' : `${envVars.url.substring(0, 30)}...`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                envVars.key === 'NOT SET' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {envVars.key === 'NOT SET' ? 'NOT SET' : `${envVars.key.substring(0, 30)}...`}
              </span>
            </div>
          </div>
          
          {(envVars.url === 'NOT SET' || envVars.key === 'NOT SET') && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800 mb-2">❌ Missing Environment Variables</h3>
              <p className="text-red-700 text-sm mb-2">
                You need to create a <code className="bg-red-100 px-1 rounded">.env.local</code> file in your project root with:
              </p>
              <pre className="bg-red-100 p-2 rounded text-sm font-mono">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here`}
              </pre>
            </div>
          )}
        </div>

        {/* Connection Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
          
          <button
            onClick={handleTestConnection}
            disabled={loading || envVars.url === 'NOT SET' || envVars.key === 'NOT SET'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>

          {connectionStatus && (
            <div className={`mt-4 p-4 rounded border ${
              connectionStatus.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                connectionStatus.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {connectionStatus.success ? '✅ Connection Successful' : '❌ Connection Failed'}
              </h3>
              
              {connectionStatus.error && (
                <div className="text-red-700 text-sm">
                  <strong>Error:</strong> {connectionStatus.error}
                </div>
              )}
              
              {connectionStatus.data && (
                <div className="text-green-700 text-sm">
                  <strong>Response:</strong> {JSON.stringify(connectionStatus.data, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. Create Supabase Project</h3>
              <p>Go to <a href="https://supabase.com" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">supabase.com</a> and create a new project.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">2. Get Your Credentials</h3>
              <p>In your Supabase dashboard, go to Settings → API to find your URL and anon key.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">3. Create .env.local File</h3>
              <p>Create a file named <code className="bg-gray-100 px-1 rounded">.env.local</code> in your project root and add:</p>
              <pre className="bg-gray-100 p-2 rounded mt-2 font-mono">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">4. Set Up Database Schema</h3>
              <p>Run the SQL schema from <code className="bg-gray-100 px-1 rounded">database_schema_multi_player.sql</code> in your Supabase SQL editor.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">5. Restart Development Server</h3>
              <p>After creating the .env.local file, restart your development server with <code className="bg-gray-100 px-1 rounded">npm run dev</code>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTestPage; 