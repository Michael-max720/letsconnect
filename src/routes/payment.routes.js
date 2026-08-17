// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.post('/checkout', requireAuth, requireRole('attendee'), paymentController.initiateCheckout);
router.post('/callback', paymentController.handleCallback);
router.get('/status/:transactionId', requireAuth, paymentController.checkStatus);
module.exports = router;