const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Token = require('../models/Token');

class TokenGenerator {
  // Generate JWT Access Token
  static generateAccessToken(citizenData) {
    const payload = {
      citizenId: citizenData.citizenId,
      email: citizenData.email,
      role: citizenData.role,
      type: 'access'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'SLUDI',
      audience: 'DPI-ECOSYSTEM'
    });
  }

  // Generate JWT Refresh Token
  static generateRefreshToken(citizenData) {
    const payload = {
      citizenId: citizenData.citizenId,
      type: 'refresh'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'SLUDI',
      audience: 'DPI-ECOSYSTEM'
    });
  }

  // Generate OAuth Authorization Code
  static generateAuthCode() {
    return uuidv4().replace(/-/g, '');
  }

  // Generate OAuth Access Token
  static async generateOAuthToken(citizenId, clientId, scope = ['basic']) {
    const tokenValue = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    const token = new Token({
      citizenId,
      token: tokenValue,
      tokenType: 'oauth',
      scope,
      clientId,
      expiresAt
    });

    await token.save();
    return tokenValue;
  }

  // Verify JWT Token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Generate verification code for email/phone
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate secure random token
  static generateSecureToken() {
    return uuidv4() + Date.now().toString(36);
  }
}

module.exports = TokenGenerator;