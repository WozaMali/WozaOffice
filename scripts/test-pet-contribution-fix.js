/**
 * Test script to verify PET contribution processing for Green Scholar Fund
 * This script tests the API endpoint that processes PET bottle contributions
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TEST_COLLECTION_ID = 'test-collection-id'; // Replace with actual collection ID for testing

async function testPetContributionAPI() {
  console.log('🧪 Testing PET Contribution API...');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  
  try {
    // Test the PET contribution API endpoint
    const response = await fetch(`${API_BASE_URL}/api/green-scholar/pet-bottles-contribution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: TEST_COLLECTION_ID })
    });

    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Body:`, JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ PET Contribution API is working correctly');
      if (result.created) {
        console.log(`💰 PET contribution created: R${result.amount}`);
      } else {
        console.log('ℹ️  No PET contribution needed (no PET materials or already processed)');
      }
    } else {
      console.log('❌ PET Contribution API failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing PET Contribution API:', error.message);
  }
}

async function testGreenScholarFundOverview() {
  console.log('\n🧪 Testing Green Scholar Fund Overview...');
  
  try {
    // Test the Green Scholar Fund service
    const response = await fetch(`${API_BASE_URL}/api/green-scholar/fund-overview`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Green Scholar Fund Overview:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Green Scholar Fund Overview failed:', response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error testing Green Scholar Fund Overview:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting PET Contribution Fix Verification...\n');
  
  await testPetContributionAPI();
  await testGreenScholarFundOverview();
  
  console.log('\n✨ Test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Approve a collection with PET materials through the office app');
  console.log('2. Check the Green Scholar Fund page to see if the contribution appears');
  console.log('3. Verify that all PET transactions are now being processed correctly');
}

// Run the test
main().catch(console.error);
