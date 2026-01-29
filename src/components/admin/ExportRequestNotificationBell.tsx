'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';
import { performExportToGenericPDF } from '@/lib/export-utils-generic';
import { exportToPDF, exportToXLSX, exportToCSV } from '@/lib/export-utils';

interface ExportRequest {
  id: string;
  requested_by: string;
  export_type: string;
  report_title: string;
  filename: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  updated_at: string;
  request_data?: {
    columns: any[];
    rows: any[];
  };
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  requested_by_user?: {
    full_name?: string;
    email?: string;
  };
  approved_by_user?: {
    full_name?: string;
    email?: string;
  };
}

const executeExportFromRequest = async (request: ExportRequest) => {
  try {
    const { export_type, request_data, filename } = request;

    if (!request_data) {
      throw new Error('No request data found');
    }

    const { columns, rows } = request_data;

    switch (export_type) {
      case 'csv':
        await exportToCSV(filename, columns, rows);
        break;
      case 'xlsx':
        await exportToXLSX(filename, 'Sheet1', columns, rows);
        break;
      case 'pdf':
        await exportToPDF('Export Report', filename, columns, rows);
        break;
      default:
        throw new Error(`Unsupported export type: ${export_type}`);
    }

    toast.success('Export completed successfully');
  } catch (error: any) {
    console.error('Error executing export:', error);
    toast.error(error.message || 'Failed to execute export');
  }
};

export function ExportRequestNotificationBell() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdminManager, setIsAdminManager] = useState(false);
  const [canApprove, setCanApprove] = useState(false);

  // Check if user is superadmin
  useEffect(() => {
    if (profile) {
      const emailLower = user?.email?.toLowerCase() || '';
      const checkUserRole = async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('role_id, roles!inner(name)')
            .eq('id', user?.id)
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

      let query = supabase
        .from('export_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (canApprove) {
        // SuperAdmins and AdminManagers see pending requests
        query = query.eq('status', 'pending');
      } else {
        // Regular admins see their own requests
        query = query.eq('requested_by', user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Fetch user data for each request (both requester and approver)
      const requestsWithUsers = await Promise.all(
        (data || []).map(async (req: any) => {
          let requestedByUser = null;
          let approvedByUser = null;

          try {
            // Get requester user data
            const { data: requesterData } = await supabase
              .from('users')
              .select('full_name, email')
              .eq('id', req.requested_by)
              .single();
            requestedByUser = requesterData;
          } catch (err) {
            // Requester not found
          }

          // Get approver user data if request was approved/rejected
          if (req.approved_by) {
            try {
              const { data: approverData } = await supabase
                .from('users')
                .select('full_name, email')
                .eq('id', req.approved_by)
                .single();
              approvedByUser = approverData;
            } catch (err) {
              // Approver not found
            }
          }

          return {
            ...req,
            requested_by_user: requestedByUser,
            approved_by_user: approvedByUser,
          };
        })
      );

      setRequests(requestsWithUsers as ExportRequest[]);
    } catch (error: any) {
      console.error('Error loading export requests:', error);
      toast.error('Failed to load export requests');
    } finally {
      setLoading(false);
    }
  }, [user, canApprove]);

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
      // Update the request status to approved directly in Supabase
      const { error } = await supabase
        .from('export_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) {
        throw new Error(error.message);
      }

      // Execute the export (this will download the file for SuperAdmin)
      try {
        await executeExportFromRequest(request);
        toast.success('Export request approved and file downloaded');
      } catch (execError: any) {
        console.error('Error executing export:', execError);
        // Still mark as approved even if execution fails - admin can retry
        toast.success('Export request approved (download may have failed - admin can retry)');
      }

      loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Enter rejection reason (optional):');
    try {
      // Update the request status to rejected directly in Supabase
      const { error } = await supabase
        .from('export_requests')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Export request rejected');
      loadRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request: ' + (error.message || 'Unknown error'));
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const unreadCount = canApprove 
    ? pendingCount 
    : requests.filter(r => r.status === 'approved' && new Date(r.updated_at) > new Date(Date.now() - 5 * 60 * 1000)).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">
            {canApprove ? 'Export Requests' : 'Export Notifications'}
          </h3>
          <p className="text-sm text-gray-600">
            {canApprove 
              ? 'Approve or reject export requests'
              : 'View your export request status'}
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {canApprove 
                ? 'No pending export requests'
                : 'No export notifications'}
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{request.report_title}</span>
                        <Badge
                          variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {request.export_type.toUpperCase()} • {request.filename}
                      </p>
                      {request.requested_by_user && (
                        <p className="text-xs text-gray-500">
                          Requested by: {request.requested_by_user.full_name || request.requested_by_user.email}
                        </p>
                      )}
                      {request.approved_by_user && (
                        <p className="text-xs text-green-600">
                          Approved by: {request.approved_by_user.full_name || request.approved_by_user.email}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                      {request.status === 'rejected' && request.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">
                          Reason: {request.rejection_reason}
                        </p>
                      )}
                    </div>
                    {canApprove && request.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleApprove(request)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-600 hover:text-red-700"
                          onClick={() => handleReject(request.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {!isSuperAdmin && request.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={async () => {
                          // Execute the approved export
                          try {
                            await executeExportFromRequest(request);
                            toast.success('Export completed successfully');
                          } catch (error: any) {
                            console.error('Error executing export:', error);
                            toast.error('Failed to execute export: ' + (error.message || 'Unknown error'));
                          }
                        }}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

