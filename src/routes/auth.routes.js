// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/resend-otp', authController.resendOtp);
router.get('/me', authController.getCurrentUser);
router.post('/resend-otp', authController.resendOtp);
router.post('/request-reset', authController.requestPasswordReset);
router.post('/confirm-reset', authController.confirmPasswordReset);
module.exports = router;