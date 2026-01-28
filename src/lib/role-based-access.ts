// Role-based access control utilities

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  // Status may not be present on older Profile shape
  status?: string;
}

export class RoleBasedAccess {
  // Check if user can access Team Members page
  static canAccessTeamMembers(profile: UserProfile | null): boolean {
    if (!profile) return false;
    return profile.role === 'superadmin' || profile.role === 'super_admin';
  }

  // Check if user can delete transactions
  static canDeleteTransactions(profile: UserProfile | null): boolean {
    if (!profile) return false;
    return profile.role === 'superadmin' || profile.role === 'super_admin';
  }

  // Check if user can access Settings page
  static canAccessSettings(profile: UserProfile | null): boolean {
    if (!profile) return false;
    return profile.role === 'admin' || profile.role === 'superadmin' || 
           profile.role === 'super_admin';
  }

  // Check if user is admin (but not superadmin)
  static isAdmin(profile: UserProfile | null): boolean {
    if (!profile) return false;
    return profile.role === 'admin';
  }

  // Check if user is superadmin
  static isSuperAdmin(profile: UserProfile | null): boolean {
    if (!profile) return false;
    return profile.role === 'superadmin' || profile.role === 'super_admin';
  }

  // Get user role display name
  static getRoleDisplayName(role: string): string {
    switch (role.toLowerCase()) {
      case 'superadmin':
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'collector':
        return 'Collector';
      case 'resident':
        return 'Resident';
      default:
        return 'Unknown';
    }
  }
}
