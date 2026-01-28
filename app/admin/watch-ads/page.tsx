'use client';

import { useEffect, useState } from 'react';
import WatchAdsManagePageComponent from '@/components/admin/WatchAdsManagePage';

export default function WatchAdsManagePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return consistent loading state on server and initial client render
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return <WatchAdsManagePageComponent />;
}


