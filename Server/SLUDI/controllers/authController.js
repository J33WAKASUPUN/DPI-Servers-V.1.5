const Citizen = require('../models/Citizen');
const Token = require('../models/Token');
const TokenGenerator = require('../utils/tokenGenerator');
const { v4: uuidv4 } = require('uuid');

class AuthController {
  // Register new citizen
  static async register(req, res) {
    try {
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        dateOfBirth,
        address
      } = req.body;

      // Check if citizen already exists
      const existingCitizen = await Citizen.findOne({
        $or: [{ email }, { phoneNumber }]
      });

      if (existingCitizen) {
        return res.status(400).json({
          success: false,
          message: 'Citizen with this email or phone number already exists'
        });
      }

      // Generate unique citizen ID
      const citizenId = `SL${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create new citizen
      const citizen = new Citizen({
        citizenId,
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        dateOfBirth: new Date(dateOfBirth),
        address,
        verificationCode: TokenGenerator.generateVerificationCode()
      });

      await citizen.save();

      // Generate tokens
      const accessToken = TokenGenerator.generateAccessToken(citizen);
      const refreshToken = TokenGenerator.generateRefreshToken(citizen);

      // Save refresh token to database
      const tokenDoc = new Token({
        citizenId: citizen.citizenId,
        token: refreshToken,
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      await tokenDoc.save();

      res.status(201).json({
        success: true,
        message: 'Citizen registered successfully',
        data: {
          citizen: {
            citizenId: citizen.citizenId,
            firstName: citizen.firstName,
            lastName: citizen.lastName,
            email: citizen.email,
            phoneNumber: citizen.phoneNumber,
            isVerified: citizen.isVerified
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 3600
          }
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  // Login citizen
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find citizen by email
      const citizen = await Citizen.findOne({ email });
      
      if (!citizen) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check password
      const isPasswordValid = await citizen.comparePassword(password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if account is active
      if (citizen.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Account is not active'
        });
      }

      // Update last login
      await citizen.updateLastLogin();

      // Generate tokens
      const accessToken = TokenGenerator.generateAccessToken(citizen);
      const refreshToken = TokenGenerator.generateRefreshToken(citizen);

      // Save refresh token to database
      const tokenDoc = new Token({
        citizenId: citizen.citizenId,
        token: refreshToken,
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      await tokenDoc.save();

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          citizen: {
            citizenId: citizen.citizenId,
            firstName: citizen.firstName,
            lastName: citizen.lastName,
            email: citizen.email,
            role: citizen.role,
            isVerified: citizen.isVerified
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 3600
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const decoded = TokenGenerator.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
      }

      // Check if token exists in database
      const tokenDoc = await Token.findOne({
        token: refreshToken,
        tokenType: 'refresh'
      });

      if (!tokenDoc || !tokenDoc.isValid()) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Find citizen
      const citizen = await Citizen.findOne({ citizenId: decoded.citizenId });
      
      if (!citizen) {
        return res.status(401).json({
          success: false,
          message: 'Citizen not found'
        });
      }

      // Generate new access token
      const newAccessToken = TokenGenerator.generateAccessToken(citizen);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          expiresIn: 3600
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Token refresh failed',
        error: error.message
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke refresh token
        await Token.findOneAndUpdate(
          { token: refreshToken, tokenType: 'refresh' },
          { isRevoked: true, revokedAt: new Date() }
        );
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  // Get citizen profile
  static async getProfile(req, res) {
    try {
      const citizen = req.citizen;

      res.json({
        success: true,
        data: {
          citizenId: citizen.citizenId,
          firstName: citizen.firstName,
          lastName: citizen.lastName,
          email: citizen.email,
          phoneNumber: citizen.phoneNumber,
          dateOfBirth: citizen.dateOfBirth,
          address: citizen.address,
          isVerified: citizen.isVerified,
          role: citizen.role,
          status: citizen.status,
          lastLogin: citizen.lastLogin
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Update citizen profile
  static async updateProfile(req, res) {
    try {
      const citizenId = req.citizen.citizenId;
      const updates = req.body;

      // Remove sensitive fields
      delete updates.password;
      delete updates.citizenId;
      delete updates.role;
      delete updates.isVerified;

      const citizen = await Citizen.findOneAndUpdate(
        { citizenId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          citizenId: citizen.citizenId,
          firstName: citizen.firstName,
          lastName: citizen.lastName,
          email: citizen.email,
          phoneNumber: citizen.phoneNumber,
          dateOfBirth: citizen.dateOfBirth,
          address: citizen.address
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;