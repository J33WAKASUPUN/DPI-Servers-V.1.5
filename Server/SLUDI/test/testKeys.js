require('dotenv').config();
const SLUDI_CONFIG = require('../config/sludi');
const SludiTokenGenerator = require('../utils/sludiTokenGenerator');

async function testKeyConfiguration() {
  try {
    console.log('🔑 Testing SLUDI Key Configuration...');
    console.log('==========================================');
    
    // Test 1: Check if private key is loaded
    console.log('📋 Client ID:', SLUDI_CONFIG.CLIENT_ID);
    console.log('🔐 Private Key loaded:', !!SLUDI_CONFIG.CLIENT_PRIVATE_KEY);
    console.log('🏷️ Key ID:', SLUDI_CONFIG.CLIENT_PRIVATE_KEY.kid);
    console.log('🔢 Key Algorithm:', SLUDI_CONFIG.CLIENT_PRIVATE_KEY.alg);
    
    // Test 2: Generate a client assertion
    console.log('\n🔐 Testing Client Assertion Generation...');
    const clientAssertion = SludiTokenGenerator.generateClientAssertion();
    console.log('✅ Client Assertion Generated (first 100 chars):', clientAssertion.substring(0, 100) + '...');
    
    // Test 3: Verify the assertion
    console.log('\n🔍 Testing Client Assertion Verification...');
    const decoded = SludiTokenGenerator.verifySludiToken(clientAssertion);
    console.log('✅ Client Assertion Verified - Issuer:', decoded.iss);
    console.log('✅ Client Assertion Verified - Subject:', decoded.sub);
    console.log('✅ Client Assertion Verified - Audience:', decoded.aud);
    
    // Test 4: Generate public key for JWKS
    console.log('\n🔑 Testing Public Key Generation...');
    const publicPem = SludiTokenGenerator.jwkToPublicPem(SLUDI_CONFIG.CLIENT_PRIVATE_KEY);
    console.log('✅ Public Key Generated for JWKS (length):', publicPem.length);
    
    // Test 5: Test JWKS format
    console.log('\n📜 Testing JWKS Format...');
    const jwk = {
      kty: SLUDI_CONFIG.CLIENT_PRIVATE_KEY.kty,
      use: 'sig',
      alg: 'RS256',
      kid: SLUDI_CONFIG.CLIENT_PRIVATE_KEY.kid,
      n: SLUDI_CONFIG.CLIENT_PRIVATE_KEY.n,
      e: SLUDI_CONFIG.CLIENT_PRIVATE_KEY.e
    };
    console.log('✅ JWKS Public Key:', JSON.stringify(jwk, null, 2));
    
    console.log('\n🎉 All tests passed! Configuration is correct.');
    console.log('\n📋 Next Steps:');
    console.log('1. Share your PUBLIC KEY with ICTA to get CLIENT_ID');
    console.log('2. Update SLUDI_CLIENT_ID in .env once received');
    console.log('3. Test with Postman using the endpoints');
    
  } catch (error) {
    console.error('❌ Configuration Error:', error.message);
    console.log('\n💡 Please check your .env file and make sure:');
    console.log('   - CLIENT_PRIVATE_KEY is properly formatted JSON');
    console.log('   - All required key components are present');
    console.log('   - No extra spaces or characters in the JSON');
  }
}

// Run the test
testKeyConfiguration();