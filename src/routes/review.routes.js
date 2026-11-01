// src/routes/review.routes.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/review.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.get('/', c.list);                                                      // public
router.get('/received', requireAuth, requireRole('organiser'), c.received);   // must stay above '/:id'
router.put('/', requireAuth, requireRole('attendee'), c.save);
router.delete('/:id', requireAuth, c.remove);                                 // owner or admin, checked in the controller

module.exports = router;