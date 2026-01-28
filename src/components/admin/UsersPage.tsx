'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Package,
  Users,
  Building2,
  Shield,
  MapPin
} from 'lucide-react';
import { useTownships } from '@/lib/unified-admin-service';
import { UnifiedAdminService } from '@/lib/unified-admin-service';

// Common African first names (South African names) - used for shuffling
const AFRICAN_NAMES = new Set([
  'thabo', 'lerato', 'tumelo', 'karabo', 'tshepo', 'boitumelo', 'kgomotso', 'refilwe', 'katlego', 'lebogang',
  'mpho', 'teboho', 'kabelo', 'motlatsi', 'tshepiso', 'nthabiseng', 'mapule', 'bonolo', 'rorisang', 'onkarabile',
  'kelebogile', 'tshegofatso', 'lesego', 'otsile', 'boipelo', 'kagiso', 'keabetswe', 'tumisang', 'tshepang', 'thabiso',
  'mmathabo', 'mmamotse', 'mmamokete', 'sipho', 'thandeka', 'nomusa', 'sibusiso', 'nandi', 'bongani', 'hlengiwe',
  'themba', 'zanele', 'nokuthula', 'mxolisi', 'phumzile', 'jabulani', 'khanyisile', 'sandile', 'lindiwe', 'siyabonga',
  'gugu', 'mandisa', 'vusi', 'nosipho', 'ayanda', 'nkosinathi', 'ntokozo', 'nonhlanhla', 'nqobile', 'sanele',
  'lungile', 'nhlanhla', 'nomthandazo', 'mthokozisi', 'nombuso', 'xolani', 'nokwazi', 'zodwa', 'nkosazana', 'nomalanga',
  'nothando', 'nompumelelo', 'bhekisisa', 'zandile', 'sifiso', 'nokubonga', 'thulani', 'lwandle', 'mthunzi', 'siphesihle',
  'phindile', 'luyanda', 'minenhle', 'nontobeko', 'siyanda', 'luyolo', 'sinethemba', 'nkosikhona', 'vuyisile', 'zibusiso',
  'nqobizitha', 'mlungisi', 'sakhile', 'nhlakanipho', 'thulisile', 'luyanda', 'noxolo', 'ayanda', 'thandiswa', 'siphesihle',
  'zanele', 'sibusiso', 'nandipha', 'nomvula', 'hlengiwe', 'mandisa', 'vuyisile', 'nosipho', 'phumzile', 'khanyisile',
  'luyolo', 'nkosikhona', 'sinethemba', 'vuyolwethu', 'zimasa', 'khanyisa', 'lihle', 'yonela', 'andile', 'phakama',
  'zikhona', 'lutho', 'ncebakazi', 'sikelela', 'hlumelo', 'liyema', 'akhona', 'babalwa', 'khumbuzo', 'ziyanda',
  'lulama', 'phumla', 'siphokazi', 'lwandile', 'thulisa', 'zikhona', 'liyabona', 'yonwaba', 'siphelele', 'kholeka',
  'kagiso', 'boipelo', 'lesego', 'tshepiso', 'refilwe', 'neo', 'palesa', 'rudzani', 'azwindini', 'lufuno',
  'mulalo', 'takalani', 'khodani', 'vhutshilo', 'rendani', 'ndivhuwo', 'fhatuwani', 'livhuwani', 'vhahangwele', 'thivhulawi',
  'khathutshelo', 'ndamulelo', 'vhuthuhawe', 'rofhiwa', 'azwinndini', 'phathutshedzo', 'tshilidzi', 'bongani', 'thandeka',
  'sipho', 'themba', 'hlengiwe', 'nokuthula', 'mandisa', 'siyabonga', 'lindiwe', 'sandile', 'gugu', 'ayanda',
  'vusi', 'nosipho', 'nkosinathi', 'ntokozo', 'nonhlanhla', 'mpho', 'nqobile', 'sanele', 'lungile', 'nhlanhla'
]);

// Function to check if a name is African
function isAfricanName(name: string | null | undefined): boolean {
  if (!name) return false;
  const firstName = name.split(' ')[0].toLowerCase().trim();
  return AFRICAN_NAMES.has(firstName);
}

export default function UsersPage() {
   const [users, setUsers] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<any>(null);
   const [currentPage, setCurrentPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [totalUsers, setTotalUsers] = useState(0);
   const usersPerPage = 50;
   const { townships, loading: townshipsLoading, error: townshipsError } = useTownships();

  // Fetch users function - with pagination
  const loadUsers = async (page = 1) => {
    try {
      setError(null);
      setLoading(true);

      // Use API route with pagination
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout

      try {
        const response = await fetch(`/api/admin/users?page=${page}&limit=${usersPerPage}`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        if (result?.error) {
          throw new Error(result.error);
        }
        const data = result.users || [];
        const pagination = result.pagination || {};

        setUsers(data);
        setTotalUsers(pagination.total || data.length);
        setTotalPages(pagination.pages || 1);
        setCurrentPage(pagination.page || 1);
        setLoading(false);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          console.warn('⚠️ Users: API request timed out, using direct query...');
        }

        // Fallback to direct query if API fails
        const { data, error: fetchError } = await UnifiedAdminService.getAllUsers();

        if (fetchError) {
          console.error('❌ Users: Error loading users:', fetchError);
          setError(fetchError);
          setUsers([]);
        } else {
          setUsers(data || []);
          setTotalUsers(data?.length || 0);
          setTotalPages(Math.ceil((data?.length || 0) / usersPerPage));
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Users: Exception loading users:', err);
      setError(err);
      setUsers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, []);
  
  // Function to shuffle users prioritizing African names
  const shuffleUsersWithAfricanFirst = (usersList: typeof users) => {
    const shuffled = [...usersList];
    
    // Separate African and non-African names
    const africanUsers: typeof users = [];
    const otherUsers: typeof users = [];
    
    shuffled.forEach(user => {
      const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      if (isAfricanName(fullName)) {
        africanUsers.push(user);
      } else {
        otherUsers.push(user);
      }
    });
    
    // Shuffle both arrays
    for (let i = africanUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [africanUsers[i], africanUsers[j]] = [africanUsers[j], africanUsers[i]];
    }
    
    for (let i = otherUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherUsers[i], otherUsers[j]] = [otherUsers[j], otherUsers[i]];
    }
    
    // Combine: African names first, then others
    return [...africanUsers, ...otherUsers];
  };
  
  // Memoize shuffled users
  const [shuffledUsers, setShuffledUsers] = useState<typeof users>([]);
  
  useEffect(() => {
    if (users.length > 0) {
      setShuffledUsers(shuffleUsersWithAfricanFirst(users));
    }
  }, [users]);
  
  // Function to mask email
  const maskEmail = (email: string | null | undefined): string => {
    if (!email) return 'N/A';
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    } else if (localPart.length <= 4) {
      return `${localPart.slice(0, 2)}***@${domain}`;
    } else {
      return `${localPart.slice(0, 3)}***@${domain}`;
    }
  };
  
  // Function to mask township
  const maskTownship = (township: string): string => {
    if (!township || township === 'Not specified') return 'Not specified';
    if (township.length <= 3) return '***';
    if (township.length <= 6) {
      return `${township.slice(0, 2)}***`;
    } else {
      return `${township.slice(0, 3)}***`;
    }
  };
  
  // Function to extract township from address
  const extractTownshipFromAddress = (address: string | null | undefined): string => {
    if (!address) return 'Not specified';
    
    // Common township patterns in South Africa
    const townshipPatterns = [
      /(?:township|town|area|suburb|location|settlement|village|informal settlement)/i,
      /(?:soweto|alexandra|khayelitsha|gugulethu|langa|nyanga|philippi|mitchells plain|manenberg|bontheuwel|delft|belhar|kuils river|strand|gordon's bay|somerset west|paarl|stellenbosch|franschhoek|wellington|malmesbury|vredenburg|saldanha|vredendal|springbok|upington|kimberley|bloemfontein|welkom|bethlehem|harrismith|ladysmith|newcastle|pietermaritzburg|durban|richards bay|port shepstone|margate|umtata|east london|port elizabeth|grahamstown|graaff-reinet|oudtshoorn|george|knysna|plettenberg bay|mossel bay|swellendam|wolseley|tulbagh|ceres|wellington|paarl|stellenbosch|franschhoek|somerset west|strand|gordon's bay|kuils river|belhar|delft|mitchells plain|manenberg|bontheuwel|philippi|nyanga|langa|gugulethu|khayelitsha|alexandra|soweto)/i
    ];
    
    // Try to find township patterns
    for (const pattern of townshipPatterns) {
      const match = address.match(pattern);
      if (match) {
        return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
      }
    }
    
    // If no pattern matches, try to extract the last part of the address
    const parts = address.split(',').map(part => part.trim());
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length > 2 && lastPart.length < 50) {
        return lastPart;
      }
    }
    
    return 'Not specified';
  };
  
  // Display paginated users
  const paginatedUsers = shuffledUsers;
  
  // Calculate user statistics (using current page users)
  const residents = users.filter(u => u.role?.name === 'resident').length;
  const collectors = users.filter(u => u.role?.name === 'collector').length;
  const admins = users.filter(u => u.role?.name === 'admin' || u.role?.name === 'super_admin').length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Users Management</h1>
            <p className="text-gray-600">Manage system users and their locations</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Users className="w-4 h-4 mr-2" />
              {totalUsers} Total Users
            </Badge>
            <Badge className="text-sm bg-gradient-to-r from-green-600 to-green-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Activity className="w-4 h-4 mr-2" />
              {activeUsers} Active
            </Badge>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>Error loading users: {error.message}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-900">Total Users</CardTitle>
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {totalUsers.toLocaleString()}
                  </div>
                  <p className="text-sm text-blue-700 font-medium">
                    System users
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-green-900">Residents</CardTitle>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {residents.toLocaleString()}
                  </div>
                  <p className="text-sm text-green-700 font-medium">
                    Community members
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-900">Collectors</CardTitle>
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {collectors.toLocaleString()}
                  </div>
                  <p className="text-sm text-orange-700 font-medium">
                    Collection staff
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-900">Admins</CardTitle>
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {admins.toLocaleString()}
                  </div>
                  <p className="text-sm text-purple-700 font-medium">
                    System administrators
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-900">Active</CardTitle>
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 mb-1">
                    {activeUsers.toLocaleString()}
                  </div>
                  <p className="text-sm text-emerald-700 font-medium">
                    Active users
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Users Table */}
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">All Users</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Complete list of system users with location information</p>
                  </div>
                  <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                    <Users className="w-4 h-4 mr-2" />
                    {totalUsers} Users
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Township</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedUsers.map((user) => {
                        const township = (user as any).subdivision || extractTownshipFromAddress((user as any).address || (user as any).township_name);
                        const maskedTownship = maskTownship(township);
                        const maskedEmail = maskEmail(user.email);
                        return (
                          <tr key={user.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12">
                                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <span className="text-lg font-semibold text-white">
                                      {(user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'U').charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {user.id.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {maskedEmail}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                                user.role?.name === 'admin' || user.role?.name === 'super_admin' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                                user.role?.name === 'collector' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                                user.role?.name === 'resident' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                                'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                              }`}>
                                {user.role?.name || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600">
                                  {maskedTownship}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                                user.status === 'active' 
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                                  : user.status === 'suspended'
                                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                              }`}>
                                {user.status}
                              </Badge>
                            </td>
                           
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = Math.max(1, currentPage - 1);
                        setCurrentPage(newPage);
                        loadUsers(newPage);
                      }}
                      disabled={currentPage === 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = Math.min(totalPages, currentPage + 1);
                        setCurrentPage(newPage);
                        loadUsers(newPage);
                      }}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
