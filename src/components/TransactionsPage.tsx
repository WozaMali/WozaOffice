"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trash2, 
  AlertTriangle, 
  Wallet, 
  CreditCard, 
  Calendar,
  User,
  Coins,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  getAllPointsTransactions,
  getAllMonetaryTransactions,
  deletePointsTransaction,
  deleteMonetaryTransaction,
  deleteMultiplePointsTransactions,
  deleteMultipleMonetaryTransactions,
  deleteAllTransactions,
  PointsTransaction,
  MonetaryTransaction
} from '@/lib/transactionsService';
import { DeleteTransactionsDialog } from './DeleteTransactionsDialog';
import { RoleBasedAccess } from '@/lib/role-based-access';
import { useAuth } from '@/hooks/use-auth';

export default function TransactionsPage() {
  const { profile } = useAuth();
  const [pointsTransactions, setPointsTransactions] = useState<PointsTransaction[]>([]);
  const [monetaryTransactions, setMonetaryTransactions] = useState<MonetaryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedPointsTransactions, setSelectedPointsTransactions] = useState<string[]>([]);
  const [selectedMonetaryTransactions, setSelectedMonetaryTransactions] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'single-points' | 'single-monetary' | 'bulk-points' | 'bulk-monetary' | 'all';
    transactionId?: string;
  }>({ isOpen: false, type: 'single-points' });

  // Check if user can delete transactions
  const canDeleteTransactions = RoleBasedAccess.canDeleteTransactions(profile);

  // Load transactions
  useEffect(() => {
    // Show UI immediately, load data in background
    setLoading(false);
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setError(null);
    // Load in background without blocking UI
    try {
      const [pointsResult, monetaryResult] = await Promise.all([
        getAllPointsTransactions(),
        getAllMonetaryTransactions()
      ]);

      if (pointsResult.error) {
        console.error('Error loading points transactions:', pointsResult.error);
      } else {
        setPointsTransactions(pointsResult.data || []);
      }

      if (monetaryResult.error) {
        console.error('Error loading monetary transactions:', monetaryResult.error);
      } else {
        setMonetaryTransactions(monetaryResult.data || []);
      }

    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions');
    }
  };

  const handleDeletePointsTransaction = (transactionId: string) => {
    setDeleteDialog({
      isOpen: true,
      type: 'single-points',
      transactionId
    });
  };

  const handleDeleteMonetaryTransaction = (transactionId: string) => {
    setDeleteDialog({
      isOpen: true,
      type: 'single-monetary',
      transactionId
    });
  };

  const handleBulkDeletePointsTransactions = () => {
    if (selectedPointsTransactions.length === 0) return;
    setDeleteDialog({
      isOpen: true,
      type: 'bulk-points'
    });
  };

  const handleBulkDeleteMonetaryTransactions = () => {
    if (selectedMonetaryTransactions.length === 0) return;
    setDeleteDialog({
      isOpen: true,
      type: 'bulk-monetary'
    });
  };

  const handleDeleteAllTransactions = () => {
    setDeleteDialog({
      isOpen: true,
      type: 'all'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    const value = Number.isFinite(amount as any) ? Number(amount) : 0;
    return `C ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle actual deletion based on dialog type
  const handleConfirmDelete = async () => {
    const { type, transactionId } = deleteDialog;
    
    try {
      let result;
      
      switch (type) {
        case 'single-points':
          if (!transactionId) return;
          result = await deletePointsTransaction(transactionId);
          if (result.success) {
            setPointsTransactions(prev => prev.filter(t => t.id !== transactionId));
            setNotice({ type: 'success', message: result.message });
            // Refresh the data to ensure UI is in sync
            setTimeout(() => loadTransactions(), 1000);
          } else {
            setNotice({ type: 'error', message: result.message });
          }
          break;
          
        case 'single-monetary':
          if (!transactionId) return;
          result = await deleteMonetaryTransaction(transactionId);
          if (result.success) {
            setMonetaryTransactions(prev => prev.filter(t => t.id !== transactionId));
            setNotice({ type: 'success', message: result.message });
            // Refresh the data to ensure UI is in sync
            setTimeout(() => loadTransactions(), 1000);
          } else {
            setNotice({ type: 'error', message: result.message });
          }
          break;
          
        case 'bulk-points':
          result = await deleteMultiplePointsTransactions(selectedPointsTransactions);
          if (result.success) {
            setPointsTransactions(prev => prev.filter(t => !selectedPointsTransactions.includes(t.id)));
            setSelectedPointsTransactions([]);
            setNotice({ type: 'success', message: result.message });
          } else {
            setNotice({ type: 'error', message: result.message });
          }
          break;
          
        case 'bulk-monetary':
          result = await deleteMultipleMonetaryTransactions(selectedMonetaryTransactions);
          if (result.success) {
            setMonetaryTransactions(prev => prev.filter(t => !selectedMonetaryTransactions.includes(t.id)));
            setSelectedMonetaryTransactions([]);
            setNotice({ type: 'success', message: result.message });
          } else {
            setNotice({ type: 'error', message: result.message });
          }
          break;
          
        case 'all':
          result = await deleteAllTransactions();
          if (result.success) {
            setPointsTransactions([]);
            setMonetaryTransactions([]);
            setSelectedPointsTransactions([]);
            setSelectedMonetaryTransactions([]);
            setNotice({ type: 'success', message: result.message });
          } else {
            setNotice({ type: 'error', message: result.message });
          }
          break;
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      setNotice({ type: 'error', message: 'Failed to delete transactions' });
    }
  };

  // Get dialog configuration based on type
  const getDialogConfig = () => {
    const { type, transactionId } = deleteDialog;
    
    switch (type) {
      case 'single-points':
        return {
          title: 'Delete Points Transaction',
          description: 'Are you sure you want to delete this points transaction?',
          transactionCount: 1,
          isDangerous: false,
          requireConfirmation: false
        };
        
      case 'single-monetary':
        return {
          title: 'Delete Monetary Transaction',
          description: 'Are you sure you want to delete this monetary transaction?',
          transactionCount: 1,
          isDangerous: false,
          requireConfirmation: false
        };
        
      case 'bulk-points':
        return {
          title: 'Delete Points Transactions',
          description: `Are you sure you want to delete ${selectedPointsTransactions.length} points transactions?`,
          transactionCount: selectedPointsTransactions.length,
          isDangerous: true,
          requireConfirmation: true,
          confirmationText: 'DELETE'
        };
        
      case 'bulk-monetary':
        return {
          title: 'Delete Monetary Transactions',
          description: `Are you sure you want to delete ${selectedMonetaryTransactions.length} monetary transactions?`,
          transactionCount: selectedMonetaryTransactions.length,
          isDangerous: true,
          requireConfirmation: true,
          confirmationText: 'DELETE'
        };
        
      case 'all':
        return {
          title: 'Delete ALL Transactions',
          description: 'This will permanently delete ALL transactions in the system. This action cannot be undone.',
          transactionCount: pointsTransactions.length + monetaryTransactions.length,
          isDangerous: true,
          requireConfirmation: true,
          confirmationText: 'DELETE ALL'
        };
        
      default:
        return {
          title: 'Delete Transactions',
          description: 'Are you sure you want to delete these transactions?',
          transactionCount: 0,
          isDangerous: false,
          requireConfirmation: false
        };
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Transactions Management</h1>
            <p className="text-gray-600">Manage wallet and regular transactions across the system</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Transactions</div>
              <div className="text-2xl font-bold text-blue-600">{pointsTransactions.length + monetaryTransactions.length}</div>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Wallet className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Total Transactions</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {(pointsTransactions.length + monetaryTransactions.length).toLocaleString()}
              </div>
              <p className="text-sm text-blue-700 font-medium">
                All time transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Monetary Transactions</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {monetaryTransactions.length.toLocaleString()}
              </div>
              <p className="text-sm text-green-700 font-medium">
                Cash transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-900">Points Transactions</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <Coins className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {pointsTransactions.length.toLocaleString()}
              </div>
              <p className="text-sm text-purple-700 font-medium">
                Points-based transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-900">Actions</CardTitle>
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Trash2 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTransactions}
                  disabled={loading}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Loader2 className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                {canDeleteTransactions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAllTransactions}
                    disabled={deleting === 'all'}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {deleting === 'all' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notice */}
      {notice && (
        <Alert className={notice.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {notice.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={notice.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {notice.message}
          </AlertDescription>
        </Alert>
      )}

        {/* Monetary Transactions */}
        <Card className="border-0 shadow-xl bg-white mb-6">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Monetary Transactions ({monetaryTransactions.length})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Cash-based transactions and payments</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="text-sm bg-gradient-to-r from-green-600 to-green-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {monetaryTransactions.length} Transactions
                </Badge>
                {canDeleteTransactions && selectedMonetaryTransactions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDeleteMonetaryTransactions}
                    disabled={deleting === 'bulk-monetary'}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {deleting === 'bulk-monetary' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete Selected ({selectedMonetaryTransactions.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {monetaryTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No monetary transactions found</h3>
                <p className="text-gray-500">No cash-based transactions have been recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedMonetaryTransactions.length === monetaryTransactions.length && monetaryTransactions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMonetaryTransactions(monetaryTransactions.map(t => t.id));
                            } else {
                              setSelectedMonetaryTransactions([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monetaryTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedMonetaryTransactions.includes(transaction.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMonetaryTransactions(prev => [...prev, transaction.id]);
                              } else {
                                setSelectedMonetaryTransactions(prev => prev.filter(id => id !== transaction.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="text-xs font-semibold px-3 py-1 rounded-full shadow-sm bg-gradient-to-r from-green-500 to-green-600 text-white">
                            {transaction.transaction_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                              <Coins className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-green-600">
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                              <Wallet className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {transaction.points} pts
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {transaction.description || 'No description'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Source: {transaction.source_id || 'No source'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(transaction.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canDeleteTransactions && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteMonetaryTransaction(transaction.id)}
                              disabled={deleting === transaction.id}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              {deleting === transaction.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
      </Card>

        {/* Points Transactions */}
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-purple-600" />
                  Points Transactions ({pointsTransactions.length})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Points-based transactions and rewards</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="text-sm bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                  <Wallet className="w-4 h-4 mr-2" />
                  {pointsTransactions.length} Transactions
                </Badge>
                {canDeleteTransactions && selectedPointsTransactions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDeletePointsTransactions}
                    disabled={deleting === 'bulk-points'}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {deleting === 'bulk-points' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete Selected ({selectedPointsTransactions.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pointsTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No points transactions found</h3>
                <p className="text-gray-500">No points-based transactions have been recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedPointsTransactions.length === pointsTransactions.length && pointsTransactions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPointsTransactions(pointsTransactions.map(t => t.id));
                            } else {
                              setSelectedPointsTransactions([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pointsTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedPointsTransactions.includes(transaction.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPointsTransactions(prev => [...prev, transaction.id]);
                              } else {
                                setSelectedPointsTransactions(prev => prev.filter(id => id !== transaction.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="text-xs font-semibold px-3 py-1 rounded-full shadow-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            {transaction.transaction_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                              <Wallet className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-purple-600">
                              {transaction.points} pts
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                              <Coins className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {transaction.description || 'No description'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Source: {transaction.source_id || 'No source'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(transaction.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canDeleteTransactions && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePointsTransaction(transaction.id)}
                              disabled={deleting === transaction.id}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              {deleting === transaction.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <DeleteTransactionsDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog({ isOpen: false, type: 'single-points' })}
          onConfirm={handleConfirmDelete}
          {...getDialogConfig()}
        />
      </div>
    </div>
  );
}
