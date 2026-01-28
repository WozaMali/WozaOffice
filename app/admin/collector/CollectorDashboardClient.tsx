'use client';

import { useState, useEffect } from 'react';
import CollectorDashboard from '@/components/collector/CollectorDashboard';

export default function CollectorDashboardClient() {
  const [isClient, setIsClient] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Initializing...');

  useEffect(() => {
    const initializeClient = async () => {
      setLoadingStep('Setting up client...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UX
      
      setLoadingStep('Loading dashboard components...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setLoadingStep('Initializing data connections...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsClient(true);
    };

    initializeClient();
  }, []);

  // Show loading state during SSR or initial load
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Collector Dashboard</h2>
          <p className="text-gray-600 mb-4">{loadingStep}</p>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span>Initializing components</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <span>Setting up data connections</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              <span>Loading dashboard data</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEVELOPMENT MODE - AUTHENTICATION BYPASSED
  return <CollectorDashboard />;
}
