const express = require('express');
const SludiController = require('../controllers/sludiController');
const { rateLimiter } = require('../middleware/auth');

const router = express.Router();

// SLUDI OAuth 2.0 / OpenID Connect endpoints
router.get('/.well-known/openid_configuration', SludiController.discovery);
router.get('/jwks', SludiController.jwks);
router.get('/authorize', SludiController.authorize);
router.post('/token', rateLimiter(10), SludiController.token);
router.get('/userinfo', SludiController.userinfo);
router.post('/userinfo', SludiController.userinfo);

// Competition testing endpoint
router.get('/test/:client_id', SludiController.competitionTest);

// Health check specific to SLUDI
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SLUDI OAuth Provider',
    version: '1.0.0',
    competition: 'ReviveNation Hackathon 2025',
    client_id: process.env.SLUDI_CLIENT_ID,
    timestamp: new Date().toISOString(),
    endpoints_ready: true
  });
});

module.exports = router;