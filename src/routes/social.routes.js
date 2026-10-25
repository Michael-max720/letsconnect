// src/routes/social.routes.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/social.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.get('/organisers/:id', c.profile);   // public: anyone can view an organiser page
router.post('/organisers/:id/follow', requireAuth, requireRole('attendee'), c.follow);
router.delete('/organisers/:id/follow', requireAuth, requireRole('attendee'), c.unfollow);
router.get('/following', requireAuth, requireRole('attendee'), c.following);
router.get('/feed', requireAuth, requireRole('attendee'), c.feed);
router.post('/updates', requireAuth, requireRole('organiser'), c.postUpdate);
router.get('/updates/mine', requireAuth, requireRole('organiser'), c.myUpdates);

module.exports = router;