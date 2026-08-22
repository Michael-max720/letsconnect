const express = require('express');
const router = express.Router();
const c = require('../controllers/gateAssignment.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.post('/invite', requireAuth, requireRole('organiser'), c.invite);
router.get('/pending', requireAuth, requireRole('admin'), c.listPending);
router.patch('/:assignmentId/approve', requireAuth, requireRole('admin'), c.approve);
router.patch('/:assignmentId/reject', requireAuth, requireRole('admin'), c.reject);
router.get('/mine', requireAuth, requireRole('gate_agent'), c.myEvents);

module.exports = router;