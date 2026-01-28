'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  UserCheck, 
  UserX, 
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

interface TeamMemberCardProps {
  member: TeamMember;
  onApprove: () => void;
  onReject: () => void;
  getStatusBadge: (status: string, isApproved?: boolean) => React.ReactNode;
  getRoleBadge: (role: string) => React.ReactNode;
}

export default function TeamMemberCard({ 
  member, 
  onApprove, 
  onReject, 
  getStatusBadge, 
  getRoleBadge 
}: TeamMemberCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPending = member.status === 'pending' || member.status === 'pending_approval' || !member.is_approved;
  const roleLower = (member.role || '').toLowerCase();
  const canApprove = isPending && (roleLower === 'collector' || roleLower === 'staff' || roleLower === 'admin');

  return (
    <Card className="hover:shadow-xl transition-all duration-200 border-0 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {member.full_name}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              {/* 3D status badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 text-gray-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_10px_rgba(0,0,0,0.12)]">
              <span className={`w-2 h-2 rounded-full ${(member.status==='active' || member.status==='approved')?'bg-green-500':'bg-yellow-500'} shadow`} />
                <span className="text-xs font-semibold capitalize">{(member.status||'').replace('_',' ')}</span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canApprove && (
                <>
                  <DropdownMenuItem onClick={onApprove} className="text-green-600">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onReject} className="text-red-600">
                    <UserX className="w-4 h-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-2 text-gray-400" />
            <span className="truncate">{member.email}</span>
          </div>
          
          {member.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2 text-gray-400" />
              <span>{member.phone}</span>
            </div>
          )}
          
          {member.township && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              <span>{member.township}</span>
            </div>
          )}
        </div>

        {/* Employee Information */}
        {member.employee_number && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Employee #:</span>
              <span className="ml-2 text-gray-600">{member.employee_number}</span>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="pt-2 border-t border-gray-100 space-y-1">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="w-3 h-3 mr-2" />
            <span>Created: {formatDate(member.created_at)}</span>
          </div>
          
          {member.last_login && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-2" />
              <span>Last login: {formatDate(member.last_login)}</span>
            </div>
          )}
          
          {member.approval_date && (
            <div className="flex items-center text-xs text-gray-500">
              <CheckCircle className="w-3 h-3 mr-2" />
              <span>Approved: {formatDate(member.approval_date)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {canApprove && (
          <div className="pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-1 bg-gradient-to-b from-green-400 to-green-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_rgba(0,128,0,0.35)]">
                <Button onClick={onApprove} size="sm" className="w-full bg-transparent hover:bg-white/10 text-white">
                  <UserCheck className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
              <div className="rounded-lg p-1 bg-gradient-to-b from-red-400 to-red-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_rgba(128,0,0,0.35)]">
                <Button onClick={onReject} size="sm" className="w-full bg-transparent hover:bg-white/10 text-white">
                  <UserX className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
