'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile } from '@/lib/supabase';
import { getUserDetails } from '@/lib/admin-services';
import { formatDate, formatCurrency } from '@/lib/admin-services';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  UserCheck, 
  Users,
  X,
  Loader2,
  Package,
  Wallet,
  TrendingUp
} from 'lucide-react';

interface UserDetailsModalProps {
  user: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

interface UserDetails {
  profile: Profile;
  collections: any[];
  wallet: any;
}

export default function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      loadUserDetails();
    }
  }, [user, isOpen]);

  const loadUserDetails = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getUserDetails(user.id);
      setDetails(data);
    } catch (err) {
      console.error('Error loading user details:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-red-600" />;
      case 'collector':
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'customer':
        return <Users className="w-4 h-4 text-gray-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'collector':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'customer':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            Complete information about {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <Button onClick={loadUserDetails} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {user.full_name || 'No Name'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRoleBadge(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge 
                        variant={user.is_active ? "default" : "secondary"}
                        className={user.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Joined: {formatDate(user.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Information */}
            {details.wallet && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Wallet Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {details.wallet.current_points || 0}
                      </div>
                      <div className="text-sm text-gray-600">Current Points</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {details.wallet.total_points_earned || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Earned</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {details.wallet.total_points_spent || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Spent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collections Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Collections ({details.collections.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {details.collections.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No collections found</p>
                ) : (
                  <div className="space-y-3">
                    {details.collections.slice(0, 5).map((collection) => (
                      <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{collection.collection_code}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(collection.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={collection.status === 'approved' ? 'default' : 'secondary'}
                            className={
                              collection.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {collection.status}
                          </Badge>
                          <div className="text-sm text-gray-600 mt-1">
                            {collection.total_weight_kg}kg • {formatCurrency(collection.total_value)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {details.collections.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        And {details.collections.length - 5} more collections...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
