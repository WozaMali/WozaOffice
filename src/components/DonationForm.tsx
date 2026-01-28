'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Heart, 
  School, 
  Home, 
  MessageCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

interface School {
  id: string;
  name: string;
  school_code: string;
  city: string;
  province: string;
  student_count: number;
}

interface ChildHome {
  id: string;
  name: string;
  home_code: string;
  city: string;
  province: string;
  children_count: number;
}

interface DonationFormData {
  amount: string;
  beneficiaryType: 'school' | 'child_home' | 'general_fund';
  beneficiaryId: string;
  donorMessage: string;
  isAnonymous: boolean;
}

export default function DonationForm() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<DonationFormData>({
    amount: '',
    beneficiaryType: 'general_fund',
    beneficiaryId: '',
    donorMessage: '',
    isAnonymous: false
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [childHomes, setChildHomes] = useState<ChildHome[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    try {
      setLoading(true);
      
      // Load schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('school_name');

      if (schoolsError) throw schoolsError;

      // Load child-headed homes
      const { data: childHomesData, error: childHomesError } = await supabase
        .from('child_headed_homes')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (childHomesError) throw childHomesError;

      setSchools(schoolsData || []);
      setChildHomes(childHomesData || []);
    } catch (err) {
      console.error('Error loading beneficiaries:', err);
      setError('Failed to load beneficiary information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DonationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset beneficiary ID when type changes
    if (field === 'beneficiaryType') {
      setFormData(prev => ({
        ...prev,
        beneficiaryId: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please log in to make a donation');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid donation amount');
      return;
    }

    if (formData.beneficiaryType !== 'general_fund' && !formData.beneficiaryId) {
      setError('Please select a beneficiary');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create the donation
      const { data, error: donationError } = await supabase
        .rpc('create_direct_donation', {
          p_user_id: user.id,
          p_amount: parseFloat(formData.amount),
          p_beneficiary_type: formData.beneficiaryType,
          p_beneficiary_id: formData.beneficiaryType === 'general_fund' ? null : formData.beneficiaryId,
          p_donor_message: formData.donorMessage || null,
          p_is_anonymous: formData.isAnonymous
        });

      if (donationError) throw donationError;

      setSuccess(true);
      setFormData({
        amount: '',
        beneficiaryType: 'general_fund',
        beneficiaryId: '',
        donorMessage: '',
        isAnonymous: false
      });

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      console.error('Error creating donation:', err);
      setError('Failed to process donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBeneficiaryOptions = () => {
    if (formData.beneficiaryType === 'school') {
      return schools.map(school => (
        <SelectItem key={school.id} value={school.id}>
          {school.name} - {school.city}, {school.province} ({school.student_count} students)
        </SelectItem>
      ));
    } else if (formData.beneficiaryType === 'child_home') {
      return childHomes.map(home => (
        <SelectItem key={home.id} value={home.id}>
          {home.name} - {home.city}, {home.province} ({home.children_count} children)
        </SelectItem>
      ));
    }
    return [];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Heart className="h-6 w-6 text-red-500" />
          Make a Donation to Green Scholar Fund
        </CardTitle>
        <p className="text-gray-600">
          Support education by donating to schools or child-headed homes
        </p>
      </CardHeader>
      <CardContent>
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">
              Thank you! Your donation has been processed successfully.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Donation Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-base font-medium">
              Donation Amount (C)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className="text-lg"
              required
            />
          </div>

          {/* Beneficiary Type */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Where would you like your donation to go?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                type="button"
                variant={formData.beneficiaryType === 'general_fund' ? 'default' : 'outline'}
                onClick={() => handleInputChange('beneficiaryType', 'general_fund')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                
                <span>General Fund</span>
                <span className="text-xs text-gray-500">It matters not</span>
              </Button>
              
              <Button
                type="button"
                variant={formData.beneficiaryType === 'school' ? 'default' : 'outline'}
                onClick={() => handleInputChange('beneficiaryType', 'school')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <School className="h-6 w-6" />
                <span>Specific School</span>
                <span className="text-xs text-gray-500">Choose a school</span>
              </Button>
              
              <Button
                type="button"
                variant={formData.beneficiaryType === 'child_home' ? 'default' : 'outline'}
                onClick={() => handleInputChange('beneficiaryType', 'child_home')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Home className="h-6 w-6" />
                <span>Child-Headed Home</span>
                <span className="text-xs text-gray-500">Support children</span>
              </Button>
            </div>
          </div>

          {/* Beneficiary Selection */}
          {formData.beneficiaryType !== 'general_fund' && (
            <div className="space-y-2">
              <Label htmlFor="beneficiary" className="text-base font-medium">
                Select {formData.beneficiaryType === 'school' ? 'School' : 'Child-Headed Home'}
              </Label>
              <Select
                value={formData.beneficiaryId}
                onValueChange={(value) => handleInputChange('beneficiaryId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Choose a ${formData.beneficiaryType === 'school' ? 'school' : 'child-headed home'}`} />
                </SelectTrigger>
                <SelectContent>
                  {getBeneficiaryOptions()}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Donor Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-base font-medium">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Leave a message for the beneficiaries..."
              value={formData.donorMessage}
              onChange={(e) => handleInputChange('donorMessage', e.target.value)}
              rows={3}
            />
          </div>

          {/* Anonymous Donation */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={formData.isAnonymous}
              onCheckedChange={(checked) => handleInputChange('isAnonymous', checked)}
            />
            <Label htmlFor="anonymous" className="text-sm">
              Make this donation anonymous
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Donation...
              </>
            ) : (
              <>
                <Heart className="h-5 w-5 mr-2" />
                Donate C {formData.amount || '0'}
              </>
            )}
          </Button>
        </form>

        {/* Information */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">About Green Scholar Fund</h4>
          <p className="text-sm text-blue-800">
            The Green Scholar Fund supports education through PET material donations and direct contributions. 
            Your donation helps provide educational resources to schools and support for child-headed homes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
