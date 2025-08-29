const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const SLUDI_CONFIG = require('../config/sludi');
const Token = require('../models/Token');

class SludiTokenGenerator {
  // Generate JWT Client Assertion for SLUDI
  static generateClientAssertion() {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      iss: SLUDI_CONFIG.CLIENT_ID,
      sub: SLUDI_CONFIG.CLIENT_ID,
      aud: SLUDI_CONFIG.ESIGNET_AUD_URL,
      iat: now,
      exp: now + 300, // 5 minutes
      jti: uuidv4()
    };

    // Convert JWK to PEM format for signing
    const privateKeyPem = this.jwkToPem(SLUDI_CONFIG.CLIENT_PRIVATE_KEY);
    
    return jwt.sign(payload, privateKeyPem, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        typ: 'JWT'
      }
    });
  }

  // Generate SLUDI-compatible access token
  static async generateSludiAccessToken(citizenId, clientId, scope = ['openid', 'profile']) {
    const tokenValue = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    const token = new Token({
      citizenId,
      token: tokenValue,
      tokenType: 'sludi_oauth',
      scope,
      clientId: clientId || SLUDI_CONFIG.CLIENT_ID,
      expiresAt
    });

    await token.save();
    return tokenValue;
  }

  // Generate SLUDI authorization code
  static async generateSludiAuthCode(citizenId, clientId, scope, redirectUri) {
    const authCode = uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 600000); // 10 minutes

    const token = new Token({
      citizenId,
      token: authCode,
      tokenType: 'sludi_auth_code',
      scope,
      clientId,
      expiresAt,
      metadata: {
        redirectUri,
        codeChallenge: null, // Can be added for PKCE support
        codeChallengeMethod: null
      }
    });

    await token.save();
    return authCode;
  }

  // Convert JWK to PEM format
  static jwkToPem(jwk) {
    const { n, e } = jwk;
    
    // Decode base64url
    const nBuffer = Buffer.from(n, 'base64url');
    const eBuffer = Buffer.from(e, 'base64url');
    
    // Create RSA key
    const key = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: n,
        e: e
      },
      format: 'jwk'
    });
    
    // For private key, we need the full JWK
    const privateKey = crypto.createPrivateKey({
      key: jwk,
      format: 'jwk'
    });
    
    return privateKey.export({
      type: 'pkcs8',
      format: 'pem'
    });
  }

  // Generate ID Token for OpenID Connect
  static generateIdToken(citizen, clientId, nonce = null) {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      iss: `${process.env.BASE_URL || 'http://localhost:3001'}/api/sludi`,
      sub: citizen.citizenId,
      aud: clientId,
      exp: now + 3600,
      iat: now,
      auth_time: Math.floor(new Date(citizen.lastLogin || citizen.createdAt).getTime() / 1000),
      given_name: citizen.firstName,
      family_name: citizen.lastName,
      name: `${citizen.firstName} ${citizen.lastName}`,
      email: citizen.email,
      phone_number: citizen.phoneNumber,
      email_verified: citizen.isVerified,
      phone_number_verified: citizen.isVerified
    };

    if (nonce) {
      payload.nonce = nonce;
    }

    const privateKeyPem = this.jwkToPem(SLUDI_CONFIG.CLIENT_PRIVATE_KEY);
    
    return jwt.sign(payload, privateKeyPem, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'sludi-key-1'
      }
    });
  }

  // Verify SLUDI token
  static verifySludiToken(token) {
    try {
      const publicKeyPem = this.jwkToPublicPem(SLUDI_CONFIG.CLIENT_PRIVATE_KEY);
      return jwt.verify(token, publicKeyPem, { algorithms: ['RS256'] });
    } catch (error) {
      throw new Error('Invalid SLUDI token');
    }
  }

  // Convert JWK to public PEM
  static jwkToPublicPem(jwk) {
    const publicKey = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: jwk.n,
        e: jwk.e
      },
      format: 'jwk'
    });
    
    return publicKey.export({
      type: 'spki',
      format: 'pem'
    });
  }
}

module.exports = SludiTokenGenerator;