const express = require('express');
const Citizen = require('../models/Citizen');
const Token = require('../models/Token');
const TokenGenerator = require('../utils/tokenGenerator');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// OAuth Authorization endpoint
router.get('/authorize', verifyToken, async (req, res) => {
  try {
    const { client_id, redirect_uri, response_type, scope, state } = req.query;

    // Validate required parameters
    if (!client_id || !redirect_uri || response_type !== 'code') {
      return res.status(400).json({
        success: false,
        message: 'Invalid OAuth parameters'
      });
    }

    // In a real implementation, you would validate the client_id and redirect_uri
    // against a registered clients database

    // Generate authorization code
    const authCode = TokenGenerator.generateAuthCode();
    
    // Store authorization code temporarily (expires in 10 minutes)
    const authToken = new Token({
      citizenId: req.citizen.citizenId,
      token: authCode,
      tokenType: 'oauth',
      clientId: client_id,
      scope: scope ? scope.split(' ') : ['basic'],
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await authToken.save();

    // Redirect back to client with authorization code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', authCode);
    if (state) redirectUrl.searchParams.append('state', state);

    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({
      success: false,
      message: 'OAuth authorization failed',
      error: error.message
    });
  }
});

// OAuth Token endpoint
router.post('/token', async (req, res) => {
  try {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      });
    }

    if (!code || !client_id) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      });
    }

    // Find authorization code
    const authToken = await Token.findOne({
      token: code,
      tokenType: 'oauth',
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

    // Generate OAuth access token
    const accessToken = await TokenGenerator.generateOAuthToken(
      citizen.citizenId,
      client_id,
      authToken.scope
    );

    // Revoke the authorization code
    await authToken.revoke();

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: authToken.scope.join(' ')
    });

  } catch (error) {
    console.error('OAuth token error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'OAuth token exchange failed'
    });
  }
});

// OAuth User Info endpoint
router.get('/userinfo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Access token required'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    // Find OAuth token
    const oauthToken = await Token.findOne({
      token,
      tokenType: 'oauth'
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

    // Return user info based on granted scope
    const userInfo = {
      sub: citizen.citizenId
    };

    if (oauthToken.scope.includes('basic')) {
      userInfo.name = `${citizen.firstName} ${citizen.lastName}`;
      userInfo.email = citizen.email;
    }

    if (oauthToken.scope.includes('profile')) {
      userInfo.given_name = citizen.firstName;
      userInfo.family_name = citizen.lastName;
      userInfo.phone_number = citizen.phoneNumber;
    }

    res.json(userInfo);

  } catch (error) {
    console.error('OAuth userinfo error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to get user info'
    });
  }
});

module.exports = router;