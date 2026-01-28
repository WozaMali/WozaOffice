'use client';

import React, { useState, useEffect } from 'react';
import { 
  adminResetServices,
} from '../../lib/admin-reset-services';
import type {
  CustomerForReset,
  AdminResetStatistics
} from '../../types/admin-reset';
import { 
  Trash2, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Package,
  Users,
  BarChart3
} from 'lucide-react';

interface CustomerResetPanelProps {
  className?: string;
}

export default function CustomerResetPanel({ className = '' }: CustomerResetPanelProps) {
  const [customers, setCustomers] = useState<CustomerForReset[]>([]);
  const [statistics, setStatistics] = useState<AdminResetStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [resetReason, setResetReason] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResults, setResetResults] = useState<{
    success: string[];
    failed: Array<{ customerId: string; error: string }>;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersData, statsData] = await Promise.all([
        adminResetServices.getCustomersForReset(),
        adminResetServices.getAdminResetStatistics()
      ]);
      setCustomers(customersData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelection = (customerId: string) => {
    const newSelection = new Set(selectedCustomers);
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId);
    } else {
      newSelection.add(customerId);
    }
    setSelectedCustomers(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.customer_id)));
    }
  };

  const handleResetSelected = async () => {
    if (selectedCustomers.size === 0 || !resetReason.trim()) {
      alert('Please select customers and provide a reset reason');
      return;
    }

    if (!confirm(`Are you sure you want to reset ${selectedCustomers.size} customers? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsResetting(true);
      const results = await adminResetServices.batchResetCustomers(
        Array.from(selectedCustomers),
        resetReason
      );
      
      setResetResults(results);
      setSelectedCustomers(new Set());
      setResetReason('');
      
      // Reload data to reflect changes
      await loadData();
    } catch (error) {
      console.error('Error during batch reset:', error);
      alert('Error during batch reset. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSingleReset = async (customer: CustomerForReset, resetType: 'pickup' | 'wallet' | 'complete') => {
    if (!resetReason.trim()) {
      alert('Please provide a reset reason');
      return;
    }

    if (!confirm(`Are you sure you want to reset ${customer.full_name}'s ${resetType} data? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsResetting(true);
      let result;
      
      switch (resetType) {
        case 'pickup':
          result = await adminResetServices.resetCustomerPickupData({
            customerUuid: customer.customer_id,
            resetReason
          });
          break;
        case 'wallet':
          result = await adminResetServices.resetCustomerWallet({
            customerUuid: customer.customer_id,
            resetReason
          });
          break;
        case 'complete':
          result = await adminResetServices.resetCustomerComplete({
            customerUuid: customer.customer_id,
            resetReason
          });
          break;
      }
      
      alert(`Successfully reset ${customer.full_name}'s ${resetType} data`);
      setResetReason('');
      await loadData();
    } catch (error) {
      console.error('Error during reset:', error);
      alert(`Error during reset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getResetTypeColor = (resetType: string) => {
    switch (resetType) {
      case 'Both': return 'text-red-600 bg-red-100';
      case 'Pickup Data Only': return 'text-orange-600 bg-orange-100';
      case 'Wallet Only': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2">Loading customer data...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <Users className="h-6 w-6 mr-2" />
          Customer Reset Management
        </h2>
        
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-600">Total Customers</p>
                  <p className="text-2xl font-bold text-blue-900">{statistics.total_customers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm text-orange-600">Need Reset</p>
                  <p className="text-2xl font-bold text-orange-900">{statistics.customers_with_data}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-600">Resets Today</p>
                  <p className="text-2xl font-bold text-green-900">{statistics.total_resets_today}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-purple-600">This Month</p>
                  <p className="text-2xl font-bold text-purple-900">{statistics.total_resets_month}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Reset Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Reset Controls</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              {selectedCustomers.size === customers.length ? 'Deselect All' : 'Select All'}
            </button>
            
            <span className="text-sm text-gray-600">
              {selectedCustomers.size} of {customers.length} customers selected
            </span>
          </div>
          
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Reset reason (required)"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={handleResetSelected}
              disabled={selectedCustomers.size === 0 || !resetReason.trim() || isResetting}
              className="px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isResetting ? (
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Reset Selected ({selectedCustomers.size})
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={loadData}
            disabled={isResetting}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Reset Results */}
      {resetResults && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Results</h3>
          
          {resetResults.success.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  Successfully reset {resetResults.success.length} customers
                </span>
              </div>
            </div>
          )}
          
          {resetResults.failed.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center mb-2">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">
                  Failed to reset {resetResults.failed.length} customers
                </span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {resetResults.failed.map((failure) => (
                  <li key={failure.customerId}>
                    Customer {failure.customerId}: {failure.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={() => setResetResults(null)}
            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Customers Eligible for Reset ({filteredCustomers.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reset Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Package className="h-4 w-4 inline mr-1" />
                  Total KG
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.customer_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.has(customer.customer_id)}
                      onChange={() => handleCustomerSelection(customer.customer_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{customer.full_name}</div>
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResetTypeColor(customer.reset_type)}`}>
                      {customer.reset_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.total_kg.toFixed(2)} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R {customer.total_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R {customer.wallet_balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {customer.total_kg > 0 && (
                      <button
                        onClick={() => handleSingleReset(customer, 'pickup')}
                        disabled={isResetting}
                        className="text-orange-600 hover:text-orange-900 text-xs px-2 py-1 border border-orange-300 rounded hover:bg-orange-50"
                      >
                        Reset KG
                      </button>
                    )}
                    {customer.wallet_balance > 0 && (
                      <button
                        onClick={() => handleSingleReset(customer, 'wallet')}
                        disabled={isResetting}
                        className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        Reset Wallet
                      </button>
                    )}
                    {(customer.total_kg > 0 || customer.wallet_balance > 0) && (
                      <button
                        onClick={() => handleSingleReset(customer, 'complete')}
                        disabled={isResetting}
                        className="text-red-600 hover:text-red-900 text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50"
                      >
                        Reset All
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCustomers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No customers found matching your search.' : 'No customers eligible for reset.'}
          </div>
        )}
      </div>
    </div>
  );
}
