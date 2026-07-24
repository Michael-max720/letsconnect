// src/routes/ticketCategory.routes.js
const express = require('express');
const router = express.Router();
const ticketCategoryController = require('../controllers/ticketCategory.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.post('/', requireAuth, requireRole('organiser'), ticketCategoryController.createCategory);
router.get('/event/:eventId', ticketCategoryController.listCategoriesForEvent);

module.exports = router;