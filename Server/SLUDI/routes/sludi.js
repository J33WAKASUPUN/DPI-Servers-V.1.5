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

module.exports = router;