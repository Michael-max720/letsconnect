const express = require('express');
const router = express.Router();
const c = require('../controllers/organiserAgent.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.post('/agents', requireAuth, requireRole('organiser'), c.createAgent);
router.get('/agents', requireAuth, requireRole('organiser'), c.listAgents);
router.get('/reports/events', requireAuth, requireRole('organiser'), c.eventReport);
router.get('/reports/agents', requireAuth, requireRole('organiser'), c.agentReport);

module.exports = router;