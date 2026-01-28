'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  School, 
  Home, 
  TreePine, 
  Users,
  BookOpen,
  Shield
} from 'lucide-react';
import DonationForm from '@/components/DonationForm';
import Link from 'next/link';

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Heart className="h-10 w-10 text-red-500" />
            Support Education Through Recycling
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Make a difference in children's lives by donating to the Green Scholar Fund. 
            Your contribution supports schools and child-headed homes across South Africa.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TreePine className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">1. PET Recycling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  When you recycle PET materials, 100% of the value goes to the Green Scholar Fund, 
                  supporting education directly.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">2. Direct Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Make direct monetary donations to specific schools or child-headed homes, 
                  or contribute to the general fund.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">3. Educational Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your contributions fund educational resources, school supplies, 
                  and support for vulnerable children.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Impact Statistics */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600 mb-2">C 0</div>
                <p className="text-gray-600">Raised for Education</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
                <p className="text-gray-600">Schools Supported</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">0</div>
                <p className="text-gray-600">Children Helped</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-orange-600 mb-2">0</div>
                <p className="text-gray-600">PET Bottles Recycled</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Donation Form */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Make a Donation</h2>
          <DonationForm />
        </div>

        {/* Beneficiary Information */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Beneficiaries</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <School className="h-6 w-6 text-blue-600" />
                  Schools We Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  We partner with schools across South Africa to provide educational resources, 
                  school supplies, and infrastructure improvements.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    Primary and secondary schools
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Special needs schools
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Rural and urban schools
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Home className="h-6 w-6 text-green-600" />
                  Child-Headed Homes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  We support child-headed homes by providing essential supplies, 
                  educational support, and care for vulnerable children.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-green-500" />
                    Basic necessities
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-500" />
                    Educational materials
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    Caregiver support
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
            <CardContent className="py-12">
              <h3 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h3>
              <p className="text-xl mb-8 opacity-90">
                Start recycling PET materials or make a direct donation today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/collector">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    <TreePine className="h-5 w-5 mr-2" />
                    Start Recycling
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white text-green-600 hover:bg-gray-100">
                  <Heart className="h-5 w-5 mr-2" />
                  Make Donation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
