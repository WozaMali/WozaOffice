// Test the API endpoint to ensure user creation is working
// Run this with: node test-api-endpoint.js

const testUserCreation = async () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@wozamali.co.za',
    phone: '+27123456789',
    role: 'admin',
    township: 'Soweto',
    password: 'TestPassword123!'
  };

  try {
    console.log('🧪 Testing user creation API...');
    console.log('Test user data:', testUser);

    const response = await fetch('http://localhost:3000/api/admin/create-user-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const result = await response.json();

    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', result);

    if (result.success) {
      console.log('✅ User creation successful!');
      console.log('👤 User ID:', result.data.user_id);
      console.log('🆔 Employee Number:', result.data.employee_number);
    } else {
      console.log('❌ User creation failed:', result.error);
    }

  } catch (error) {
    console.error('💥 Error testing API:', error.message);
  }
};

// Run the test
testUserCreation();
