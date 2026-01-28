'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, UserPlus, Mail, Phone, Shield, UserCheck, Users, User, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'admin',
    township: '',
    employeeNumber: '',
    password: '',
    confirmPassword: '',
    sendInvite: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  const generateEmployeeNumber = async (): Promise<string> => {
    try {
      const { data: latest } = await supabase
        .from('users')
        .select('employee_number')
        .not('employee_number', 'is', null)
        .order('employee_number', { ascending: false })
        .limit(1)
        .single();

      if (!latest?.employee_number) {
        return 'EMP0001';
      }

      const lastNumber = parseInt(latest.employee_number.replace('EMP', ''));
      return `EMP${String(lastNumber + 1).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating employee number:', error);
      return 'EMP0001';
    }
  };

  const resolveTownshipId = async (value: string): Promise<string | null> => {
    const input = (value || '').trim();
    if (!input) return null;
    // If the input already looks like a UUID, accept it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(input)) return input;

    // Try find area by name (case-insensitive)
    const { data: found, error: findError } = await supabase
      .from('areas')
      .select('id')
      .ilike('name', input)
      .limit(1)
      .maybeSingle();

    if (found?.id) return found.id as string;

    // If not found, create it to avoid blocking user creation
    if (findError && findError.code && findError.code !== 'PGRST116') {
      // Non-not-found error, fallback to null rather than throwing
      return null;
    }

    const { data: created, error: createError } = await supabase
      .from('areas')
      .insert({ name: input })
      .select('id')
      .single();

    if (createError || !created?.id) return null;
    return created.id as string;
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.email.includes('@')) return 'Please enter a valid email address';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!formData.sendInvite) {
      if (!formData.password) return 'Password is required';
      if (formData.password.length < 8) return 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    }
    if (!formData.role) return 'Please select a role';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Call server API to create both Auth user (email confirmed) and DB profile
      const resp = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone,
          role: formData.role,
          department: null,
          township: formData.township,
          password: formData.sendInvite ? undefined : formData.password,
          sendInvite: formData.sendInvite
        })
      });

      const result = await resp.json();
      if (!resp.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to create user');
      }

      setCreatedUser({
        user_id: result.data?.user_id,
        employee_number: result.data?.employee_number,
        message: 'User created successfully'
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
      
    } catch (err: any) {
      console.error('Error creating user:', err);
      if (err?.code === '23505' || (typeof err?.message === 'string' && (err.message.includes('duplicate key') || err.message.toLowerCase().includes('already exists')))) {
        setError('A user with this email already exists.');
      } else if (typeof err?.details === 'string' && err.details.includes('already exists')) {
        setError('A user with this email already exists.');
      } else {
        setError(err?.message || 'Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'admin',
      township: '',
      employeeNumber: '',
      password: '',
      confirmPassword: '',
      sendInvite: true
    });
    setError('');
    setSuccess(false);
    setCreatedUser(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl font-bold text-gray-900">
            <UserPlus className="w-6 h-6 mr-3 text-green-600" />
            Add New Team Member
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Create a new admin or collector account for your team
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-800 mb-2">User Created Successfully!</h3>
                <p className="text-green-600 mb-4">The new team member has been added to the system.</p>
                
                {createdUser && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-green-800 mb-2">User Details:</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                      <p><strong>Email:</strong> {formData.email}</p>
                      <p><strong>Employee Number:</strong> {createdUser.employee_number}</p>
                      <p><strong>Role:</strong> {formData.role}</p>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-gray-500">
                  The user can now log in with their email and password.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Personal Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Enter first name"
                        required
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Enter last name"
                        required
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                      required
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                      required
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Role and Location */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-yellow-600" />
                    Role & Location
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                        Role *
                      </Label>
                      <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                        <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="collector">Collector</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="township" className="text-sm font-medium text-gray-700">
                        Township/Area
                      </Label>
                      <Input
                        id="township"
                        value={formData.township}
                        onChange={(e) => handleInputChange('township', e.target.value)}
                        placeholder="Enter township or area"
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employeeNumber" className="text-sm font-medium text-gray-700">
                      Employee Number (optional)
                    </Label>
                    <Input
                      id="employeeNumber"
                      value={formData.employeeNumber}
                      onChange={(e) => handleInputChange('employeeNumber', e.target.value)}
                      placeholder={formData.role === 'collector' ? 'SNW-C0001 (auto if blank)' : 'SNW0001 (auto if blank)'}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500">
                      Admins default to SNW0001; Collectors to SNW-C0001. Leave blank to auto-generate next.
                    </p>
                  </div>
                </div>

                {/* Security */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-red-600" />
                    Security
                  </h4>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="inline-flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.sendInvite}
                        onChange={(e) => handleInputChange('sendInvite', e.target.checked)}
                      />
                      <span>Send invitation email (user sets password via email)</span>
                    </label>
                  </div>

                  {!formData.sendInvite && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password *
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Enter password"
                        required
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password *
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={loading}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating User...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create User
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
