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
  status: 'active' | 'inactive' | 'pending' | 'pending_approval' | 'suspended' | 'approved';
  employee_number?: string;
  township?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_approved?: boolean;
  approval_date?: string;
  approved_by?: string;
}

export default function AdminTeamMember() {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  // Check if user is superadmin only
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'super_admin' || profile?.role === 'SUPER_ADMIN';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'ADMIN';

  // Show restricted access message for admin users
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
              The Team Members section is only accessible to superadmin users.
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
    loadTeamMembers();
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
      setLoading(true);
      
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
          status,
          employee_number,
          township,
          created_at,
          updated_at,
          last_login,
          is_approved,
          approval_date,
          approved_by,
          roles!inner(name)
        `)
        .in('roles.name', ['ADMIN', 'STAFF', 'COLLECTOR', 'SUPER_ADMIN'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const members: TeamMember[] = data?.map((user: any) => {
        const rolesJoin = user?.roles;
        const roleName = Array.isArray(rolesJoin)
          ? rolesJoin[0]?.name
          : rolesJoin?.name;
        // If user is approved, reflect status as 'approved' for clarity
        const computedStatus = user.is_approved ? 'approved' : user.status;
        return {
        id: user.id,
        email: user.email,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.phone,
        role: roleName || String(user.role || user.role_id || ''),
        status: computedStatus,
        employee_number: user.employee_number,
        township: user.township,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        is_approved: user.is_approved,
        approval_date: user.approval_date,
        approved_by: user.approved_by,
        } as TeamMember;
      }) || [];

      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_approved: true,
          approval_date: new Date().toISOString(),
          approved_by: profile?.id,
          status: 'approved'
        })
        .eq('id', memberId);

      if (error) throw error;

      // Reload team members
      loadTeamMembers();
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const handleRejectMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_approved: false,
          status: 'suspended'
        })
        .eq('id', memberId);

      if (error) throw error;

      // Reload team members
      loadTeamMembers();
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  const getStatusBadge = (status: string, isApproved?: boolean) => {
    if (status === 'pending' || !isApproved) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
    
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
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
      'SUPER_ADMIN': 'bg-yellow-100 text-yellow-800',
      'ADMIN': 'bg-blue-100 text-blue-800',
      'STAFF': 'bg-green-100 text-green-800',
      'COLLECTOR': 'bg-orange-100 text-orange-800',
    };
    
    return (
      <Badge className={colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        <Shield className="w-3 h-3 mr-1" />
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 text-center">
            Only Administrators can access Team Members management.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading team members...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-gray-600 mt-1">Manage admin profiles and approve collector requests</p>
        </div>
        <Button 
          onClick={() => setShowCreateAdmin(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Admin Profile
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active: {teamMembers.filter(m => m.status === 'active').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {teamMembers.filter(m => m.status === 'pending' || !m.is_approved).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.role === 'ADMIN' || m.role === 'SUPER_ADMIN').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Administrative staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collectors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.role === 'COLLECTOR').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Field collectors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, employee number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="COLLECTOR">Collector</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onApprove={() => handleApproveMember(member.id)}
            onReject={() => handleRejectMember(member.id)}
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
          />
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members found</h3>
            <p className="text-gray-600 text-center">
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
  );
}
