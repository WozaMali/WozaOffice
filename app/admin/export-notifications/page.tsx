'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Download, X, Check, Clock, Filter, Eye, Calendar, FileType, User, ChevronLeft, ChevronRight, Copy, Info, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { performExportToGenericPDF } from '@/lib/export-utils-generic';
import { exportToPDF, exportToXLSX, exportToCSV } from '@/lib/export-utils';

interface ExportRequest {
  id: string;
  requested_by: string;
  export_type: string;
  report_title: string;
  filename: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  request_data: any;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejection_reason?: string;
  expires_at?: string;
  requested_by_user?: {
    full_name?: string;
    email?: string;
  };
  approved_by_user?: {
    full_name?: string;
    email?: string;
  };
}

// Helper function to execute export from request data
async function executeExportFromRequest(request: ExportRequest) {
  const { export_type, request_data, filename, report_title } = request;

  switch (export_type) {
    case 'generic_pdf':
      await performExportToGenericPDF({
        title: report_title,
        filename,
        columns: request_data.columns || [],
        rows: request_data.rows || [],
        logoPath: request_data.logoPath,
        summary: request_data.summary,
        topPerformers: request_data.topPerformers,
        reportType: request_data.reportType || 'collections',
      });
      break;
    case 'pdf':
      await exportToPDF(
        report_title,
        filename,
        request_data.columns || [],
        request_data.rows || [],
        request_data.logoPath
      );
      break;
    case 'xlsx':
      await exportToXLSX(
        filename,
        request_data.sheetName || 'Sheet1',
        request_data.columns || [],
        request_data.rows || [],
        request_data.logoPath
      );
      break;
    case 'csv':
      await exportToCSV(
        filename,
        request_data.columns || [],
        request_data.rows || []
      );
      break;
    default:
      throw new Error(`Unsupported export type: ${export_type}`);
  }
}

export default function ExportNotificationsPage() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdminManager, setIsAdminManager] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportTypeFilter, setExportTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedRequest, setSelectedRequest] = useState<ExportRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestToReject, setRequestToReject] = useState<ExportRequest | null>(null);

  // Check if user is superadmin
  useEffect(() => {
    if (profile && user) {
      const emailLower = user.email?.toLowerCase() || '';
      const checkUserRole = async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('role_id, roles!inner(name)')
            .eq('id', user.id)
            .single();
          
          const roleName = ((data as any)?.roles?.name || '').toLowerCase();
          const isSuperAdminUser = 
            roleName === 'superadmin' || roleName === 'super_admin' ||
            emailLower === 'superadmin@wozamali.co.za';
          const isAdminManagerUser = roleName === 'adminmanager' || roleName === 'admin_manager';
          const canApproveUser = isSuperAdminUser || isAdminManagerUser;
          
          setIsSuperAdmin(isSuperAdminUser);
          setIsAdminManager(isAdminManagerUser);
          setCanApprove(canApproveUser);
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      };
      checkUserRole();
    }
  }, [user, profile]);

  const loadRequests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/export-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load export requests');
      }

      const result = await response.json();
      setRequests((result.requests || []) as ExportRequest[]);
    } catch (error: any) {
      console.error('Error loading export requests:', error);
      toast.error('Failed to load export requests');
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    loadRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('export_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'export_requests',
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const handleApprove = async (request: ExportRequest) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      // Update the request status to approved via API
      const response = await fetch(`/api/admin/export-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: 'approved',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve request');
      }

      // Execute the export
      try {
        await executeExportFromRequest(request);
        toast.success('Export request approved and file downloaded');
      } catch (execError: any) {
        console.error('Error executing export:', execError);
        toast.success('Export request approved (download may have failed - admin can retry)');
      }

      loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReject = (request: ExportRequest) => {
    setRequestToReject(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!requestToReject) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/admin/export-requests/${requestToReject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject request');
      }

      toast.success('Export request rejected');
      setShowRejectModal(false);
      setRequestToReject(null);
      setRejectionReason('');
      loadRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDownload = async (request: ExportRequest) => {
    try {
      await executeExportFromRequest(request);
      toast.success('Export completed successfully');
    } catch (error: any) {
      console.error('Error executing export:', error);
      toast.error('Failed to execute export: ' + (error.message || 'Unknown error'));
    }
  };

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesExportType = exportTypeFilter === 'all' || request.export_type === exportTypeFilter;
      const matchesSearch = 
        request.report_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requested_by_user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requested_by_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter !== 'all') {
        const requestDate = new Date(request.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateRangeFilter) {
          case 'today':
            matchesDateRange = daysDiff === 0;
            break;
          case 'week':
            matchesDateRange = daysDiff <= 7;
            break;
          case 'month':
            matchesDateRange = daysDiff <= 30;
            break;
        }
      }
      
      return matchesStatus && matchesExportType && matchesSearch && matchesDateRange;
    });

    // Sort requests
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'title':
          return a.report_title.localeCompare(b.report_title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [requests, statusFilter, exportTypeFilter, searchQuery, dateRangeFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredAndSortedRequests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, exportTypeFilter, searchQuery, dateRangeFilter, sortBy]);

  const copyRequestDetails = (request: ExportRequest) => {
    const details = `
Export Request Details:
- Title: ${request.report_title}
- Type: ${request.export_type.toUpperCase()}
- Filename: ${request.filename}
- Status: ${request.status}
- Requested by: ${request.requested_by_user?.full_name || request.requested_by_user?.email || 'Unknown'}
- Created: ${format(new Date(request.created_at), 'PPpp')}
- Rows: ${request.request_data?.rows?.length || 0}
- Columns: ${request.request_data?.columns?.length || 0}
    `.trim();
    
    navigator.clipboard.writeText(details);
    toast.success('Request details copied to clipboard');
  };

  const getTimeUntilExpiry = (request: ExportRequest) => {
    if (request.status !== 'pending') return null;
    const expiresAt = new Date(request.expires_at || new Date(Date.now() + 60 * 60 * 1000));
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
    return `${minutes}m remaining`;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const expiredCount = requests.filter(r => r.status === 'expired').length;
  
  // Additional stats
  const totalRequests = requests.length;
  const pdfCount = requests.filter(r => r.export_type === 'pdf' || r.export_type === 'generic_pdf').length;
  const xlsxCount = requests.filter(r => r.export_type === 'xlsx').length;
  const csvCount = requests.filter(r => r.export_type === 'csv').length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Export Notifications</h1>
        </div>
        <p className="text-gray-600">
          {canApprove 
            ? 'Review and approve export requests from admins'
            : 'View your export request status and download approved exports'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{totalRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pdfCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Excel/CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{xlsxCount + csvCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Sorting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by title, filename, or requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" className="w-full mt-1">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exportType">Export Type</Label>
              <Select value={exportTypeFilter} onValueChange={setExportTypeFilter}>
                <SelectTrigger id="exportType" className="w-full mt-1">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="generic_pdf">Generic PDF</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger id="dateRange" className="w-full mt-1">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy" className="w-full mt-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="title">By Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Export Requests</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedRequests.length)} of {filteredAndSortedRequests.length} request{filteredAndSortedRequests.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredAndSortedRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || statusFilter !== 'all' || exportTypeFilter !== 'all' || dateRangeFilter !== 'all'
                ? 'No requests match your filters'
                : 'No export requests found'}
            </div>
          ) : (
            <>
            <div className="space-y-4">
              {paginatedRequests.map((request) => {
                const timeUntilExpiry = getTimeUntilExpiry(request);
                const isUrgent = request.status === 'pending' && timeUntilExpiry && timeUntilExpiry.includes('m') && !timeUntilExpiry.includes('h');
                
                return (
                <div
                  key={request.id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    isUrgent ? 'border-orange-400 bg-orange-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{request.report_title}</h3>
                        <Badge
                          variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'rejected' ? 'destructive' :
                            request.status === 'expired' ? 'secondary' :
                            'secondary'
                          }
                          className={
                            request.status === 'approved' ? 'bg-green-500' :
                            request.status === 'rejected' ? 'bg-red-500' :
                            request.status === 'pending' ? 'bg-orange-500' :
                            ''
                          }
                        >
                          {request.status}
                        </Badge>
                        {timeUntilExpiry && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {timeUntilExpiry}
                          </Badge>
                        )}
                        {isUrgent && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <FileType className="h-4 w-4" />
                          <span className="font-medium">Type:</span> {request.export_type.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium">Filename:</span> {request.filename}
                        </div>
                        {request.requested_by_user && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Requested by:</span>{' '}
                            {request.requested_by_user.full_name || request.requested_by_user.email}
                          </div>
                        )}
                        {request.approved_by_user && (
                          <div className="flex items-center gap-1">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Approved by:</span>{' '}
                            {request.approved_by_user.full_name || request.approved_by_user.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Created:</span>{' '}
                          {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                        {request.request_data?.rows && (
                          <div>
                            <span className="font-medium">Rows:</span> {request.request_data.rows.length}
                          </div>
                        )}
                        {request.request_data?.columns && (
                          <div>
                            <span className="font-medium">Columns:</span> {request.request_data.columns.length}
                          </div>
                        )}
                        {request.approved_at && (
                          <div>
                            <span className="font-medium">Approved:</span>{' '}
                            {format(new Date(request.approved_at), 'MMM d, yyyy HH:mm')}
                          </div>
                        )}
                      </div>

                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <span className="font-medium">Rejection reason:</span> {request.rejection_reason}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyRequestDetails(request)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      {canApprove && request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {!canApprove && request.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(request)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Request Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this export request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Report Title</Label>
                  <p className="mt-1">{selectedRequest.report_title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <p className="mt-1">
                    <Badge className={
                      selectedRequest.status === 'approved' ? 'bg-green-500' :
                      selectedRequest.status === 'rejected' ? 'bg-red-500' :
                      selectedRequest.status === 'pending' ? 'bg-orange-500' :
                      ''
                    }>
                      {selectedRequest.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Export Type</Label>
                  <p className="mt-1">{selectedRequest.export_type.toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Filename</Label>
                  <p className="mt-1 font-mono text-sm">{selectedRequest.filename}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Requested By</Label>
                  <p className="mt-1">
                    {selectedRequest.requested_by_user?.full_name || selectedRequest.requested_by_user?.email || 'Unknown'}
                    {selectedRequest.requested_by_user?.email && (
                      <span className="text-gray-400 text-xs ml-2">({selectedRequest.requested_by_user.email})</span>
                    )}
                  </p>
                </div>
                {selectedRequest.approved_by_user && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Approved By</Label>
                    <p className="mt-1">
                      {selectedRequest.approved_by_user.full_name || selectedRequest.approved_by_user.email}
                      {selectedRequest.approved_by_user.email && (
                        <span className="text-gray-400 text-xs ml-2">({selectedRequest.approved_by_user.email})</span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="mt-1">{format(new Date(selectedRequest.created_at), 'PPpp')}</p>
                </div>
                {selectedRequest.approved_at && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Approved At</Label>
                    <p className="mt-1">{format(new Date(selectedRequest.approved_at), 'PPpp')}</p>
                  </div>
                )}
                {selectedRequest.rejection_reason && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Rejection Reason</Label>
                    <p className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>
              
              {selectedRequest.request_data && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Export Data Summary</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded space-y-2">
                    {selectedRequest.request_data.columns && (
                      <div>
                        <span className="font-medium">Columns ({selectedRequest.request_data.columns.length}):</span>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedRequest.request_data.columns.slice(0, 10).join(', ')}
                          {selectedRequest.request_data.columns.length > 10 && ` ... and ${selectedRequest.request_data.columns.length - 10} more`}
                        </p>
                      </div>
                    )}
                    {selectedRequest.request_data.rows && (
                      <div>
                        <span className="font-medium">Rows:</span> {selectedRequest.request_data.rows.length}
                      </div>
                    )}
                    {selectedRequest.request_data.summary && (
                      <div>
                        <span className="font-medium">Summary:</span>
                        <pre className="text-xs mt-1 bg-white p-2 rounded overflow-auto">
                          {JSON.stringify(selectedRequest.request_data.summary, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Export Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this export request (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRejectModal(false);
                setRequestToReject(null);
                setRejectionReason('');
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmReject}>
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

