'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { config } from '@/lib/config';

// Helper function to check if user has admin privileges
type BasicUser = { email?: string | null } | null | undefined;
type BasicProfile = { role?: string | null } | null | undefined;

const isAdminUser = (user: BasicUser, profile: BasicProfile): boolean => {
  if (!user) return false;
  
  // Check profile role first (from database)
  if (profile?.role) {
    const role = profile.role.toLowerCase();
    return ['admin', 'super_admin', 'superadmin'].includes(role);
  }
  
  // Special case: superadmin@wozamali.co.za should always be treated as super admin
  const email = user.email?.toLowerCase() || '';
  if (email === 'superadmin@wozamali.co.za') {
    return true;
  }
  
  // Fallback to other admin emails
  return email === 'admin@wozamali.com' || 
         email.includes('admin@wozamali');
};

export default function HomePage() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user) {
      // Redirect to main app for login
      const mainUrl = config.getMainUrl();
      console.log('HomePage: Using main URL:', mainUrl);
      window.location.href = `${mainUrl}/login`;
    } else if (isAdminUser(user, profile)) {
      // Redirect to admin dashboard
      window.location.href = '/admin';
    }
  }, [user, profile]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}
