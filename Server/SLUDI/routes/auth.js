const express = require('express');
const AuthController = require('../controllers/authController');
const { verifyToken, rateLimiter } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', rateLimiter(3), AuthController.register);
router.post('/login', rateLimiter(5), AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/profile', verifyToken, AuthController.getProfile);
router.put('/profile', verifyToken, AuthController.updateProfile);

module.exports = router;