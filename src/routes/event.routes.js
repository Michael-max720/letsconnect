// src/routes/event.routes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.post('/', requireAuth, requireRole('organiser'), eventController.createEvent);
router.get('/mine', requireAuth, requireRole('organiser'), eventController.listMyEvents);
router.get('/', eventController.browseEvents);
router.get('/:eventId/tickets', eventController.getEventWithTickets);
router.get('/:eventId', eventController.getEvent);
router.patch('/:eventId/publish', requireAuth, requireRole('organiser'), eventController.publishEvent);
module.exports = router;