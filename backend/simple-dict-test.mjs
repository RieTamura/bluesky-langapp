// Simple test of dictionary API
import fetch from 'node-fetch';

const FREE_DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

async function testDictionaryAPI() {
  try {
    console.log('Testing Free Dictionary API directly...\n');

    const word = 'hello';
    const url = `${FREE_DICTIONARY_API_BASE}/${word}`;
    
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error response:', await response.text());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDictionaryAPI();