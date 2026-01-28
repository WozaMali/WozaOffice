'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { School, Home, Filter, Check, X, Search, Link as LinkIcon, Eye, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SchoolRow {
  id: string;
  name: string;
  township?: string;
  township_name?: string;
  address?: string;
  city: string;
  province: string;
  student_count: number;
  school_type: string;
  is_active: boolean;
  created_at: string;
}

interface HomeRow {
  id: string;
  name: string;
  city: string;
  province: string;
  child_count: number;
  is_active: boolean;
  created_at: string;
}

interface FundingRequest {
  id: string;
  requester_type: 'school' | 'child_home';
  requester_id: string;
  title: string;
  amount_requested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface ApplicationRow {
  id: string;
  created_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  full_name: string;
  date_of_birth: string | null;
  phone_number: string | null;
  email: string | null;
  id_number: string | null;
  school_name: string | null;
  grade: string | null;
  student_number: string | null;
  academic_performance: string | null;
  household_income: string | null;
  household_size: string | null;
  employment_status: string | null;
  other_income_sources: string | null;
  support_type: string[] | null;
  urgent_needs: string | null;
  previous_support: string | null;
  has_id_document: boolean;
  has_school_report: boolean;
  has_income_proof: boolean;
  has_bank_statement: boolean;
  special_circumstances: string | null;
  community_involvement: string | null;
  references_info: string | null;
  created_at: string;
}

export default function BeneficiariesPage() {
  const [activeTab, setActiveTab] = useState<'schools' | 'homes' | 'requests' | 'applications'>('schools');
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [homes, setHomes] = useState<HomeRow[]>([]);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ApplicationRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, h, r, a] = await Promise.all([
        supabase.from('schools').select('*').order('school_name'),
        supabase.from('child_headed_homes').select('*').order('name'),
        supabase.from('green_scholar_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('green_scholar_applications').select('*').order('created_at', { ascending: false })
      ]);
      if (s.error) throw s.error;
      if (h.error) throw h.error;
      setSchools((s.data || []) as any);
      setHomes((h.data || []) as any);
      setRequests((r.data || []) as any);
      setApplications((a.data || []) as any);
    } catch (e: any) {
      setError(e.message || 'Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(s => [s.name, s.township, s.township_name, s.city, s.province, s.school_type].some(x => (x || '').toLowerCase().includes(q)));
  }, [schools, search]);

  // Pagination for schools
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSchools = filteredSchools.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredHomes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return homes;
    return homes.filter(h => [h.name, h.city, h.province].some(x => (x || '').toLowerCase().includes(q)));
  }, [homes, search]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r => [r.title, r.reason, r.requester_type].some(x => (x || '').toLowerCase().includes(q)));
  }, [requests, search]);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(a => [a.full_name, a.email, a.phone_number, a.school_name].some(x => (x || '').toLowerCase().includes(q)));
  }, [applications, search]);

  const updateRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      const auth = await supabase.auth.getUser();
      const approverId = auth.data?.user?.id;
      const { error } = await supabase.rpc('approve_green_scholar_request', {
        p_request_id: id,
        p_approver_id: approverId,
        p_note: 'Approved via admin portal'
      });
      if (!error) setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      return;
    }
    const { error } = await supabase
      .from('green_scholar_requests')
      .update({ status })
      .eq('id', id);
    if (!error) setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Beneficiary Management</h1>
            <p className="text-gray-600">Manage schools, child-headed homes, requests, and applications</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <School className="w-4 h-4 mr-2" />
              {schools.length} Schools
            </Badge>
            <Badge className="text-sm bg-gradient-to-r from-green-600 to-green-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Home className="w-4 h-4 mr-2" />
              {homes.length} Homes
            </Badge>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                ref={searchInputRef}
                placeholder="Search beneficiaries..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-10 w-80 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Total Schools</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <School className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {schools.length.toLocaleString()}
              </div>
              <p className="text-sm text-blue-700 font-medium">
                Registered schools
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Child Homes</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Home className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {homes.length.toLocaleString()}
              </div>
              <p className="text-sm text-green-700 font-medium">
                Child-headed homes
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-900">Funding Requests</CardTitle>
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {requests.length.toLocaleString()}
              </div>
              <p className="text-sm text-yellow-700 font-medium">
                Pending requests
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-900">Applications</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <Check className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {applications.length.toLocaleString()}
              </div>
              <p className="text-sm text-purple-700 font-medium">
                Student applications
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg">
            <TabsTrigger value="schools" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">Schools</TabsTrigger>
            <TabsTrigger value="homes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white">Child Homes</TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white">Requests</TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="schools">
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <School className="h-5 w-5 text-blue-600" /> 
                      Schools ({filteredSchools.length})
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Manage registered schools and their information</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="border-gray-300 hover:bg-gray-50"
                      onClick={() => searchInputRef.current?.focus()}
                    >
                      <Search className="h-4 w-4 mr-2" />Search
                    </Button>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />Filter
                    </Button>
                    <AddSchoolButton onCreated={loadAll} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-600 py-8">
                    <p>Error loading schools: {error}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white" style={{ border: '1px solid #e5e7eb' }}>
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-300">
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '40px' }}>
                            #
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '200px' }}>
                            School Name
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '120px' }}>
                            Township
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '120px' }}>
                            City
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '100px' }}>
                            Province
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '100px' }}>
                            School Type
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '100px' }}>
                            Students
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '80px' }}>
                            Status
                          </th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100" style={{ minWidth: '120px' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSchools.map((s, index) => (
                          <tr 
                            key={s.id} 
                            className={`border-b border-gray-300 hover:bg-blue-50 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600 font-medium">
                              {startIndex + index + 1}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-xs font-semibold text-gray-900">
                              {s.name || '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600">
                              {s.township || s.township_name || '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600">
                              {s.city || '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600">
                              {s.province || '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600">
                              {s.school_type || '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600 text-right">
                              {s.student_count?.toLocaleString() || '0'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5">
                              <Badge className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                s.is_active 
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-gray-100 text-gray-800 border border-gray-300'
                              }`}>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5">
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50 text-xs h-6 px-2">
                                  View
                                </Button>
                                <EditSchoolButton school={s} onSaved={loadAll} />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredSchools.length === 0 && (
                          <tr>
                            <td colSpan={9} className="border border-gray-300 px-4 py-12 text-center">
                              <School className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-lg font-medium text-gray-500">No schools found</p>
                              <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center text-xs text-gray-700">
                      <span>
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredSchools.length)} of {filteredSchools.length} schools
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 h-7 text-xs"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="min-w-[2rem] h-7 text-xs"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 h-7 text-xs"
                      >
                        Next
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homes">
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Home className="h-5 w-5 text-green-600" /> 
                      Child-Headed Homes ({filteredHomes.length})
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Manage child-headed homes and their information</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />Filter
                    </Button>
                    <AddHomeButton onCreated={loadAll} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-600 py-8">
                    <p>Error loading homes: {error}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredHomes.map(h => (
                      <div key={h.id} className="border-0 shadow-lg rounded-lg p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="font-semibold text-gray-900 text-lg">{h.name}</div>
                          <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                            h.is_active 
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                          }`}>
                            {h.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-green-500" />
                            {h.city}, {h.province}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            {h.child_count} children
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50">View</Button>
                          <EditHomeButton home={h} onSaved={loadAll} />
                        </div>
                      </div>
                    ))}
                    {filteredHomes.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <Home className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-lg font-medium text-gray-500">No homes found</p>
                        <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Funding Requests ({filteredRequests.length})
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Review and manage funding requests from schools and homes</p>
                  </div>
                  <AddRequestButton onCreated={loadAll} schools={schools} homes={homes} />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <Filter className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-500">No requests yet</p>
                    <p className="text-sm text-gray-400">Funding requests will appear here when submitted</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map(r => (
                      <div key={r.id} className="border-0 shadow-lg rounded-lg p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-lg mb-2">{r.title}</div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                              <Badge className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                r.requester_type === 'school' 
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              }`}>
                                {r.requester_type}
                              </Badge>
                              <span>{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-gray-600">{r.reason}</div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-gray-500 mb-1">Amount</div>
                              <div className="text-2xl font-bold text-gray-900">R {r.amount_requested.toLocaleString()}</div>
                              <div className="mt-2">
                                <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                                  r.status === 'pending' 
                                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                                    : r.status === 'approved' 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                                }`}>
                                  {r.status}
                                </Badge>
                              </div>
                            </div>
                            {r.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => updateRequestStatus(r.id, 'rejected')} className="text-red-600 border-red-300 hover:bg-red-50">
                                  <X className="h-4 w-4 mr-1" /> Reject
                                </Button>
                                <Button size="sm" onClick={() => updateRequestStatus(r.id, 'approved')} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                                  <Check className="h-4 w-4 mr-1" /> Approve
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredRequests.length === 0 && requests.length > 0 && (
                      <div className="text-center py-12">
                        <Filter className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-lg font-medium text-gray-500">No requests match your search</p>
                        <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Student Applications ({filteredApplications.length})
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Review and manage student scholarship applications</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {applications.length === 0 ? (
                  <div className="text-center py-12">
                    <Check className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-500">No applications yet</p>
                    <p className="text-sm text-gray-400">Student applications will appear here when submitted</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredApplications.map(a => (
                      <div key={a.id} className="border-0 shadow-lg rounded-lg p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-lg mb-2">{a.full_name}</div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                              <span>{a.email || a.phone_number || 'No contact'}</span>
                              <span>•</span>
                              <span>{new Date(a.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {a.school_name || '—'}{a.grade ? ` • Grade ${a.grade}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                              a.status === 'pending' 
                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                                : a.status === 'approved' 
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                            }`}>
                              {a.status}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => setViewing(a)} className="border-gray-300 hover:bg-gray-50">
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredApplications.length === 0 && applications.length > 0 && (
                      <div className="text-center py-12">
                        <Check className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-lg font-medium text-gray-500">No applications match your search</p>
                        <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          {viewing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setViewing(null)} />
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 text-gray-900">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Application Details</h3>
                  <button onClick={() => setViewing(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-800">Full Name</div>
                      <div className="font-medium">{viewing.full_name}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Date of Birth</div>
                      <div className="font-medium">{viewing.date_of_birth || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Email</div>
                      <div className="font-medium break-all">{viewing.email || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Phone</div>
                      <div className="font-medium">{viewing.phone_number || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">ID Number</div>
                      <div className="font-medium break-all">{viewing.id_number || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Status</div>
                      <Badge variant={viewing.status === 'pending' ? 'secondary' : viewing.status === 'approved' ? 'default' : 'destructive'}>{viewing.status}</Badge>
                    </div>
                    <div>
                      <div className="text-gray-800">School</div>
                      <div className="font-medium">{viewing.school_name || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Grade</div>
                      <div className="font-medium">{viewing.grade || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">Academic Performance</div>
                      <div className="font-medium whitespace-pre-wrap">{viewing.academic_performance || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Household Income</div>
                      <div className="font-medium">{viewing.household_income || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Household Size</div>
                      <div className="font-medium">{viewing.household_size || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Employment Status</div>
                      <div className="font-medium">{viewing.employment_status || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">Other Income Sources</div>
                      <div className="font-medium whitespace-pre-wrap">{viewing.other_income_sources || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">Support Type</div>
                      <div className="font-medium">{(viewing.support_type || []).join(', ') || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">Urgent Needs</div>
                      <div className="font-medium whitespace-pre-wrap">{viewing.urgent_needs || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">Previous Support</div>
                      <div className="font-medium whitespace-pre-wrap">{viewing.previous_support || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Documents</div>
                      <div className="font-medium text-sm">ID: {viewing.has_id_document ? 'Yes' : 'No'} • School Report: {viewing.has_school_report ? 'Yes' : 'No'}</div>
                      <div className="font-medium text-sm">Income Proof: {viewing.has_income_proof ? 'Yes' : 'No'} • Bank Statement: {viewing.has_bank_statement ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">Special Circumstances</div>
                      <div className="font-medium whitespace-pre-wrap">{viewing.special_circumstances || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">Community Involvement</div>
                      <div className="font-medium whitespace-pre-wrap">{viewing.community_involvement || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-800">References</div>
                      <div className="font-medium whitespace-pre-wrap">{viewing.references_info || '—'}</div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                </div>
              </div>
            </div>
          )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AddSchoolButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', province: '', school_type: 'primary', student_count: 0 });

  const save = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from('schools').insert({
        name: form.name,
        city: form.city,
        province: form.province,
        school_type: form.school_type,
        student_count: Number(form.student_count) || 0
      });
      if (error) throw error;
      setOpen(false);
      onCreated();
    } catch (e) {
      // handle inline in UI if needed
    } finally {
      setSaving(false);
    }
  };

  if (!open) return <Button onClick={() => setOpen(true)}>Add School</Button>;
  return (
    <div className="border rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input placeholder="School name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        <Input placeholder="Province" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} />
        <Input placeholder="Type (primary/secondary/special_needs)" value={form.school_type} onChange={e => setForm({ ...form, school_type: e.target.value })} />
        <Input placeholder="Student count" type="number" value={form.student_count} onChange={e => setForm({ ...form, student_count: Number(e.target.value) })} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button disabled={saving} onClick={save}>Save</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function AddRequestButton({ onCreated, schools, homes }: { onCreated: () => void; schools: SchoolRow[]; homes: HomeRow[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ requester_type: 'school' | 'child_home'; requester_id: string; title: string; amount: number; reason: string; file_url?: string }>({
    requester_type: 'school',
    requester_id: '',
    title: '',
    amount: 0,
    reason: ''
  });

  const save = async () => {
    try {
      setSaving(true);
      const auth = await supabase.auth.getUser();
      const creator = auth.data?.user?.id || null;
      const { data, error } = await supabase
        .from('green_scholar_requests')
        .insert({
          requester_type: form.requester_type,
          requester_id: form.requester_id,
          title: form.title,
          amount_requested: Number(form.amount) || 0,
          reason: form.reason,
          created_by: creator
        })
        .select('id')
        .single();
      if (error) throw error;
      if (form.file_url) {
        await supabase.from('green_scholar_request_files').insert({
          request_id: data?.id,
          file_url: form.file_url
        });
      }
      setOpen(false);
      onCreated();
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!open) return <Button onClick={() => setOpen(true)}>New Request</Button>;
  return (
    <div className="border rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Requester Type</label>
          <select className="border rounded h-9 px-2" value={form.requester_type} onChange={e => setForm({ ...form, requester_type: e.target.value as any, requester_id: '' })} >
            <option value="school">School</option>
            <option value="child_home">Child Home</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Requester</label>
          <select className="border rounded h-9 px-2" value={form.requester_id} onChange={e => setForm({ ...form, requester_id: e.target.value })} >
            <option value="">Select...</option>
            {(form.requester_type === 'school' ? schools : homes).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
        <Input placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-gray-400" />
          <Input placeholder="Document URL (optional)" value={form.file_url || ''} onChange={e => setForm({ ...form, file_url: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button disabled={saving || !form.requester_id || !form.title || !form.amount} onClick={save}>Create</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function EditSchoolButton({ school, onSaved }: { school: SchoolRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: school.name, city: school.city, province: school.province, school_type: school.school_type, student_count: school.student_count, is_active: school.is_active });

  const save = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from('schools').update({
        name: form.name,
        city: form.city,
        province: form.province,
        school_type: form.school_type,
        student_count: Number(form.student_count) || 0,
        is_active: !!form.is_active
      }).eq('id', school.id);
      if (error) throw error;
      setOpen(false);
      onSaved();
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit</Button>;
  return (
    <div className="border rounded-lg p-3 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input placeholder="School name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        <Input placeholder="Province" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} />
        <Input placeholder="Type" value={form.school_type} onChange={e => setForm({ ...form, school_type: e.target.value })} />
        <Input placeholder="Student count" type="number" value={form.student_count} onChange={e => setForm({ ...form, student_count: Number(e.target.value) })} />
      </div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" disabled={saving} onClick={save}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function AddHomeButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', province: '', child_count: 0 });
  const save = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from('child_headed_homes').insert({
        name: form.name,
        city: form.city,
        province: form.province,
        child_count: Number(form.child_count) || 0
      });
      if (error) throw error;
      setOpen(false);
      onCreated();
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };
  if (!open) return <Button onClick={() => setOpen(true)}>Add Home</Button>;
  return (
    <div className="border rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input placeholder="Home name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        <Input placeholder="Province" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} />
        <Input placeholder="Children" type="number" value={form.child_count} onChange={e => setForm({ ...form, child_count: Number(e.target.value) })} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button disabled={saving} onClick={save}>Save</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function EditHomeButton({ home, onSaved }: { home: HomeRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: home.name, city: home.city, province: home.province, child_count: home.child_count, is_active: true });
  const save = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from('child_headed_homes').update({
        name: form.name,
        city: form.city,
        province: form.province,
        child_count: Number(form.child_count) || 0,
        is_active: !!form.is_active
      }).eq('id', home.id);
      if (error) throw error;
      setOpen(false);
      onSaved();
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit</Button>;
  return (
    <div className="border rounded-lg p-3 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input placeholder="Home name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        <Input placeholder="Province" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} />
        <Input placeholder="Children" type="number" value={form.child_count} onChange={e => setForm({ ...form, child_count: Number(e.target.value) })} />
      </div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" disabled={saving} onClick={save}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
