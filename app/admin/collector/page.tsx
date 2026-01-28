'use client';

import { useState, useEffect } from 'react';
import CollectorDashboardClient from './CollectorDashboardClient';
import { testSupabaseConnection } from '@/lib/collector-services';

export default function CollectorPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing connection...');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setIsTesting(true);
      setConnectionStatus('Testing Supabase connection...');
      setConnectionError(null);

      const result = await testSupabaseConnection();
      
      if (result.success) {
        setConnectionStatus('✅ Connected to database successfully');
      } else {
        setConnectionStatus('❌ Database connection failed');
        setConnectionError(result.error || 'Unknown error');
      }
    } catch (error: any) {
      setConnectionStatus('❌ Connection test failed');
      setConnectionError(error.message || 'Unknown error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Diagnostic Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <img 
                src="/w yellow.png" 
                alt="Woza Mali Logo" 
                className="w-6 h-6"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Collector Dashboard</h1>
              <p className="text-sm text-gray-600">Field Operations & Pickup Management</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isTesting ? 'bg-yellow-500' : connectionError ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium">
              {isTesting ? 'Testing...' : connectionError ? 'Disconnected' : 'Connected'}
            </span>
          </div>
        </div>
        
        {/* Connection Details */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm">
            <p className="font-medium text-gray-700">Connection Status:</p>
            <p className="text-gray-600">{connectionStatus}</p>
            {connectionError && (
              <div className="mt-2">
                <p className="font-medium text-red-700">Error Details:</p>
                <p className="text-red-600 text-xs">{connectionError}</p>
              </div>
            )}
            <button 
              onClick={testConnection}
              disabled={isTesting}
              className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isTesting ? 'Testing...' : 'Retest Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <CollectorDashboardClient />
    </div>
  );
}
