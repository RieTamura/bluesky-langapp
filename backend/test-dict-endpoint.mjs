// Test the dictionary endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testDictionaryEndpoint() {
  try {
    console.log('Testing dictionary endpoint...\n');

    // Test the external API first
    console.log('1. Testing external Free Dictionary API...');
    const externalResponse = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/hello');
    console.log('External API status:', externalResponse.status);
    
    if (externalResponse.ok) {
      const externalData = await externalResponse.json();
      console.log('External API working! Sample data:', JSON.stringify(externalData[0], null, 2));
    }

    // Test our endpoint (without auth for now)
    console.log('\n2. Testing our dictionary endpoint...');
    const response = await fetch(`${BASE_URL}/api/words/hello/definition`);
    console.log('Our API status:', response.status);
    
    const data = await response.json();
    console.log('Our API response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Test error:', error);
  }
}

testDictionaryEndpoint();