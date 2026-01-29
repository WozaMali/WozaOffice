'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Mail, Phone, MapPin, Calendar, Building, FileText } from 'lucide-react';

export default function EmployeeFormPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const checkCompletedRef = useRef(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    streetAddr: '',
    suburb: '',
    city: '',
    postalCode: '',
    department: '',
    township: '',
    emergencyContact: '',
    emergencyContactPhone: ''
  });

  useEffect(() => {
    // Prevent multiple checks/redirects
    if (checkCompletedRef.current) {
      return;
    }

    // Check if form is already completed - if so, redirect to admin dashboard
    const checkFormCompletion = async () => {
      if (!user?.id) return;
      
      // Mark that we're checking
      checkCompletedRef.current = true;
      
      // First check profile data (faster, no database query needed)
      const profileFormCompleted = (profile as any)?.employee_form_completed;
      if (profileFormCompleted === true) {
        router.replace('/admin');
        return;
      }
      
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('employee_form_completed, role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking employee form:', error);
          checkCompletedRef.current = false; // Reset on error
          // If error, still try to load existing data
          if (user?.email) {
            loadExistingData();
          }
          return;
        }

        // If form is already completed, redirect to admin dashboard
        if (userData?.employee_form_completed === true) {
          router.replace('/admin');
          return;
        }

        // If form is not completed, load existing data to pre-fill form
        checkCompletedRef.current = false; // Reset since form is not completed, allow future checks
        if (user?.email) {
          loadExistingData();
        }
      } catch (err) {
        console.error('Error checking employee form completion:', err);
        checkCompletedRef.current = false; // Reset on error
        // If error, still try to load existing data
        if (user?.email) {
          loadExistingData();
        }
      }
    };

    if (user?.id) {
      checkFormCompletion();
    }
  }, [user, profile, router]);

  const loadExistingData = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setFormData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          phone: data.phone || '',
          dateOfBirth: data.date_of_birth || '',
          streetAddr: data.address_line1 || data.street_addr || '',
          suburb: data.suburb || '',
          city: data.city || '',
          postalCode: data.postal_code || '',
          department: data.department || '',
          township: data.township || '',
          emergencyContact: data.emergency_contact_name || data.emergency_contact || '',
          emergencyContactPhone: data.emergency_contact_phone || ''
        });
      }
    } catch (err) {
      console.error('Error loading existing data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate required fields
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('First name and last name are required');
      }
      if (!formData.phone.trim()) {
        throw new Error('Phone number is required');
      }
      if (!formData.streetAddr.trim() || !formData.city.trim()) {
        throw new Error('Street address and city are required');
      }
      if (!formData.emergencyContact.trim() || !formData.emergencyContactPhone.trim()) {
        throw new Error('Emergency contact name and phone are required');
      }

      console.log('💾 Saving employee form data via API...', { 
        userId: user.id, 
        userEmail: user.email
      });

      // Update profile directly in Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: formData.phone.trim(),
          date_of_birth: formData.dateOfBirth || null,
          address_line1: formData.streetAddr.trim(),
          address_line2: '',
          suburb: formData.suburb.trim() || null,
          city: formData.city.trim(),
          postal_code: formData.postalCode.trim() || null,
          township: formData.township.trim() || null,
          department: formData.department.trim() || null,
          emergency_contact_name: formData.emergencyContact.trim(),
          emergency_contact_phone: formData.emergencyContactPhone.trim(),
          emergency_contact_relationship: null,
          employee_form_completed: true
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log('✅ Employee form data saved successfully');

      // Refresh profile to ensure employee_form_completed is updated in context
      if (refreshProfile) {
        console.log('🔄 Refreshing profile...');
        // Add a small delay to ensure database update is committed
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshProfile();
        console.log('✅ Profile refreshed');
      }

      console.log('✅ Employee form saved successfully! Redirecting to admin dashboard...');
      
      // Show success message briefly before redirect
      setError(''); // Clear any previous errors
      // Add a small delay to show success state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to admin dashboard
      router.push('/admin');
    } catch (err: any) {
      console.error('❌ Error saving employee form:', err);
      const errorMessage = err.message || 'Failed to save employee information';
      setError(errorMessage);
      
      // Log detailed error information for debugging
      if (err.message) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-green-600" />
              Employee Information Form
            </CardTitle>
            <CardDescription>
              Please complete your employee information to continue. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-1">Error saving form:</p>
                  <p className="text-sm text-red-600">{error}</p>
                  <p className="text-xs text-red-500 mt-2">
                    Please check the browser console (F12) for more details.
                  </p>
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employeeNumber" className="text-sm font-medium text-gray-700">
                      Employee Number
                    </Label>
                    <Input
                      id="employeeNumber"
                      value={(profile as any)?.employee_number || ''}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>

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
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">
                      Date of Birth *
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  Address Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="streetAddr" className="text-sm font-medium text-gray-700">
                    Street Address *
                  </Label>
                  <Input
                    id="streetAddr"
                    value={formData.streetAddr}
                    onChange={(e) => handleInputChange('streetAddr', e.target.value)}
                    placeholder="Enter street address"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="suburb" className="text-sm font-medium text-gray-700">
                      Suburb
                    </Label>
                    <Input
                      id="suburb"
                      value={formData.suburb}
                      onChange={(e) => handleInputChange('suburb', e.target.value)}
                      placeholder="Enter suburb"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                      City *
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Enter city"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                      Postal Code
                    </Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="Enter postal code"
                    />
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
                    />
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Building className="w-5 h-5 mr-2 text-yellow-600" />
                  Employment Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="Enter department"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-red-600" />
                  Emergency Contact
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact" className="text-sm font-medium text-gray-700">
                      Emergency Contact Name
                    </Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="Enter emergency contact name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone" className="text-sm font-medium text-gray-700">
                      Emergency Contact Phone
                    </Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      placeholder="Enter emergency contact phone"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save & Continue'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

