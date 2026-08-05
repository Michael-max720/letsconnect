// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.get('/pending', requireAuth, requireRole('admin'), adminController.listPendingApprovals);
router.patch('/:userId/approve', requireAuth, requireRole('admin'), adminController.approveOrganiser);
router.patch('/:userId/reject', requireAuth, requireRole('admin'), adminController.rejectOrganiser);
router.get('/stats', requireAuth, requireRole('admin'), adminController.getDashboardStats);

module.exports = router;