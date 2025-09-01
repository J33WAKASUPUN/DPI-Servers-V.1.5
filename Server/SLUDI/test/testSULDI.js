const axios = require('axios');

const SLUDI_BASE_URL = 'http://localhost:3001/api/sludi';
const CLIENT_ID = 'IIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjgnJh';
const REDIRECT_URI = 'http://localhost:3001/callback';

async function testSludiCompetition() {
  console.log('🎯 SLUDI Competition Testing Started...\n');
  console.log('📅 Test Date:', new Date().toISOString());
  console.log('👤 Testing User: J33WAKASUPUN\n');

  try {
    // Test 1: Health check first
    console.log('0️⃣ Testing SLUDI Health...');
    try {
      const healthResponse = await axios.get(`${SLUDI_BASE_URL}/health`);
      console.log('✅ SLUDI Health Check:', healthResponse.data.success ? 'HEALTHY' : 'ISSUES');
      console.log('🏛️ Service:', healthResponse.data.service);
      console.log('🎯 Competition:', healthResponse.data.competition);
    } catch (healthError) {
      console.log('❌ Health check failed - Server might not be running');
      console.log('💡 Make sure to run: npm start');
      return;
    }

    // Test 2: Discovery endpoint
    console.log('\n1️⃣ Testing Discovery Endpoint...');
    const discoveryResponse = await axios.get(`${SLUDI_BASE_URL}/.well-known/openid_configuration`);
    console.log('✅ Discovery successful');
    console.log('📋 Supported scopes:', discoveryResponse.data.scopes_supported);
    console.log('🔗 Issuer:', discoveryResponse.data.issuer);

    // Test 3: JWKS endpoint
    console.log('\n2️⃣ Testing JWKS Endpoint...');
    const jwksResponse = await axios.get(`${SLUDI_BASE_URL}/jwks`);
    console.log('✅ JWKS successful');
    console.log('🔑 Keys available:', jwksResponse.data.keys.length);
    console.log('🆔 Key ID:', jwksResponse.data.keys[0]?.kid);

    // Test 4: Authorization endpoint (simplified for testing)
    console.log('\n3️⃣ Testing Authorization Endpoint...');
    const authParams = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile',
      state: 'test-state-123'
    });

    try {
      const authResponse = await axios.get(`${SLUDI_BASE_URL}/authorize?${authParams}`);
      console.log('✅ Authorization successful');
      console.log('🎫 Authorization code:', authResponse.data.authorization_code);
      
      const authCode = authResponse.data.authorization_code;

      // Test 5: Token endpoint
      console.log('\n4️⃣ Testing Token Endpoint...');
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI
      });

      const tokenResponse = await axios.post(`${SLUDI_BASE_URL}/token`, tokenData, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      console.log('✅ Token exchange successful');
      console.log('🎟️ Access token:', tokenResponse.data.access_token.substring(0, 30) + '...');
      console.log('🆔 ID token present:', !!tokenResponse.data.id_token);
      console.log('⏰ Expires in:', tokenResponse.data.expires_in, 'seconds');
      
      const accessToken = tokenResponse.data.access_token;

      // Test 6: UserInfo endpoint
      console.log('\n5️⃣ Testing UserInfo Endpoint...');
      const userInfoResponse = await axios.get(`${SLUDI_BASE_URL}/userinfo`, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('✅ UserInfo successful');
      console.log('👤 Citizen data received:');
      console.log('   🆔 Subject:', userInfoResponse.data.sub);
      console.log('   👤 Name:', userInfoResponse.data.name);
      console.log('   📧 Email:', userInfoResponse.data.email);
      console.log('   🏛️ Competition:', userInfoResponse.data.competition);

      // Competition Summary
      console.log('\n🏆 SLUDI COMPETITION TEST RESULTS:');
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ Health Check: PASSED');
      console.log('✅ Discovery Endpoint: PASSED');
      console.log('✅ JWKS Endpoint: PASSED'); 
      console.log('✅ Authorization Flow: PASSED');
      console.log('✅ Token Exchange: PASSED');
      console.log('✅ User Info Retrieval: PASSED');
      console.log('═══════════════════════════════════════════════════');
      console.log('🎯 CLIENT ID:', CLIENT_ID);
      console.log('🔗 SLUDI BASE URL:', SLUDI_BASE_URL);
      console.log('📅 Test Completed:', new Date().toISOString());
      console.log('👤 Tester: J33WAKASUPUN');
      console.log('═══════════════════════════════════════════════════');

    } catch (authError) {
      console.log('❌ Authorization failed:', authError.response?.data || authError.message);
      console.log('💡 Make sure admin user exists in database');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Check if MongoDB is connected');
    console.log('3. Verify admin user exists: admin@sludi.gov.lk');
    console.log('4. Check server logs for detailed errors');
  }
}

// Add a simple endpoint test function
async function testEndpointsOnly() {
  console.log('🔍 Quick Endpoint Availability Test...\n');
  
  const endpoints = [
    { name: 'Health', url: `${SLUDI_BASE_URL}/health` },
    { name: 'Discovery', url: `${SLUDI_BASE_URL}/.well-known/openid_configuration` },
    { name: 'JWKS', url: `${SLUDI_BASE_URL}/jwks` }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url);
      console.log(`✅ ${endpoint.name}: WORKING (Status: ${response.status})`);
    } catch (error) {
      console.log(`❌ ${endpoint.name}: FAILED (${error.message})`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    await testEndpointsOnly();
  } else {
    await testSludiCompetition();
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get('http://localhost:3001/health');
    return true;
  } catch (error) {
    console.log('❌ SLUDI Server not running on port 3001');
    console.log('💡 Please start the server first:');
    console.log('   cd your-sludi-directory');
    console.log('   npm start');
    console.log('\n   Then run this test again.');
    return false;
  }
}

// Run the appropriate test
checkServer().then(serverRunning => {
  if (serverRunning) {
    main().catch(console.error);
  }
});