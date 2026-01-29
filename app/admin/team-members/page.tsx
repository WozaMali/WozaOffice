"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import CreateAdminModal from '@/components/admin/CreateAdminModal';
import TeamMemberCard from '@/components/admin/TeamMemberCard';
import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending' | 'pending_approval' | 'suspended';
  employee_number?: string;
  township?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_approved?: boolean;
  approval_date?: string;
  approved_by?: string;
}

export default function TeamMembersPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [pendingCollectors, setPendingCollectors] = useState<TeamMember[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<TeamMember[]>([]);
  const [coOperativesCount, setCoOperativesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  const roleBadgeClass = (role: string) => {
    const r = (role || '').toString().toLowerCase();
    if (r === 'super_admin' || r === 'superadmin') return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (r === 'admin_manager' || r === 'adminmanager') return 'bg-violet-100 text-violet-800 border-violet-300';
    if (r === 'admin') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (r === 'collector') return 'bg-green-100 text-green-800 border-green-300';
    if (r === 'staff') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  // Check if user is superadmin (case-insensitive)
  const roleLower = (profile?.role || '').toString().toLowerCase().trim();
  const isSuperAdmin = roleLower === 'superadmin' || roleLower === 'super_admin';
  const isAdmin = roleLower === 'admin' && !isSuperAdmin;

  // Load co-operatives count
  const loadCoOperativesCount = async () => {
    try {
      const { count, error } = await getSupabaseClient()
        .from('co_operatives')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (!error && count !== null) {
        setCoOperativesCount(count);
      }
    } catch (error) {
      console.error('Error loading co-operatives count:', error);
    }
  };

  // Immediate redirect for admin users
  useEffect(() => {
    if (profile && isAdmin && !isSuperAdmin) {
      console.log('🚫 Team Members: BLOCKING admin user:', profile.role);
      // Force immediate redirect with error message
      window.location.replace('/admin?error=access_denied&message=Team Members access restricted to superadmin only');
    }
  }, [profile, isAdmin, isSuperAdmin]);

  // Load team members
  useEffect(() => {
    if (!isSuperAdmin) return; // Don't load data if not superadmin
    // Show UI immediately, load data in background
    setLoading(false);
    loadTeamMembers();
    loadPendingCollectors();
    loadPendingAdmins();
    loadCoOperativesCount();
  }, [isSuperAdmin]);

  // Filter team members
  useEffect(() => {
    let filtered = teamMembers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.township?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    setFilteredMembers(filtered);
  }, [teamMembers, searchTerm, roleFilter, statusFilter]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      // Load team members using roles table join
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          full_name,
          phone,
          role_id,
          status,
          employee_number,
          township_id,
          subdivision,
          city,
          created_at,
          updated_at,
          last_login,
          is_approved,
          approval_date,
          approved_by,
          roles!inner(name)
        `)
        .in('roles.name', ['ADMIN', 'SUPER_ADMIN', 'COLLECTOR', 'STAFF', 'admin', 'super_admin', 'superadmin', 'collector', 'staff', 'AdminManager', 'adminmanager', 'admin_manager'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading team members:', error);
        // Fallback: try without roles join
        const { data: fallbackData, error: fallbackError } = await getSupabaseClient()
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            role_id,
            role,
            status,
            employee_number,
            township_id,
            subdivision,
            city,
            created_at,
            updated_at
          `)
          .or('role.eq.admin,role.eq.super_admin,role.eq.superadmin,role.eq.collector,role.eq.staff,role.eq.AdminManager,role.eq.adminmanager')
          .order('created_at', { ascending: false });

        if (fallbackError) {
          throw fallbackError;
        }

        const members: TeamMember[] = (fallbackData || []).map(user => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Unknown',
          phone: user.phone,
          role: user.role || 'Unknown',
          status: user.status || 'active',
          employee_number: user.employee_number,
          township: user.subdivision || user.city || 'Unknown',
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: undefined,
          is_approved: user.status === 'active',
          approval_date: user.status === 'active' ? user.updated_at : undefined,
          approved_by: undefined,
        }));

        setTeamMembers(members);
        setLoading(false);
        return;
      }

      // Also fetch co-operative members who are collectors
      let coOpMembers: any[] = [];
      try {
        // First get co-operative member user IDs
        const { data: coOpData, error: coOpError } = await getSupabaseClient()
          .from('co_operative_members')
          .select('user_id, co_operative_id')
          .eq('status', 'active');
        
        if (coOpError) {
          console.warn('Could not load co-operative members list:', coOpError);
        } else if (coOpData && coOpData.length > 0) {
          const coOpUserIds = coOpData.map(m => m.user_id);
          // Fetch user details for co-operative members
          const { data: coOpUsers, error: coOpUsersError } = await getSupabaseClient()
            .from('users')
            .select(`
              id,
              email,
              first_name,
              last_name,
              full_name,
              phone,
              role_id,
              status,
              employee_number,
              township_id,
              subdivision,
              city,
              created_at,
              updated_at,
              last_login,
              is_approved,
              approval_date,
              approved_by,
              roles!inner(name)
            `)
            .in('id', coOpUserIds)
            .in('roles.name', ['COLLECTOR', 'collector']);

          if (coOpUsersError) {
            console.warn('Could not load co-operative member users:', coOpUsersError);
          } else {
            coOpMembers = coOpUsers || [];
          }
        }
      } catch (coOpError) {
        console.warn('Could not load co-operative members:', coOpError);
      }

      // Combine regular team members with co-operative members (avoid duplicates)
      const allUserIds = new Set((data || []).map((u: any) => u.id));
      const uniqueCoOpMembers = (coOpMembers || []).filter((u: any) => !allUserIds.has(u.id));

      const members: TeamMember[] = [
        ...(data || []).map((user: any) => {
          const roleName = Array.isArray(user.roles) ? user.roles[0]?.name : user.roles?.name;
          return {
            id: user.id,
            email: user.email,
            full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Unknown',
            phone: user.phone,
            role: roleName || 'Unknown',
            status: user.status || 'active',
            employee_number: user.employee_number,
            township: user.subdivision || user.city || 'Unknown',
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login: user.last_login,
            is_approved: user.is_approved ?? (user.status === 'active'),
            approval_date: user.approval_date || (user.status === 'active' ? user.updated_at : undefined),
            approved_by: user.approved_by,
          };
        }),
        ...uniqueCoOpMembers.map((user: any) => {
          const roleName = Array.isArray(user.roles) ? user.roles[0]?.name : user.roles?.name;
          return {
            id: user.id,
            email: user.email,
            full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Unknown',
            phone: user.phone,
            role: roleName || 'collector', // Co-op members are collectors
            status: user.status || 'active',
            employee_number: user.employee_number,
            township: user.subdivision || user.city || 'Unknown',
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login: user.last_login,
            is_approved: user.is_approved ?? (user.status === 'active'),
            approval_date: user.approval_date || (user.status === 'active' ? user.updated_at : undefined),
            approved_by: user.approved_by,
          };
        }),
      ];

      setTeamMembers(members);
      setLoading(false);
    } catch (error) {
      console.error('Error loading team members:', error);
      setLoading(false);
    }
  };

  const loadPendingCollectors = async () => {
    setLoadingPending(true);
    try {
      // Get pending collectors - try with roles join first
      let data: any[] = [];
      let error: any = null;

      const { data: roleData, error: roleError } = await getSupabaseClient()
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          full_name,
          phone,
          role_id,
          status,
          employee_number,
          township_id,
          subdivision,
          city,
          created_at,
          updated_at,
          roles!inner(name)
        `)
        .eq('status', 'pending_approval')
        .in('roles.name', ['COLLECTOR', 'collector'])
        .order('created_at', { ascending: true });

      if (roleError) {
        // Fallback to direct role column query
        const { data: fallbackData, error: fallbackError } = await getSupabaseClient()
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            role_id,
            role,
            status,
            employee_number,
            township_id,
            subdivision,
            city,
            created_at,
            updated_at
          `)
          .eq('status', 'pending_approval')
          .or('role.eq.collector,role.eq.COLLECTOR')
          .order('created_at', { ascending: true });

        if (fallbackError) throw fallbackError;
        data = fallbackData || [];
      } else {
        data = roleData || [];
      }

      const pending: TeamMember[] = data.map((user: any) => {
        const roleName = Array.isArray(user.roles) ? user.roles[0]?.name : user.roles?.name;
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Unknown',
          phone: user.phone,
          role: roleName || user.role || 'collector',
          status: user.status,
          employee_number: user.employee_number,
          township: user.subdivision || user.city || 'Unknown',
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: undefined,
          is_approved: false,
          approval_date: undefined,
          approved_by: undefined,
        };
      });

      setPendingCollectors(pending);
    } catch (error) {
      console.error('Error loading pending collectors:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadPendingAdmins = async () => {
    setLoadingPending(true);
    try {
      // In Vite, API routes don't exist - query directly via Supabase
      const client = getSupabaseAdminClient() || getSupabaseClient();
      
      const { data, error } = await client
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          full_name,
          phone,
          role_id,
          status,
          employee_number,
          subdivision,
          city,
          created_at,
          updated_at,
          roles!inner(name)
        `)
        .in('status', ['pending_approval', 'pending'])
        .in('roles.name', ['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin', 'superadmin'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading pending admins:', error);
        setPendingAdmins([]);
        return;
      }

      const mapped: TeamMember[] = (data || []).map((user: any) => {
        const roleName = Array.isArray(user.roles) ? user.roles[0]?.name : user.roles?.name;
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
          phone: user.phone,
          role: roleName || 'admin',
          status: user.status,
          employee_number: user.employee_number,
          township: user.subdivision || user.city || 'Unknown',
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: undefined,
          is_approved: false,
          approval_date: undefined,
          approved_by: undefined,
        };
      });
      
      setPendingAdmins(mapped);
    } catch (error) {
      console.error('Error loading pending admins:', error);
      setPendingAdmins([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      // In Vite, API routes don't exist - approve directly via Supabase
      const client = getSupabaseAdminClient() || getSupabaseClient();
      const approverId = user?.id;
      
      if (!approverId) {
        throw new Error('Not authenticated');
      }
      
      // Update user status to active
      const { error: updateError } = await client
        .from('users')
        .update({ 
          status: 'active',
          is_approved: true,
          approval_date: new Date().toISOString(),
          approved_by: approverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);
      
      if (updateError) {
        throw new Error(updateError.message || 'Failed to approve user');
      }
      
      toast({
        title: '✅ User Approved',
        description: 'User has been approved successfully.',
        variant: 'default',
      });
      
      // Reload lists
      loadTeamMembers();
      loadPendingCollectors();
      loadPendingAdmins();
    } catch (error: any) {
      console.error('Error approving member:', error);
      toast({
        title: '❌ Approval Failed',
        description: error.message || 'Failed to approve user. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectMember = async (memberId: string) => {
    try {
      const approverId = user?.id;
      if (!approverId) throw new Error('Not authenticated');

      const { error } = await getSupabaseClient().rpc('reject_collector', {
        p_user_id: memberId,
        p_approver_id: approverId,
        p_reason: 'Rejected from Team Members page'
      });

      if (error) throw error;

      // Reload team members and pending collectors
      loadTeamMembers();
      loadPendingCollectors();
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  const handleSuspendMember = async (memberId: string) => {
    try {
      const { error } = await getSupabaseClient()
        .from('users')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
      loadTeamMembers();
    } catch (error) {
      console.error('Error suspending member:', error);
    }
  };

  const getStatusBadge = (status: string, isApproved?: boolean) => {
    if (status === 'pending_approval' || status === 'pending') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      'super_admin': 'bg-yellow-100 text-yellow-800',
      'admin': 'bg-blue-100 text-blue-800',
      'staff': 'bg-green-100 text-green-800',
      'collector': 'bg-orange-100 text-orange-800',
    };
    
    return (
      <Badge className={colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        <Shield className="w-3 h-3 mr-1" />
        {role.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  // Show access denied message for admin users (after all hooks)
  if (profile && isAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg border-2 border-red-200 p-8 text-center">
            <div className="text-red-500 text-8xl mb-6">🔒</div>
            <h1 className="text-4xl font-bold text-red-900 mb-4">Access Restricted</h1>
            <p className="text-red-700 text-xl mb-6">
              Team Members management is restricted to superadmin users only.
            </p>
            <p className="text-red-600 mb-8">
              Your current role: <span className="font-bold text-red-800">{profile.role}</span>
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-medium">
                ⚠️ This section contains sensitive administrative functions that require superadmin privileges.
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/admin'}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied for any other non-superadmin users
  if (profile && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 text-lg mb-6">
              The Team Members page is only accessible to superadmin users.
            </p>
            <p className="text-gray-500 mb-8">
              Your current role: <span className="font-semibold">{profile.role}</span>
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Super Administrators can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Team Members
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Manage admin profiles and approve collector requests
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setShowCreateAdmin(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Team Member
            </Button>
            <Badge className="text-sm bg-gradient-to-r from-green-600 to-green-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Users className="w-4 h-4 mr-2" />
              {teamMembers.length} Members
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{teamMembers.length}</div>
              <p className="text-sm text-gray-600 mt-1">
                Active: {teamMembers.filter(m => m.status === 'active').length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Co-Operatives</CardTitle>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{coOperativesCount}</div>
              <p className="text-sm text-gray-600 mt-1">
                Registered co-operatives
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approval (Admins & Collectors)</CardTitle>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {pendingAdmins.length + pendingCollectors.length}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {teamMembers.filter(m => {
                  const role = (m.role || '').toLowerCase();
                  return role === 'admin' || role === 'super_admin' || role === 'superadmin' || role === 'adminmanager' || role === 'admin_manager';
                }).length}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Administrative staff
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Collectors</CardTitle>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {teamMembers.filter(m => {
                  const role = (m.role || '').toLowerCase();
                  return role === 'collector';
                }).length}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Field collectors (includes co-op members)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-lg">
            <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
            <p className="text-gray-300">Filter and search through team members</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, employee number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="collector">Collector</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Admin/Collector Section */}
        {(pendingCollectors.length > 0 || pendingAdmins.length > 0) && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                Pending Approvals
                <Badge className="bg-white text-yellow-600 border-0 px-3 py-1 rounded-full">
                  {pendingAdmins.length + pendingCollectors.length}
                </Badge>
              </CardTitle>
              <p className="text-yellow-100">
                Review and approve admin and collector signup requests
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...pendingAdmins, ...pendingCollectors].map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{m.full_name || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{m.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Badge variant="outline" className={`capitalize ${roleBadgeClass(m.role || '')}`}>{(m.role||'').toString().replace('_',' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-50">Pending</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="inline-flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveMember(m.id)}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectMember(m.id)}>Reject</Button>
                        </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members Table */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-lg py-3">
            <CardTitle className="text-white">All Team Members</CardTitle>
            <CardDescription className="text-gray-300 text-sm">Spreadsheet view with roles and statuses</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Township</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900">{m.full_name || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-600">{m.email}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                        <Badge variant="outline" className={`capitalize ${roleBadgeClass(m.role || '')}`}>{(m.role||'').toString().replace('_',' ')}</Badge>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                        {getStatusBadge(m.status, m.is_approved)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-600">{m.township || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm">
                        <div className="inline-flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleApproveMember(m.id)}>Approve</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleRejectMember(m.id)}>Reject</Button>
                          <Button size="sm" className="h-7 px-2 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleSuspendMember(m.id)}>Suspend</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredMembers.length === 0 && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center mb-6">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No team members found</h3>
                <p className="text-gray-600 text-center max-w-md">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by creating an admin profile or wait for collector signups.'}
                </p>
              </CardContent>
            </Card>
          )}

        {/* Create Admin Modal */}
        {showCreateAdmin && (
          <CreateAdminModal
            isOpen={showCreateAdmin}
            onClose={() => setShowCreateAdmin(false)}
            onSuccess={() => {
              setShowCreateAdmin(false);
              loadTeamMembers();
            }}
          />
        )}
      </div>
    </div>
  );
}
