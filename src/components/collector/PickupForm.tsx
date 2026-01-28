'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  ratePerKg: number;
  unit: string;
}

interface PickupFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  materials: Array<{
    materialId: string;
    materialName: string;
    kilograms: number;
    photos: string[];
    contaminationPct: number;
  }>;
  notes: string;
  totalKg: number;
  totalValue: number;
}

const SAMPLE_MATERIALS: Material[] = [
  { id: '1', name: 'Plastic Bottles', ratePerKg: 2.50, unit: 'kg' },
  { id: '2', name: 'Cardboard', ratePerKg: 1.80, unit: 'kg' },
  { id: '3', name: 'Glass', ratePerKg: 0.80, unit: 'kg' },
  { id: '4', name: 'Metal Cans', ratePerKg: 3.20, unit: 'kg' },
  { id: '5', name: 'Paper', ratePerKg: 1.50, unit: 'kg' },
];

export default function PickupForm() {
  const [formData, setFormData] = useState<PickupFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    materials: [],
    notes: '',
    totalKg: 0,
    totalValue: 0,
  });

  const [currentMaterial, setCurrentMaterial] = useState({
    materialId: '',
    materialName: '',
    kilograms: 0,
    photos: [] as string[],
    contaminationPct: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof PickupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMaterialChange = (field: keyof typeof currentMaterial, value: string | number) => {
    setCurrentMaterial(prev => ({ ...prev, [field]: value }));
  };

  const addMaterial = () => {
    if (!currentMaterial.materialId || currentMaterial.kilograms <= 0) return;

    const material = SAMPLE_MATERIALS.find(m => m.id === currentMaterial.materialId);
    if (!material) return;

    const newMaterial = {
      ...currentMaterial,
      materialName: material.name,
    };

    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial],
      totalKg: prev.totalKg + newMaterial.kilograms,
      totalValue: prev.totalValue + (newMaterial.kilograms * material.ratePerKg),
    }));

    // Reset current material
    setCurrentMaterial({
      materialId: '',
      materialName: '',
      kilograms: 0,
      photos: [],
      contaminationPct: 0,
    });
  };

  const removeMaterial = (index: number) => {
    const material = formData.materials[index];
    const sampleMaterial = SAMPLE_MATERIALS.find(m => m.name === material.materialName);
    
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
      totalKg: prev.totalKg - material.kilograms,
      totalValue: prev.totalValue - (material.kilograms * (sampleMaterial?.ratePerKg || 0)),
    }));
  };

  const capturePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Convert files to base64 for demo (in production, upload to cloud storage)
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoUrl = e.target?.result as string;
        setCurrentMaterial(prev => ({
          ...prev,
          photos: [...prev.photos, photoUrl],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (photoIndex: number) => {
    setCurrentMaterial(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== photoIndex),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.materials.length === 0) return;

    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmissionStatus('success');
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          address: '',
          materials: [],
          notes: '',
          totalKg: 0,
          totalValue: 0,
        });
        setSubmissionStatus('idle');
      }, 3000);
    } catch (error) {
      setSubmissionStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
                            <Package className="w-6 h-6 text-orange-600" />
            New Pickup Collection
          </CardTitle>
          <CardDescription>
            Capture customer details, materials, weights, and photos for recycling pickup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter customer name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="Enter phone number"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="Enter email address"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Collection Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter collection address"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Material Collection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Materials & Weights</h3>
                <Badge variant="outline" className="text-sm">
                  Total: {formData.totalKg.toFixed(1)} kg
                </Badge>
              </div>

              {/* Add Material Form */}
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Material Type</Label>
                      <Select value={currentMaterial.materialId} onValueChange={(value) => handleMaterialChange('materialId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {SAMPLE_MATERIALS.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} - R{material.ratePerKg}/kg
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <div className="relative">
                        <Scale className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={currentMaterial.kilograms}
                          onChange={(e) => handleMaterialChange('kilograms', parseFloat(e.target.value) || 0)}
                          placeholder="0.0"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Contamination %</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={currentMaterial.contaminationPct}
                        onChange={(e) => handleMaterialChange('contaminationPct', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Button 
                        type="button" 
                        onClick={addMaterial}
                        disabled={!currentMaterial.materialId || currentMaterial.kilograms <= 0}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Photo Capture */}
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-600" />
                      <Label className="text-sm font-medium">Material Photos</Label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={capturePhoto}
                        className="flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                      </Button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      
                      <span className="text-sm text-gray-500">
                        {currentMaterial.photos.length} photos captured
                      </span>
                    </div>

                    {/* Photo Preview */}
                    {currentMaterial.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentMaterial.photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={photo}
                              alt={`Material photo ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                              onClick={() => removePhoto(index)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Materials List */}
              {formData.materials.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Added Materials</h4>
                  {formData.materials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                                                 <Package className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-medium">{material.materialName}</p>
                          <p className="text-sm text-gray-600">
                            {material.kilograms} kg • {material.photos.length} photos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          R{(SAMPLE_MATERIALS.find(m => m.name === material.materialName)?.ratePerKg || 0) * material.kilograms}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMaterial(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Collection Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special instructions or notes about this pickup..."
                rows={3}
              />
            </div>

            {/* Summary */}
                         <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Weight</p>
                    <p className="text-2xl font-bold text-orange-700">{formData.totalKg.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-orange-700">R {formData.totalValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Materials</p>
                    <p className="text-2xl font-bold text-orange-700">{formData.materials.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || formData.materials.length === 0}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Submit Pickup
                  </>
                )}
              </Button>
            </div>

            {/* Submission Status */}
            {submissionStatus === 'success' && (
                             <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                 <CheckCircle className="w-5 h-5 text-orange-600" />
                 <span className="text-orange-800 font-medium">Pickup submitted successfully!</span>
               </div>
            )}

            {submissionStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">Error submitting pickup. Please try again.</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
