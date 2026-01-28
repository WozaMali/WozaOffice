'use client';

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
import { supabase } from '@/lib/supabase';

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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [pendingCollectors, setPendingCollectors] = useState<TeamMember[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  const roleBadgeClass = (role: string) => {
    const r = (role || '').toString().toLowerCase();
    if (r === 'super_admin' || r === 'superadmin') return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (r === 'admin') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (r === 'collector') return 'bg-green-100 text-green-800 border-green-300';
    if (r === 'staff') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  // Check if user is superadmin
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'ADMIN';

  // Immediate redirect for admin users
  useEffect(() => {
    if (profile && isAdmin && !isSuperAdmin) {
      console.log('🚫 Team Members: BLOCKING admin user:', profile.role);
      // Force immediate redirect with error message
      window.location.replace('/admin?error=access_denied&message=Team Members access restricted to superadmin only');
    }
  }, [profile, isAdmin, isSuperAdmin]);

  // Additional security check on component mount
  useEffect(() => {
    if (profile && isAdmin && !isSuperAdmin) {
      console.log('🚫 Team Members: SECURITY BLOCK for admin user');
      window.location.replace('/admin');
    }
  }, []);

  // Show access denied message for admin users
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

  // Load team members
  useEffect(() => {
    // Show UI immediately, load data in background
    setLoading(false);
    loadTeamMembers();
    loadPendingCollectors();
    loadPendingAdmins();
  }, []);

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
      // Load in background without blocking UI
      // Get all users with admin, staff, or collector roles
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
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
        .in('role', ['admin', 'super_admin', 'collector', 'staff'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const members: TeamMember[] = data?.map(user => ({
        id: user.id,
        email: user.email,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.phone,
        role: user.role || user.role_id,
        status: user.status,
        employee_number: user.employee_number,
        township: user.subdivision || user.city || 'Unknown',
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: undefined, // Not available in current schema
        is_approved: user.status === 'active', // Use status to determine approval
        approval_date: user.status === 'active' ? user.updated_at : undefined,
        approved_by: undefined, // Not available in current schema
      })) || [];

      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadPendingCollectors = async () => {
    setLoadingPending(true);
    try {
      // Get pending collectors
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
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
        .eq('role', 'collector')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const pending: TeamMember[] = data?.map(user => ({
        id: user.id,
        email: user.email,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.phone,
        role: user.role || user.role_id,
        status: user.status,
        employee_number: user.employee_number,
        township: user.subdivision || user.city || 'Unknown',
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: undefined,
        is_approved: false,
        approval_date: undefined,
        approved_by: undefined,
      })) || [];

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
      const resp = await fetch('/api/admin/pending-applicants');
      const json = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.error || 'Failed to load applicants');
      const mapped: TeamMember[] = (json.data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
        phone: user.phone,
        role: user.role,
        status: user.status,
        employee_number: user.employee_number,
        township: user.subdivision || user.city || 'Unknown',
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: undefined,
        is_approved: false,
        approval_date: undefined,
        approved_by: undefined,
      }));
      // Admins only here; collectors are loaded separately
      setPendingAdmins(mapped.filter(m => ['admin','super_admin','superadmin'].includes((m.role||'').toLowerCase())));
    } catch (error) {
      console.error('Error loading pending admins:', error);
      setPendingAdmins([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      // Approve via Office API which also sends password setup email
      const resp = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId })
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.error || 'Approval failed');
      if (json.tempPassword) {
        alert(`Temporary password generated:\n${json.tempPassword}\n\nShare this with the user. They will be forced to change it on first login.`);
      }
      // Reload lists
      loadTeamMembers();
      loadPendingCollectors();
      loadPendingAdmins();
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const handleRejectMember = async (memberId: string) => {
    try {
      const approverId = user?.id;
      if (!approverId) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('reject_collector', {
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
      const { error } = await supabase
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
              Create Admin Profile
            </Button>
            <Badge className="text-sm bg-gradient-to-r from-green-600 to-green-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Users className="w-4 h-4 mr-2" />
              {teamMembers.length} Members
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {teamMembers.filter(m => m.role === 'admin' || m.role === 'super_admin').length}
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
                {teamMembers.filter(m => m.role === 'collector').length}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Field collectors
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
