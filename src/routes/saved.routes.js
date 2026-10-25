// src/routes/saved.routes.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/saved.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.use(requireAuth, requireRole('attendee'));   // saving is for attendee accounts

router.get('/ids', c.ids);        // must stay above '/:eventId'
router.get('/', c.list);
router.post('/:eventId', c.save);
router.delete('/:eventId', c.unsave);

module.exports = router;