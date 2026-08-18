// src/controllers/ticketCategory.controller.js
const ticketCategoryModel = require('../models/ticketCategory.model');
const eventModel = require('../models/event.model');

async function createCategory(req, res) {
  const { eventId, name, price, quota, salesStart, salesEnd } = req.body;

  if (!eventId || !name || !price || !quota) {
    return res.status(400).json({ error: 'eventId, name, price and quota are required.' });
  }

  const event = await eventModel.findEventById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  // ownership check — this is the piece that makes B2's authorization real
  if (event.organiser_id !== req.session.userId) {
    return res.status(403).json({ error: 'You do not own this event.' });
  }

  const categoryId = await ticketCategoryModel.createCategory({
    eventId, name, price, quota, salesStart, salesEnd,
  });

  res.status(201).json({ message: 'Ticket category added.', categoryId });
}

async function listCategoriesForEvent(req, res) {
  const categories = await ticketCategoryModel.findCategoriesByEvent(req.params.eventId);
  res.json({ categories });
}
async function editCategory(req, res) {
  const category = await ticketCategoryModel.findCategoryById(req.params.categoryId);
  if (!category) return res.status(404).json({ error: 'Ticket category not found.' });

  const event = await eventModel.findEventById(category.event_id);
  if (event.organiser_id !== req.session.userId) {
    return res.status(403).json({ error: 'You do not own this event.' });
  }

  const { name, price, quota, salesStart, salesEnd } = req.body;
  await ticketCategoryModel.updateCategory(req.params.categoryId, { name, price, quota, salesStart, salesEnd });

  res.json({ message: 'Ticket category updated.' });
}

module.exports = { createCategory, listCategoriesForEvent, editCategory };