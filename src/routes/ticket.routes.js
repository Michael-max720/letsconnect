// src/routes/ticket.routes.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/mine', requireAuth, ticketController.getMyTickets);
router.get('/:ticketId', requireAuth, ticketController.getTicket);

module.exports = router;