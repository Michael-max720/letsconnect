// src/controllers/event.controller.js
const eventModel = require('../models/event.model');

async function createEvent(req, res) {
  const { title, description, category, venue, eventDate } = req.body;
  const coverImageUrl = req.file ? '/uploads/' + req.file.filename : (req.body.coverImageUrl || null);

  if (!title || !eventDate) {
    return res.status(400).json({ error: 'Title and event date are required.' });
  }

  const eventId = await eventModel.createEvent({
    organiserId: req.session.userId, // NOT from req.body — see note below
    title,
    description,
    category,
    venue,
    eventDate,
    coverImageUrl,
  });

  res.status(201).json({ message: 'Event created as a draft.', eventId });
}

async function listMyEvents(req, res) {
  const events = await eventModel.findEventsByOrganiser(req.session.userId);
  res.json({ events });
}

async function getEvent(req, res) {
  const event = await eventModel.findEventById(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json({ event });
}
async function publishEvent(req, res) {
  const event = await eventModel.findEventById(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  if (event.organiser_id !== req.session.userId) {
    return res.status(403).json({ error: 'You do not own this event.' });
  }

  await eventModel.publishEvent(req.params.eventId);
  res.json({ message: 'Event published.' });
}

async function browseEvents(req, res) {
  const { search, category } = req.query;
  const events = await eventModel.findPublishedEvents({ search, category });
  res.json({ events });
}

async function getEventWithTickets(req, res) {
  const event = await eventModel.findEventById(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const ticketCategoryModel = require('../models/ticketCategory.model');
  const categories = await ticketCategoryModel.findCategoriesByEvent(req.params.eventId);

  res.json({ event, ticketCategories: categories });
}
async function editEvent(req, res) {
  const event = await eventModel.findEventById(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  if (event.organiser_id !== req.session.userId) {
    return res.status(403).json({ error: 'You do not own this event.' });
  }

  const { title, description, category, venue, eventDate, coverImageUrl } = req.body;
  await eventModel.updateEvent(req.params.eventId, { title, description, category, venue, eventDate, coverImageUrl });

  res.json({ message: 'Event updated.' });
}

module.exports = { createEvent, listMyEvents, getEvent, publishEvent, browseEvents, getEventWithTickets, editEvent };