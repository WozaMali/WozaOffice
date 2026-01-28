'use client';

import { useState, useEffect } from 'react';
import { testSupabaseConnection, checkRequiredTables } from '@/lib/collector-services';

export default function TestConnectionPage() {
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [tablesResult, setTablesResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    
    try {
      // Test connection
      const connResult = await testSupabaseConnection();
      setConnectionResult(connResult);
      
      // Test tables
      const tblResult = await checkRequiredTables();
      setTablesResult(tblResult);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Connection Test</h1>
        
        <div className="space-y-6">
          {/* Connection Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Connection Test</h2>
            {connectionResult ? (
              <div className={`p-4 rounded-lg ${
                connectionResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${connectionResult.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">
                    {connectionResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{connectionResult.message}</p>
                {connectionResult.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500">View Details</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(connectionResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Testing connection...</div>
            )}
          </div>

          {/* Tables Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tables Test</h2>
            {tablesResult ? (
              <div className={`p-4 rounded-lg ${
                tablesResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${tablesResult.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">
                    {tablesResult.success ? 'All Tables Available' : 'Some Tables Missing'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{tablesResult.message}</p>
                
                {tablesResult.tableStatus && (
                  <div className="mt-3">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Table Status:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(tablesResult.tableStatus).map(([tableName, isAvailable]) => (
                        <div key={tableName} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm">{tableName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {tablesResult.details && (
                  <details className="text-xs mt-3">
                    <summary className="cursor-pointer text-gray-500">View Details</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(tablesResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Testing tables...</div>
            )}
          </div>

          {/* Environment Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Environment Information</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Supabase URL:</span>
                <span className="ml-2 text-gray-600">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
                </span>
              </div>
              <div>
                <span className="font-medium">Supabase Key:</span>
                <span className="ml-2 text-gray-600">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
                    `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
                    'Not set'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Test Button */}
          <div className="text-center">
            <button
              onClick={runTests}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Running Tests...' : 'Run Tests Again'}
            </button>
          </div>

          {/* Helpful Links */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Database Setup Help</h2>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-medium text-yellow-800 mb-2">If Tables Are Missing:</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  The collector dashboard requires several database tables to function. If the connection test passes but tables are missing, you'll need to set up the database schema.
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">1. Copy the diagnostic script to your Supabase SQL editor</p>
                  <p className="text-gray-600">2. Run it to see what's missing</p>
                  <p className="text-gray-600">3. Use the setup script to create the required tables</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium text-blue-800 mb-2">Diagnostic Script</h4>
                  <p className="text-sm text-blue-700 mb-2">Check what's missing in your database</p>
                  <a 
                    href="/diagnose-collector-dashboard.sql" 
                    download
                    className="inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Download SQL Script
                  </a>
                </div>
                
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-medium text-green-800 mb-2">Setup Script</h4>
                  <p className="text-sm text-green-700 mb-2">Create the required tables and sample data</p>
                  <a 
                    href="/setup-collector-dashboard.sql" 
                    download
                    className="inline-block px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Download SQL Script
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
