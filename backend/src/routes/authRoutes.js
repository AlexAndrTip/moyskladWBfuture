// backend/src/routes/authRoutes.js
const express = require('express');
const { login, register, verifyEmail, resendVerification } = require('../controllers/authController');
const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

module.exports = router;