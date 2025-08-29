const Citizen = require('../models/Citizen');
const Token = require('../models/Token');
const SludiTokenGenerator = require('../utils/sludiTokenGenerator');
const SLUDI_CONFIG = require('../config/sludi');
const axios = require('axios');

class SludiController {
  // SLUDI OAuth Authorization endpoint
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

      // Validate required parameters
      if (!client_id || !redirect_uri || response_type !== 'code') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid OAuth parameters'
        });
      }

      // Validate client_id (in production, check against registered clients)
      if (client_id !== SLUDI_CONFIG.CLIENT_ID) {
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Invalid client_id'
        });
      }

      // Parse and validate scope
      const requestedScopes = scope ? scope.split(' ') : ['openid'];
      const validScopes = requestedScopes.filter(s => SLUDI_CONFIG.SUPPORTED_SCOPES.includes(s));
      
      if (validScopes.length === 0) {
        return res.status(400).json({
          error: 'invalid_scope',
          error_description: 'Invalid scope'
        });
      }

      // Check if user is authenticated (you might want to implement this differently)
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          error: 'login_required',
          error_description: 'User authentication required'
        });
      }

      // Get citizen from token (reuse your existing auth middleware logic)
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      let citizen;
      
      try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        citizen = await Citizen.findOne({ citizenId: decoded.citizenId });
        
        if (!citizen || citizen.status !== 'active') {
          throw new Error('Invalid citizen');
        }
      } catch (error) {
        return res.status(401).json({
          error: 'login_required',
          error_description: 'Invalid authentication token'
        });
      }

      // Generate authorization code
      const authCode = await SludiTokenGenerator.generateSludiAuthCode(
        citizen.citizenId,
        client_id,
        validScopes,
        redirect_uri
      );

      // Build redirect URL
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.append('code', authCode);
      if (state) redirectUrl.searchParams.append('state', state);

      res.json({
        success: true,
        redirect_url: redirectUrl.toString(),
        message: 'Authorization code generated successfully'
      });

    } catch (error) {
      console.error('SLUDI authorize error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Authorization failed'
      });
    }
  }

  // SLUDI OAuth Token endpoint
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

      // Validate client assertion (SLUDI requirement)
      if (client_assertion_type === SLUDI_CONFIG.CLIENT_ASSERTION_TYPE && client_assertion) {
        try {
          const decoded = SludiTokenGenerator.verifySludiToken(client_assertion);
          if (decoded.iss !== client_id || decoded.sub !== client_id) {
            throw new Error('Invalid client assertion');
          }
        } catch (error) {
          return res.status(400).json({
            error: 'invalid_client',
            error_description: 'Invalid client assertion'
          });
        }
      }

      // Find and validate authorization code
      const authToken = await Token.findOne({
        token: code,
        tokenType: 'sludi_auth_code',
        clientId: client_id
      });

      if (!authToken || !authToken.isValid()) {
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

      // Revoke the authorization code
      await authToken.revoke();

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: idToken,
        scope: authToken.scope.join(' ')
      });

    } catch (error) {
      console.error('SLUDI token error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Token exchange failed'
      });
    }
  }

  // SLUDI UserInfo endpoint
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
      const userInfo = { sub: citizen.citizenId };

      if (oauthToken.scope.includes('profile') || oauthToken.scope.includes('openid')) {
        userInfo.given_name = citizen.firstName;
        userInfo.family_name = citizen.lastName;
        userInfo.name = `${citizen.firstName} ${citizen.lastName}`;
        userInfo.email = citizen.email;
        userInfo.phone_number = citizen.phoneNumber;
        userInfo.email_verified = citizen.isVerified;
        userInfo.phone_number_verified = citizen.isVerified;
      }

      if (oauthToken.scope.includes('resident-service')) {
        userInfo.address = citizen.address;
        userInfo.birthdate = citizen.dateOfBirth;
        userInfo.locale = 'en-LK';
      }

      res.json(userInfo);

    } catch (error) {
      console.error('SLUDI userinfo error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to get user info'
      });
    }
  }

  // SLUDI JWKS endpoint (for token verification)
  static async jwks(req, res) {
    try {
      const publicKey = SludiTokenGenerator.jwkToPublicPem(SLUDI_CONFIG.CLIENT_PRIVATE_KEY);
      
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
      console.error('SLUDI JWKS error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to get JWKS'
      });
    }
  }

  // SLUDI Discovery endpoint
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
        claims_supported: ['sub', 'given_name', 'family_name', 'name', 'email', 'phone_number', 'email_verified', 'phone_number_verified'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['private_key_jwt', 'client_secret_basic']
      });

    } catch (error) {
      console.error('SLUDI discovery error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to get discovery info'
      });
    }
  }
}

module.exports = SludiController;