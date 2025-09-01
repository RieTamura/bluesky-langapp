import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testATProtocolEndpoints() {
  console.log('Testing AT Protocol endpoints...\n');

  // Test 1: Get post templates
  try {
    console.log('1. Testing GET /api/atprotocol/posts/templates');
    const response = await fetch(`${BASE_URL}/api/atprotocol/posts/templates`);
    const data = await response.json();
    console.log('✅ Success:', data.success);
    console.log('📝 Templates count:', data.data?.length || 0);
    if (data.data && data.data.length > 0) {
      console.log('📋 First template:', data.data[0].type);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Get AT Protocol integration spec
  try {
    console.log('2. Testing GET /api/atprotocol/integration/spec');
    const response = await fetch(`${BASE_URL}/api/atprotocol/integration/spec`);
    const data = await response.json();
    console.log('✅ Success:', data.success);
    console.log('🔧 Version:', data.data?.version);
    console.log('🎯 Capabilities:', Object.keys(data.data?.capabilities || {}));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Get API integration roadmap
  try {
    console.log('3. Testing GET /api/atprotocol/integration/roadmap');
    const response = await fetch(`${BASE_URL}/api/atprotocol/integration/roadmap`);
    const data = await response.json();
    console.log('✅ Success:', data.success);
    console.log('🗺️ Planned version:', data.data?.version);
    console.log('🚀 Planned endpoints:', data.data?.plannedEndpoints?.length || 0);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Get authentication status
  try {
    console.log('4. Testing GET /api/atprotocol/auth/status');
    const response = await fetch(`${BASE_URL}/api/atprotocol/auth/status`);
    const data = await response.json();
    console.log('✅ Success:', data.success);
    console.log('🔐 Authenticated:', data.data?.isAuthenticated || false);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Get compatibility matrix
  try {
    console.log('5. Testing GET /api/atprotocol/integration/compatibility');
    const response = await fetch(`${BASE_URL}/api/atprotocol/integration/compatibility`);
    const data = await response.json();
    console.log('✅ Success:', data.success);
    console.log('🔄 Supported formats:', data.data?.formats?.length || 0);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 AT Protocol endpoint testing complete!');
}

// Run the tests
testATProtocolEndpoints().catch(console.error);