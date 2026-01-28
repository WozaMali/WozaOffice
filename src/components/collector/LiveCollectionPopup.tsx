'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, 
  Package, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Scale, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  X,
  Loader2
} from 'lucide-react';
import { searchCustomersByAddress, searchCustomersComprehensive, CustomerSearchResult } from '../../lib/customer-services';
import { submitLiveCollection, CollectionMaterial } from '../../lib/collection-services';
import { getMaterialId } from '../../lib/material-services';
import { supabase } from '@/lib/supabase';
import { addressIntegrationService, ProfileWithAddress } from '../../lib/address-integration';

// Helper function to get role ID
async function getRoleId(roleName: string): Promise<string> {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single()
  
  if (error) throw error
  return data.id
}

interface Material {
  id: string;
  name: string;
  kilograms: number;
  contamination_pct: number;
  rate_per_kg: number;
  isDonation?: boolean;
  material_id?: string; // Database material ID
  notes?: string; // Add missing notes property
  category?: string;
}

interface LiveCollectionData {
  address: string;
  customerName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: LiveCollectionData;
}

export default function LiveCollectionPopup({ isOpen, onClose, initialData }: Props) {
  const [formData, setFormData] = useState({
    customerName: initialData?.customerName || '',
    address: initialData?.address || '',
    notes: ''
  });

  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [scalePhoto, setScalePhoto] = useState<string | null>(null);
  const [recyclablesPhoto, setRecyclablesPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);

  // Fetch materials from database
  const fetchMaterials = async () => {
    console.log('🔍 Starting to fetch materials...');
    setIsLoadingMaterials(true);
    try {
      console.log('🔍 Testing Supabase connection...');
      // Test basic connection first
      const { data: testData, error: testError } = await supabase
        .from('materials')
        .select('count')
        .limit(1);
      
      console.log('🔍 Supabase test result:', { testData, testError });
      
      console.log('🔍 Querying materials table...');
      const { data, error } = await supabase
        .from('materials')
        .select(`
          id,
          name,
          current_price_per_unit,
          unit,
          materials(name)
        `)
        .eq('active', true)
        .order('materials(name)', { ascending: true })
        .order('name', { ascending: true });

      console.log('🔍 Materials query result:', { data, error });

      if (error) {
        console.error('❌ Error fetching materials with join:', error);
        console.log('🔄 Trying simple query without join...');
        
        // Try a simpler query without the join
        const { data: simpleData, error: simpleError } = await supabase
          .from('materials')
          .select('id, name, current_price_per_unit, unit, category_id')
          .eq('active', true)
          .order('name', { ascending: true });
        
        console.log('🔍 Simple query result:', { simpleData, simpleError });
        
        if (simpleError) {
          console.error('❌ Simple query also failed:', simpleError);
          // Fallback to sample materials if both queries fail
          const fallbackMaterials = [
            { id: '1', name: 'Aluminum Cans', rate_per_kg: 18.55, isDonation: false, category: 'Metals', kilograms: 0, contamination_pct: 0 },
            { id: '2', name: 'PET Bottles', rate_per_kg: 1.50, isDonation: true, category: 'Plastics', kilograms: 0, contamination_pct: 0 },
            { id: '3', name: 'Clear Glass', rate_per_kg: 2.00, isDonation: false, category: 'Glass', kilograms: 0, contamination_pct: 0 },
            { id: '4', name: 'White Paper', rate_per_kg: 1.20, isDonation: false, category: 'Paper', kilograms: 0, contamination_pct: 0 },
            { id: '5', name: 'Cardboard', rate_per_kg: 1.00, isDonation: false, category: 'Paper', kilograms: 0, contamination_pct: 0 },
          ];
          console.log('🔄 Using fallback materials:', fallbackMaterials);
          setAvailableMaterials(fallbackMaterials);
        } else {
          console.log('✅ Simple query succeeded, mapping materials...');
          const mappedMaterials = simpleData.map(material => ({
            id: material.id,
            name: material.name,
            rate_per_kg: material.current_price_per_unit,
            isDonation: material.current_price_per_unit < 2.0,
            category: 'Unknown', // We'll get category later if needed
            kilograms: 0,
            contamination_pct: 0
          }));
          console.log('✅ Mapped materials from simple query:', mappedMaterials);
          setAvailableMaterials(mappedMaterials);
        }
      } else {
        console.log('✅ Successfully fetched materials from database:', data);
        const mappedMaterials = data.map((material: any) => ({
          id: material.id,
          name: material.name,
          rate_per_kg: material.current_price_per_unit,
          isDonation: material.current_price_per_unit < 2.0,
          category: (Array.isArray(material.materials) ? material.materials[0]?.name : (material.materials as any)?.name) ?? 'Unknown',
          kilograms: 0,
          contamination_pct: 0
        }));
        console.log('✅ Mapped materials:', mappedMaterials);
        setAvailableMaterials(mappedMaterials);
      }
    } catch (error) {
      console.error('❌ Error fetching materials:', error);
      // Fallback to sample materials
      const fallbackMaterials = [
        { id: '1', name: 'Aluminum Cans', rate_per_kg: 18.55, isDonation: false, category: 'Metals', kilograms: 0, contamination_pct: 0 },
        { id: '2', name: 'PET Bottles', rate_per_kg: 1.50, isDonation: true, category: 'Plastics', kilograms: 0, contamination_pct: 0 },
        { id: '3', name: 'Clear Glass', rate_per_kg: 2.00, isDonation: false, category: 'Glass', kilograms: 0, contamination_pct: 0 },
        { id: '4', name: 'White Paper', rate_per_kg: 1.20, isDonation: false, category: 'Paper', kilograms: 0, contamination_pct: 0 },
        { id: '5', name: 'Cardboard', rate_per_kg: 1.00, isDonation: false, category: 'Paper', kilograms: 0, contamination_pct: 0 },
      ];
      console.log('🔄 Using fallback materials due to error:', fallbackMaterials);
      setAvailableMaterials(fallbackMaterials);
    } finally {
      setIsLoadingMaterials(false);
      console.log('🔍 Finished fetching materials, loading state set to false');
    }
  };

  // Clear search results when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([]);
      setSearchError(null);
      setSelectedCustomer(null);
    }
  }, [isOpen]);

  // Fetch materials when popup opens
  useEffect(() => {
    console.log('🔍 useEffect triggered:', { isOpen, availableMaterialsLength: availableMaterials.length });
    if (isOpen && availableMaterials.length === 0) {
      console.log('🔍 Fetching materials because popup is open and no materials loaded');
      fetchMaterials();
    }
  }, [isOpen, availableMaterials.length]);

  // Debug: Log availableMaterials whenever it changes
  useEffect(() => {
    console.log('🔍 availableMaterials changed:', availableMaterials);
  }, [availableMaterials]);

  const searchCustomersByAddressHandler = async () => {
    if (!formData.address.trim()) {
      setSearchError('Please enter an address to search');
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);
      console.log('🔍 Searching for customers at address:', formData.address);
      
      // Use the same data source as Customer page
      const allCustomers = await addressIntegrationService.getCustomerProfilesWithAddresses();
      
      // Filter customers by address (case-insensitive partial match)
      const searchTerm = formData.address.toLowerCase();
      const results = allCustomers
        .filter(customer => {
          const addressMatch = customer.displayAddress.toLowerCase().includes(searchTerm) ||
                              customer.displayCity.toLowerCase().includes(searchTerm);
          return addressMatch;
        })
        .map(customer => ({
          id: customer.id,
          profile_id: customer.id,
          full_name: customer.displayName,
          phone: customer.phone || '',
          email: customer.email,
          address: customer.displayAddress,
          suburb: customer.primaryAddress?.address_line2 || '',
          city: customer.primaryAddress?.city || '',
          postal_code: customer.primaryAddress?.postal_code
        }));
      
      setSearchResults(results);
      
      if (results.length === 0) {
        setSearchError('No customers found at this address');
      } else {
        console.log(`✅ Found ${results.length} customers at address`);
      }
    } catch (error: any) {
      console.error('❌ Error searching customers:', error);
      setSearchError(error.message || 'Failed to search customers');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerName: customer.full_name
    }));
    setSearchResults([]);
    setSearchError(null);
    console.log('✅ Customer selected:', customer.full_name);
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      name: '',
      kilograms: 0,
      contamination_pct: 0,
      rate_per_kg: 0
    };
    setMaterials([...materials, newMaterial]);
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const calculateTotals = () => {
    let totalValue = 0;
    let donationValue = 0;

    materials.forEach(material => {
      const materialInfo = availableMaterials.find(m => m.name === material.name);
      if (materialInfo) {
        const value = material.kilograms * materialInfo.rate_per_kg;
        if (materialInfo.isDonation) {
          donationValue += value;
        } else {
          totalValue += value;
        }
      }
    });

    return { totalValue, donationValue };
  };

  const capturePhoto = (type: 'scale' | 'recyclables') => {
    // Simulate photo capture - in real app, this would use camera API
    const photoUrl = `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="150" fill="#f3f4f6"/>
        <text x="100" y="75" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">
          ${type === 'scale' ? 'Scale Photo' : 'Recyclables Photo'}
        </text>
        <text x="100" y="95" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="12">
          Captured at ${new Date().toLocaleTimeString()}
        </text>
      </svg>
    `)}`;

    if (type === 'scale') {
      setScalePhoto(photoUrl);
    } else {
      setRecyclablesPhoto(photoUrl);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer first');
      return;
    }

    if (materials.length === 0) {
      alert('Please add at least one material');
      return;
    }

    setIsSubmitting(true);
    
    let progressInterval: NodeJS.Timeout | undefined;
    try {
      console.log('🚀 Submitting live collection to database...');
      
      // Show progress indicator
      progressInterval = setInterval(() => {
        console.log('⏳ Collection submission in progress...');
      }, 2000);

      // Get current user (collector) ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Collector not authenticated. Please log in again.');
      }

      // Prepare materials with database IDs
      const collectionMaterials: CollectionMaterial[] = [];
      for (const material of materials) {
        if (material.name && material.kilograms > 0) {
          const materialId = await getMaterialId(material.name);
          if (!materialId) {
            throw new Error(`Material "${material.name}" not found in database. Please contact admin.`);
          }

          collectionMaterials.push({
            material_id: materialId,
            kilograms: material.kilograms,
            contamination_pct: material.contamination_pct,
            notes: material.notes || undefined
          });
        }
      }

      if (collectionMaterials.length === 0) {
        throw new Error('No valid materials to submit. Please check material names and weights.');
      }

      // Get the address ID from the selected customer's primary address
      const customerData = await addressIntegrationService.getCustomerProfilesWithAddresses();
      const customer = customerData.find((c: any) => c.id === selectedCustomer.profile_id);
      const addressId = customer?.primaryAddress?.id;

      if (!addressId) {
        throw new Error('No address found for selected customer. Please ensure the customer has a registered address.');
      }

      // Clear progress indicator
      // Clear progress indicator on error (guarded)
      try { clearInterval((globalThis as any).progressInterval as any); } catch {}
      
      // Submit the collection with timeout handling
      const result = await submitLiveCollection({
        customer_id: selectedCustomer.profile_id,
        address_id: addressId,
        materials: collectionMaterials,
        notes: formData.notes,
        scale_photo: scalePhoto || undefined,
        recyclables_photo: recyclablesPhoto || undefined
      }, user.id);

      // Show success message with details
      const successMessage = `🎉 Collection submitted successfully!
      
📊 Collection Summary:
• Total Weight: ${result.total_kg}kg
• Total Value: C${result.total_value.toFixed(2)}
• Points Earned: ${result.points_earned}
• CO2 Saved: ${result.environmental_impact.co2_saved}kg
• Water Saved: ${result.environmental_impact.water_saved}L
• Trees Equivalent: ${result.environmental_impact.trees_equivalent}

💰 Fund Allocation:
• Green Scholar Fund: C${result.fund_allocation.green_scholar_fund.toFixed(2)}
  - PET/Plastic: 100% to Green Scholar Fund
  - Other materials: 70% to Green Scholar Fund
• Customer Wallet: C${result.fund_allocation.user_wallet.toFixed(2)}
  - Aluminium: 100% to Customer Wallet
  - Other materials: 30% to Customer Wallet

🌱 Environmental Impact:
• CO2 emissions reduced by ${result.environmental_impact.co2_saved}kg
• Water consumption reduced by ${result.environmental_impact.water_saved}L
• Equivalent to planting ${result.environmental_impact.trees_equivalent} trees!`;

      console.log('🔄 Resetting form state and closing popup...');
      
      // Reset form state first
      setFormData({
        customerName: '',
        address: '',
        notes: ''
      });
      setMaterials([]);
      setSelectedCustomer(null);
      setSearchResults([]);
      setSearchError(null);
      setScalePhoto(null);
      setRecyclablesPhoto(null);
      
      // Close the popup immediately
      console.log('🔄 Calling onClose()...');
      onClose();
      
      // Add additional close attempts with delays
      setTimeout(() => {
        console.log('🔄 Second close attempt...');
        onClose();
      }, 200);
      
      setTimeout(() => {
        console.log('🔄 Third close attempt...');
        onClose();
      }, 500);
      
      // Show success message after popup is closed
      setTimeout(() => {
        console.log('✅ Collection submitted successfully!');
        console.log('📊 Collection Summary:', {
          total_kg: result.total_kg,
          total_value: result.total_value,
          points_earned: result.points_earned,
          environmental_impact: result.environmental_impact,
          fund_allocation: result.fund_allocation
        });
      }, 100);
    } catch (error: any) {
      console.error('❌ Error submitting collection:', error);
      
      // Clear progress indicator on error (guarded)
      if (progressInterval) {
        try { clearInterval(progressInterval); } catch {}
      }
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to submit collection. ';
      
      if (error.message.includes('timed out')) {
        errorMessage += 'The operation took too long. Please check your internet connection and try again.';
      } else if (error.message.includes('network')) {
        errorMessage += 'Network error occurred. Please check your internet connection and try again.';
      } else if (error.message.includes('constraint') || error.message.includes('foreign key')) {
        errorMessage += 'Database error occurred. Please contact support if this persists.';
      } else {
        errorMessage += error.message || 'Unknown error occurred. Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const { totalValue, donationValue } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Live Collection</h2>
              <p className="text-gray-400">Record a new collection in real-time</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customer & Address */}
            <div className="space-y-6">
              {/* Customer Search */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Search className="w-5 h-5 text-orange-500" />
                    Find Customer by Address
                  </CardTitle>
                  <CardDescription className="text-gray-400">Search for existing customers at this address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address" className="text-gray-300">Address</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="address"
                        placeholder="Enter address to search"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                      />
                      <Button 
                        onClick={searchCustomersByAddressHandler}
                        disabled={isSearching}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Show All Customers Button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white mt-2 text-xs"
                      onClick={async () => {
                        try {
                          setIsSearching(true);
                          setSearchError(null);
                          console.log('🔍 Loading all customers...');
                          
                          // Use comprehensive search with empty term to get all customers
                          const results = await searchCustomersComprehensive('');
                          setSearchResults(results);
                          
                          if (results.length === 0) {
                            setSearchError('No customers found in the system');
                          } else {
                            console.log(`✅ Loaded ${results.length} customers`);
                          }
                        } catch (error: any) {
                          console.error('❌ Error loading all customers:', error);
                          setSearchError(error.message || 'Failed to load customers');
                          setSearchResults([]);
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                    >
                      Show All Customers
                    </Button>
                    
                    {/* Debug button to check database state */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white mt-2 text-xs ml-2"
                      onClick={async () => {
                        try {
                          console.log('🔍 Debug: Checking database state...');
                          
                          // Check if we can access users table (unified approach)
                          const { data: profiles, error: profilesError } = await supabase
                            .from('users')
                            .select('id, first_name, last_name, role_id, is_active')
                            .eq('role_id', (await getRoleId('customer')))
                            .eq('is_active', true)
                            .limit(5);
                          
                          console.log('🔍 Profiles check:', { data: profiles, error: profilesError });
                          
                          // Check if we can access addresses table
                          const { data: addresses, error: addressesError } = await supabase
                            .from('addresses')
                            .select('id, profile_id, line1, suburb, city')
                            .limit(5);
                          
                          console.log('🔍 Addresses check:', { data: addresses, error: addressesError });
                          
                          // Check the relationship
                          if (profiles && addresses && profiles.length > 0 && addresses.length > 0) {
                            const { data: testJoin, error: joinError } = await supabase
                              .from('addresses')
                              .select(`
                                id,
                                profile_id,
                                line1,
                                suburb,
                                city,
                                profiles!inner(id, full_name)
                              `)
                              .limit(1);
                            
                            console.log('🔍 Join test:', { data: testJoin, error: joinError });
                          }
                          
                          alert('Check console for database debug info');
                        } catch (error) {
                          console.error('❌ Debug error:', error);
                          alert('Debug failed - check console');
                        }
                      }}
                    >
                      Debug DB State
                    </Button>
                  </div>

                  {/* Search Results */}
                  {searchError && (
                    <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                      <p className="text-red-400 text-sm">{searchError}</p>
                    </div>
                  )}

                  {/* Loading State */}
                  {isSearching && (
                    <div className="p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        <p className="text-blue-400 text-sm">Searching for customers...</p>
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {!isSearching && searchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-300">Found Customers:</p>
                      {searchResults.map((customer) => (
                        <div 
                          key={customer.id}
                          className="p-3 border border-gray-600 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                          onClick={() => selectCustomer(customer)}
                        >
                          <p className="font-medium text-white">{customer.full_name}</p>
                          <p className="text-sm text-gray-400">{customer.address}</p>
                          {customer.phone && (
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Results Message */}
                  {!isSearching && searchResults.length === 0 && !searchError && formData.address.trim() && (
                    <div className="p-3 bg-gray-600/20 border border-gray-500/50 rounded-lg">
                      <p className="text-gray-400 text-sm">No customers found. Try searching with a different term or click "Show All Customers".</p>
                    </div>
                  )}

                  {/* Selected Customer */}
                  {selectedCustomer && (
                    <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <p className="font-medium text-green-400">Customer Selected</p>
                      </div>
                      <p className="text-green-300">{selectedCustomer.full_name}</p>
                      <p className="text-sm text-green-400">{selectedCustomer.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manual Customer Entry */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white">Customer Details</CardTitle>
                  <CardDescription className="text-gray-400">Enter customer information manually</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customerName" className="text-gray-300">Customer Name</Label>
                    <Input
                      id="customerName"
                      placeholder="Enter customer name"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-gray-300">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional notes about this collection"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-orange-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Materials & Photos */}
            <div className="space-y-6">
              {/* Materials */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Package className="w-5 h-5 text-orange-500" />
                    Materials Collected
                  </CardTitle>
                  <CardDescription className="text-gray-400">Add materials and their weights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Debug info */}
                  <div className="text-xs text-gray-400 mb-2">
                    Available materials: {availableMaterials.length} | Loading: {isLoadingMaterials ? 'Yes' : 'No'}
                  </div>
                  {materials.map((material, index) => (
                    <div key={material.id} className="grid grid-cols-4 gap-2 items-end">
                      <div>
                        <Label className="text-gray-300">Material</Label>
                        <select
                          value={material.name}
                          onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                          className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                          disabled={isLoadingMaterials}
                        >
                          <option value="">{isLoadingMaterials ? 'Loading materials...' : 'Select material'}</option>
                          {availableMaterials.length > 0 ? (
                            availableMaterials.map(m => (
                              <option key={m.id} value={m.name}>
                                {m.name} - C{m.rate_per_kg}/kg
                                {m.isDonation ? ' (Donation)' : ''}
                                {m.category ? ` [${m.category}]` : ''}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No materials available</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <Label className="text-gray-300">Kg</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={material.kilograms}
                          onChange={(e) => updateMaterial(material.id, 'kilograms', parseFloat(e.target.value) || 0)}
                          className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Contamination %</Label>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          value={material.contamination_pct}
                          onChange={(e) => updateMaterial(material.id, 'contamination_pct', parseInt(e.target.value) || 0)}
                          className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-orange-500"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMaterial(material.id)}
                        className="text-red-400 hover:text-red-300 border-red-500 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button onClick={addMaterial} variant="outline" className="w-full border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material
                  </Button>
                </CardContent>
              </Card>

              {/* Photos */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Camera className="w-5 h-5 text-orange-500" />
                    Photo Documentation
                  </CardTitle>
                  <CardDescription className="text-gray-400">Capture photos of the scale and recyclables</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Photo of Scale</Label>
                      <div className="mt-1">
                        {scalePhoto ? (
                          <div className="relative">
                            <img src={scalePhoto} alt="Scale" className="w-full h-32 object-cover rounded-lg" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setScalePhoto(null)}
                              className="absolute top-2 right-2 bg-gray-700 border-gray-500 text-white hover:bg-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => capturePhoto('scale')}
                            variant="outline"
                            className="w-full h-32 border-dashed border-2 border-gray-500 hover:border-gray-400 bg-gray-600/20"
                          >
                            <Camera className="w-8 h-8 text-gray-400" />
                            <span className="block mt-2 text-sm text-gray-400">Capture Scale Photo</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-300">Photo of Recyclables</Label>
                      <div className="mt-1">
                        {recyclablesPhoto ? (
                          <div className="relative">
                            <img src={recyclablesPhoto} alt="Recyclables" className="w-full h-32 object-cover rounded-lg" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRecyclablesPhoto(null)}
                              className="absolute top-2 right-2 bg-gray-700 border-gray-500 text-white hover:bg-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => capturePhoto('recyclables')}
                            variant="outline"
                            className="w-full h-32 border-dashed border-2 border-gray-500 hover:border-gray-400 bg-gray-600/20"
                          >
                            <Camera className="w-8 h-8 text-gray-400" />
                            <span className="block mt-2 text-sm text-gray-400">Capture Recyclables Photo</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white">Collection Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{materials.length}</p>
                      <p className="text-sm text-gray-400">Materials</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-400">
                        {materials.reduce((sum, m) => sum + m.kilograms, 0).toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-400">Total Kg</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-400">C {totalValue.toFixed(2)}</p>
                      <p className="text-sm text-gray-400">Customer Value</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">C {donationValue.toFixed(2)}</p>
                      <p className="text-sm text-gray-400">Donation Value</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-orange-900/20 border border-orange-500/50 rounded-lg">
                    <p className="text-sm text-orange-300">
                      <strong>Fund Allocation:</strong><br/>
                      • Aluminum (C18.55/kg): 100% to Customer Wallet<br/>
                      • PET/Plastic (C1.50/kg): 100% to Green Scholar Fund<br/>
                      • Other materials: 70% Green Scholar Fund, 30% Customer Wallet
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-600">
            <Button variant="outline" onClick={onClose} className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedCustomer || materials.length === 0 || isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Submit Collection
            </Button>
          </div>
          
          {/* Note about submission requirements */}
          <div className="mt-4 p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
            <p className="text-sm text-green-300">
              <strong>Ready to Submit:</strong> You can submit a collection once you've selected a customer and added at least one material. 
              Photos are optional and not required for submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

