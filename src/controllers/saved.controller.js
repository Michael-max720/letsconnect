// src/controllers/saved.controller.js
const saved = require('../models/saved.model');
const eventModel = require('../models/event.model');

async function ids(req, res) {
  res.json({ ids: await saved.listIds(req.session.userId) });
}

async function list(req, res) {
  res.json({ events: await eventModel.findSavedEvents(req.session.userId) });
}

async function save(req, res) {
  const event = await eventModel.findEventById(req.params.eventId);
  // drafts are private to the organiser, so they cannot be saved
  if (!event || event.status === 'draft') {
    return res.status(404).json({ error: 'Event not found.' });
  }
  await saved.save(req.session.userId, event.event_id);
  res.json({ saved: true });
}

async function unsave(req, res) {
  await saved.unsave(req.session.userId, Number(req.params.eventId));
  res.json({ saved: false });
}

module.exports = { ids, list, save, unsave };