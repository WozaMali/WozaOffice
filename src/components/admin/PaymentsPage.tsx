'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  User,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trash2
} from 'lucide-react';
import { 
  getWithdrawals, 
  subscribeToWithdrawals, 
  updateWithdrawalStatusOffice, 
  formatDate, 
  formatCurrency,
  getWithdrawalsFallbackFromCollections
} from '@/lib/admin-services';

export default function PaymentsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'wallet' | 'cash' | 'bank_transfer' | 'mobile_money'>('bank_transfer');

  // Load withdrawals and set up real-time subscription
  useEffect(() => {
    loadWithdrawals();
    
    // Subscribe to real-time changes
    const subscription = subscribeToWithdrawals((payload) => {
      console.log('🔔 Real-time withdrawal update:', payload);
      if (payload.eventType === 'INSERT') {
        console.log('➕ New withdrawal inserted:', payload.new);
        setWithdrawals(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        console.log('🔄 Withdrawal updated:', payload.new);
        setWithdrawals(prev => prev.map(row => 
          row.id === payload.new.id ? payload.new : row
        ));
      } else if (payload.eventType === 'DELETE') {
        console.log('🗑️ Withdrawal deleted:', payload.old);
        setWithdrawals(prev => prev.filter(row => row.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter withdrawals based on search and filters
  useEffect(() => {
    let filtered = withdrawals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        row.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(row => row.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(row => row.payout_method === methodFilter);
    }

    setFilteredWithdrawals(filtered);
  }, [withdrawals, searchTerm, statusFilter, methodFilter]);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading withdrawals with status filter:', statusFilter);
      const data = await getWithdrawals(statusFilter);
      console.log('📊 Loaded withdrawals:', data);
      setWithdrawals(data);
    } catch (error) {
      console.error('❌ Error loading withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (withdrawalId: string, newStatus: string) => {
    try {
      await updateWithdrawalStatusOffice(withdrawalId, newStatus as any, adminNotes, payoutMethod);
      setSelectedPayment(null);
      setAdminNotes('');
      // Real-time update will handle the UI update
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMethodBadge = (method: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (method) {
      case 'wallet':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'bank_transfer':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'cash':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'mobile_money':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Delete this withdrawal? This removes it from Office and history views.')
      : true;
    if (!confirmed) return;

    try {
      console.log('🗑️ Attempting to delete withdrawal:', withdrawalId);
      const resp = await fetch('/api/admin/delete-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId })
      });
      
      console.log('📡 Delete response status:', resp.status);
      
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        console.error('❌ Delete API error:', j);
        throw new Error(j?.error || `HTTP ${resp.status}`);
      }
      
      const result = await resp.json().catch(() => ({}));
      console.log('✅ Delete successful:', result);
      
      setWithdrawals(prev => prev.filter(w => w.id !== withdrawalId));
      
      // Refresh the page to ensure UI is updated
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e: any) {
      console.error('❌ Delete withdrawal failed:', e);
      if (typeof window !== 'undefined') window.alert('Failed to delete: ' + (e?.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPending = withdrawals.filter(p => p.status === 'pending').length;
  const totalApproved = withdrawals.filter(p => p.status === 'approved').length;
  const totalAmount = withdrawals.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingAmount = withdrawals.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Payment Management</h1>
            <p className="text-gray-600">Manage withdrawals and payment processing</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <CreditCard className="w-4 h-4 mr-2" />
              {withdrawals.length} Total Payments
            </Badge>
            <Badge className="text-sm bg-gradient-to-r from-yellow-600 to-yellow-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Clock className="w-4 h-4 mr-2" />
              {totalPending} Pending
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Total Payments</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {withdrawals.length.toLocaleString()}
              </div>
              <p className="text-sm text-blue-700 font-medium">
                All time payments
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-900">Pending</CardTitle>
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {totalPending.toLocaleString()}
              </div>
              <p className="text-sm text-yellow-700 font-medium">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Total Amount</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {formatCurrency(totalAmount)}
              </div>
              <p className="text-sm text-green-700 font-medium">
                Total processed
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-900">Pending Amount</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {formatCurrency(pendingAmount)}
              </div>
              <p className="text-sm text-purple-700 font-medium">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-900">Approved</CardTitle>
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').length.toLocaleString()}
              </div>
              <p className="text-sm text-emerald-700 font-medium">
                Successfully processed
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-red-900">Rejected</CardTitle>
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {withdrawals.filter(w => w.status === 'rejected' || w.status === 'cancelled').length.toLocaleString()}
              </div>
              <p className="text-sm text-red-700 font-medium">
                Declined requests
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Approved Amount</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {formatCurrency(withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').reduce((sum, w) => sum + (w.amount || 0), 0))}
              </div>
              <p className="text-sm text-green-700 font-medium">
                Total approved
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-900">Rejected Amount</CardTitle>
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {formatCurrency(withdrawals.filter(w => w.status === 'rejected' || w.status === 'cancelled').reduce((sum, w) => sum + (w.amount || 0), 0))}
              </div>
              <p className="text-sm text-orange-700 font-medium">
                Total rejected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="border-0 shadow-xl bg-white mb-6">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Withdrawals ({filteredWithdrawals.length})</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Review and process payment requests</p>
              </div>
              <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                <CreditCard className="w-4 h-4 mr-2" />
                {filteredWithdrawals.length} Payments
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWithdrawals.map((row) => (
                    <tr key={row.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {row.owner_name || row.user?.full_name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {row.user?.email || row.user_id || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(row.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                          row.payout_method === 'wallet' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                          row.payout_method === 'bank_transfer' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                          row.payout_method === 'cash' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                          row.payout_method === 'mobile_money' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                          'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                        }`}>
                          {row.payout_method || 'bank_transfer'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                          row.status === 'approved' || row.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                          row.status === 'rejected' || row.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                          row.status === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                          'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                        }`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(row.status)}
                            {row.status}
                          </div>
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(row.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPayment(row)}
                            className="border-gray-300 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {row.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleStatusUpdate(row.id, 'approved')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleStatusUpdate(row.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteWithdrawal(row.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Withdrawal Details</h3>
            
            <div className="space-y-3 mb-4 text-gray-800">
              <div>
                <span className="font-medium">User:</span> {selectedPayment.user?.full_name || selectedPayment.owner_name}
              </div>
              <div>
                <span className="font-medium">Email/ID:</span> {selectedPayment.user?.email || selectedPayment.user_id || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Amount:</span> {formatCurrency(selectedPayment.amount)}
              </div>
              <div>
                <span className="font-medium">Bank:</span> {selectedPayment.bank_name}
              </div>
              <div>
                <span className="font-medium">Account Number:</span> {selectedPayment.account_number}
              </div>
              <div>
                <span className="font-medium">Account Type:</span> {selectedPayment.account_type}
              </div>
              <div>
                <span className="font-medium">Branch Code:</span> {selectedPayment.branch_code}
              </div>
              <div>
                <span className="font-medium">Payout Method:</span> {selectedPayment.payout_method || 'bank_transfer'}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <Badge className={`ml-2 ${getStatusBadge(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Created:</span> {formatDate(selectedPayment.created_at)}
              </div>
              {selectedPayment.notes && (
                <div>
                  <span className="font-medium">Notes:</span> {selectedPayment.notes}
                </div>
              )}
              <div>
                <span className="font-medium">Reference:</span> 
                <div className="text-xs text-gray-600 mt-1 break-all">{selectedPayment.id}</div>
              </div>
            </div>

            {selectedPayment.status === 'pending' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-800">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this payment..."
                  rows={3}
                />
              </div>
            )}

            {selectedPayment.status === 'pending' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-800">Payout Method</label>
                <Select value={payoutMethod} onValueChange={(v) => setPayoutMethod(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash Payout</SelectItem>
                    <SelectItem value="wallet">Wallet (deduct balance)</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
                {payoutMethod === 'cash' && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Cash Payment:</strong> Prepare C{selectedPayment.amount} in cash for this withdrawal. 
                      The user will need to collect it in person or arrange for pickup.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPayment(null);
                  setAdminNotes('');
                }}
              >
                Close
              </Button>
              {selectedPayment.status === 'pending' && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate(selectedPayment.id, 'approved')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate(selectedPayment.id, 'rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
