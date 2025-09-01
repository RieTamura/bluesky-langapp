// Direct test of dictionary service
import DictionaryService from './src/services/dictionaryService.js';

async function testDictionaryService() {
  try {
    console.log('Testing DictionaryService directly...\n');

    // Test with a simple word
    console.log('1. Testing with word "hello"...');
    const result1 = await DictionaryService.getDefinition('hello');
    console.log('Result:', JSON.stringify(result1, null, 2));

    // Test with another word
    console.log('\n2. Testing with word "computer"...');
    const result2 = await DictionaryService.getDefinition('computer');
    console.log('Result:', JSON.stringify(result2, null, 2));

    // Test with invalid word
    console.log('\n3. Testing with invalid word "xyzabc123"...');
    const result3 = await DictionaryService.getDefinition('xyzabc123');
    console.log('Result:', result3);

    // Test service availability
    console.log('\n4. Testing service availability...');
    const isAvailable = await DictionaryService.isServiceAvailable();
    console.log('Service available:', isAvailable);

  } catch (error) {
    console.error('Test error:', error);
  }
}

testDictionaryService();