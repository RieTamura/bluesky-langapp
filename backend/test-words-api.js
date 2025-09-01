// Simple test script to verify the words API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Mock session token (in a real test, you'd get this from login)
const MOCK_SESSION_TOKEN = 'test_session_token';

async function testWordsAPI() {
  console.log('🧪 Testing Words API endpoints...\n');

  try {
    // Test 1: Get all words (should fail without auth)
    console.log('1. Testing GET /api/words without authentication...');
    try {
      await axios.get(`${BASE_URL}/words`);
      console.log('❌ Should have failed without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 2: Get all words with mock auth
    console.log('\n2. Testing GET /api/words with mock authentication...');
    try {
      const response = await axios.get(`${BASE_URL}/words`, {
        headers: {
          'Authorization': `Bearer ${MOCK_SESSION_TOKEN}`
        }
      });
      console.log('✅ GET /api/words successful');
      console.log(`   Found ${response.data.data.length} words`);
      console.log(`   Sample response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ GET /api/words failed:', error.response?.data || error.message);
    }

    // Test 3: Create a new word
    console.log('\n3. Testing POST /api/words...');
    try {
      const newWord = {
        word: 'test-word-' + Date.now(),
        status: 'unknown',
        definition: 'A test word for API testing'
      };
      
      const response = await axios.post(`${BASE_URL}/words`, newWord, {
        headers: {
          'Authorization': `Bearer ${MOCK_SESSION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ POST /api/words successful');
      console.log(`   Created word:`, response.data.data);
      
      // Test 4: Update the word
      const wordId = response.data.data.id;
      console.log('\n4. Testing PUT /api/words/:id...');
      
      const updateResponse = await axios.put(`${BASE_URL}/words/${wordId}`, {
        status: 'learning'
      }, {
        headers: {
          'Authorization': `Bearer ${MOCK_SESSION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ PUT /api/words/:id successful');
      console.log(`   Updated word status to:`, updateResponse.data.data.status);
      
    } catch (error) {
      console.log('❌ Word creation/update failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Words API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWordsAPI();