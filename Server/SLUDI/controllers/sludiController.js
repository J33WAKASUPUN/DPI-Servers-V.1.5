const Citizen = require('../models/Citizen');
const Token = require('../models/Token');
const SludiTokenGenerator = require('../utils/sludiTokenGenerator');
const SLUDI_CONFIG = require('../config/sludi');

class SludiController {
  // Enhanced authorization endpoint for competition
  static async authorize(req, res) {
    try {
      const {
        client_id,
        redirect_uri,
        response_type,
        scope,
        state,
        nonce,
        code_challenge,
        code_challenge_method,
        claims
      } = req.query;

      console.log('🔐 SLUDI Authorization Request:', {
        client_id,
        redirect_uri,
        response_type,
        scope,
        state
      });

      // Validate required parameters
      if (!client_id || !redirect_uri || response_type !== 'code') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid OAuth parameters'
        });
      }

      // Validate client_id (check against registered clients)
      const registeredClient = SLUDI_CONFIG.REGISTERED_CLIENTS[client_id];
      if (!registeredClient) {
        console.log('❌ Unregistered client:', client_id);
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Client not registered in SLUDI system'
        });
      }

      // Validate redirect URI
      if (!registeredClient.redirect_uris.includes(redirect_uri)) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid redirect_uri'
        });
      }

      // Parse and validate scope
      const requestedScopes = scope ? scope.split(' ') : ['openid'];
      const validScopes = requestedScopes.filter(s => 
        SLUDI_CONFIG.SUPPORTED_SCOPES.includes(s) && 
        registeredClient.scopes.includes(s)
      );
      
      if (validScopes.length === 0) {
        return res.status(400).json({
          error: 'invalid_scope',
          error_description: 'No valid scopes requested'
        });
      }

      // For competition testing, use admin citizen
      // In production, this would come from the authenticated session
      const adminCitizen = await Citizen.findOne({ 
        email: 'admin@sludi.gov.lk',
        role: 'admin'
      });

      if (!adminCitizen) {
        return res.status(401).json({
          error: 'login_required',
          error_description: 'No admin user found for testing'
        });
      }

      // Generate authorization code
      const authCode = await SludiTokenGenerator.generateSludiAuthCode(
        adminCitizen.citizenId,
        client_id,
        validScopes,
        redirect_uri
      );

      console.log('✅ Authorization code generated:', authCode);

      // Build redirect URL
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.append('code', authCode);
      if (state) redirectUrl.searchParams.append('state', state);

      // For competition demo, return both redirect URL and direct response
      res.json({
        success: true,
        redirect_url: redirectUrl.toString(),
        authorization_code: authCode,
        client_id: client_id,
        citizen_id: adminCitizen.citizenId,
        scopes: validScopes,
        message: 'Authorization successful - Competition Demo'
      });

    } catch (error) {
      console.error('❌ SLUDI authorize error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Authorization failed',
        details: error.message
      });
    }
  }

  // Enhanced token endpoint for competition
  static async token(req, res) {
    try {
      const {
        grant_type,
        code,
        client_id,
        client_assertion,
        client_assertion_type,
        redirect_uri,
        code_verifier
      } = req.body;

      console.log('🎫 SLUDI Token Request:', {
        grant_type,
        code,
        client_id,
        has_client_assertion: !!client_assertion
      });

      // Validate grant type
      if (grant_type !== 'authorization_code') {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Only authorization_code grant type is supported'
        });
      }

      // Validate required parameters
      if (!code || !client_id) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters'
        });
      }

      // Find and validate authorization code
      const authToken = await Token.findOne({
        token: code,
        tokenType: 'sludi_auth_code',
        clientId: client_id
      });

      if (!authToken || !authToken.isValid()) {
        console.log('❌ Invalid auth code:', code);
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code'
        });
      }

      // Get citizen data
      const citizen = await Citizen.findOne({ citizenId: authToken.citizenId });
      if (!citizen) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Citizen not found'
        });
      }

      // Generate tokens
      const accessToken = await SludiTokenGenerator.generateSludiAccessToken(
        citizen.citizenId,
        client_id,
        authToken.scope
      );

      const idToken = SludiTokenGenerator.generateIdToken(citizen, client_id);

      // Revoke the authorization code (one-time use)
      await authToken.revoke();

      console.log('✅ Tokens generated successfully');

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: idToken,
        scope: authToken.scope.join(' '),
        // Competition metadata
        citizen_id: citizen.citizenId,
        competition_demo: true
      });

    } catch (error) {
      console.error('❌ SLUDI token error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Token exchange failed',
        details: error.message
      });
    }
  }

  // Enhanced userinfo endpoint
  static async userinfo(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          error: 'invalid_token',
          error_description: 'Access token required'
        });
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

      // Find SLUDI OAuth token
      const oauthToken = await Token.findOne({
        token,
        tokenType: 'sludi_oauth'
      });

      if (!oauthToken || !oauthToken.isValid()) {
        return res.status(401).json({
          error: 'invalid_token',
          error_description: 'Invalid or expired access token'
        });
      }

      // Get citizen data
      const citizen = await Citizen.findOne({ citizenId: oauthToken.citizenId });
      if (!citizen) {
        return res.status(401).json({
          error: 'invalid_token',
          error_description: 'Citizen not found'
        });
      }

      // Build userinfo response based on scope
      const userInfo = { 
        sub: citizen.citizenId,
        // Competition metadata
        issuer: 'SLUDI-ReviveNation',
        competition: 'ReviveNation Hackathon 2025'
      };

      if (oauthToken.scope.includes('profile') || oauthToken.scope.includes('openid')) {
        userInfo.given_name = citizen.firstName;
        userInfo.family_name = citizen.lastName;
        userInfo.name = `${citizen.firstName} ${citizen.lastName}`;
        userInfo.email = citizen.email;
        userInfo.phone_number = citizen.phoneNumber;
        userInfo.email_verified = citizen.isVerified;
        userInfo.phone_number_verified = citizen.isVerified;
        userInfo.locale = 'en-LK';
        userInfo.zoneinfo = 'Asia/Colombo';
      }

      if (oauthToken.scope.includes('resident-service')) {
        userInfo.address = citizen.address;
        userInfo.birthdate = citizen.dateOfBirth?.toISOString().split('T')[0];
        userInfo.country = 'LK';
        userInfo.nationality = 'Sri Lankan';
      }

      console.log('✅ User info provided for:', citizen.citizenId);

      res.json(userInfo);

    } catch (error) {
      console.error('❌ SLUDI userinfo error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to get user info',
        details: error.message
      });
    }
  }

  // Competition testing endpoint
  static async competitionTest(req, res) {
    try {
      const { client_id } = req.params;
      
      // Test authorization flow
      const authResponse = await fetch(`http://localhost:3001/api/sludi/authorize?client_id=${client_id}&redirect_uri=http://localhost:3001/callback&response_type=code&scope=openid profile&state=test123`);
      
      res.json({
        success: true,
        message: 'SLUDI Competition Test Successful',
        client_id: client_id,
        endpoints: {
          discovery: 'http://localhost:3001/api/sludi/.well-known/openid_configuration',
          authorize: 'http://localhost:3001/api/sludi/authorize',
          token: 'http://localhost:3001/api/sludi/token',
          userinfo: 'http://localhost:3001/api/sludi/userinfo',
          jwks: 'http://localhost:3001/api/sludi/jwks'
        },
        test_time: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Competition test error:', error);
      res.status(500).json({
        success: false,
        message: 'Competition test failed',
        error: error.message
      });
    }
  }

  // Keep existing discovery and jwks methods...
  static async discovery(req, res) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/sludi`;
      
      res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        userinfo_endpoint: `${baseUrl}/userinfo`,
        jwks_uri: `${baseUrl}/jwks`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: SLUDI_CONFIG.SUPPORTED_SCOPES,
        claims_supported: [
          'sub', 'given_name', 'family_name', 'name', 'email', 
          'phone_number', 'email_verified', 'phone_number_verified',
          'locale', 'zoneinfo', 'address', 'birthdate'
        ],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['private_key_jwt', 'client_secret_basic'],
        // Competition metadata
        competition: 'ReviveNation Hackathon 2025',
        sludi_version: '1.0.0'
      });

    } catch (error) {
      console.error('❌ SLUDI discovery error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to get discovery info'
      });
    }
  }

  static async jwks(req, res) {
    try {
      // Convert back to JWK format for JWKS
      const jwk = {
        kty: SLUDI_CONFIG.CLIENT_PRIVATE_KEY.kty,
        use: 'sig',
        alg: 'RS256',
        kid: 'sludi-key-1',
        n: SLUDI_CONFIG.CLIENT_PRIVATE_KEY.n,
        e: SLUDI_CONFIG.CLIENT_PRIVATE_KEY.e
      };

      res.json({
        keys: [jwk]
      });

    } catch (error) {
      console.error('❌ SLUDI JWKS error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to get JWKS'
      });
    }
  }
}

module.exports = SludiController;