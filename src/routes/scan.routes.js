// src/routes/scan.routes.js
const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.post('/scan', requireAuth, requireRole('gate_agent'), scanController.scanTicket);
router.get('/history', requireAuth, requireRole('gate_agent'), scanController.getScanHistory);

module.exports = router;