// Test script for dictionary API endpoint
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDictionaryAPI() {
  try {
    console.log('Testing dictionary API endpoint...\n');

    // First, let's try to login to get a session
    console.log('1. Attempting to login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'test-user',
        password: 'test-password'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    // Extract session cookie if available
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Session cookies:', cookies);

    // Test dictionary endpoint with a simple word
    console.log('\n2. Testing dictionary endpoint with word "hello"...');
    const dictResponse = await fetch(`${BASE_URL}/api/words/hello/definition`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      }
    });

    const dictData = await dictResponse.json();
    console.log('Dictionary response status:', dictResponse.status);
    console.log('Dictionary response:', JSON.stringify(dictData, null, 2));

    // Test with another word
    console.log('\n3. Testing dictionary endpoint with word "computer"...');
    const dictResponse2 = await fetch(`${BASE_URL}/api/words/computer/definition`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      }
    });

    const dictData2 = await dictResponse2.json();
    console.log('Dictionary response status:', dictResponse2.status);
    console.log('Dictionary response:', JSON.stringify(dictData2, null, 2));

    // Test with invalid word
    console.log('\n4. Testing dictionary endpoint with invalid word "xyzabc123"...');
    const dictResponse3 = await fetch(`${BASE_URL}/api/words/xyzabc123/definition`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      }
    });

    const dictData3 = await dictResponse3.json();
    console.log('Dictionary response status:', dictResponse3.status);
    console.log('Dictionary response:', JSON.stringify(dictData3, null, 2));

  } catch (error) {
    console.error('Test error:', error);
  }
}

testDictionaryAPI();