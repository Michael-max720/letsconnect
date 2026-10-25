// src/controllers/event.controller.js
const eventModel = require('../models/event.model');
const socialModel = require('../models/social.model');

const ALLOWED_AGES = [0, 12, 16, 18, 21];

// Clean the age and family-friendly inputs. An event restricted to 16+ cannot be
// flagged family friendly (error prevention on the server, not only in the form).
function cleanAudience(body) {
  const n = Number(body.ageMin);
  const ageMin = ALLOWED_AGES.includes(n) ? n : 0;
  const ff = body.familyFriendly === true || body.familyFriendly === 1 ||
             body.familyFriendly === '1' || body.familyFriendly === 'true';
  return { ageMin, familyFriendly: ageMin >= 16 ? false : ff };
}

// Tell the organiser's followers about something that happened.
// A failure here must never stop the publish/cancel itself.
async function announce(event, type, title, body) {
  try {
    await socialModel.createUpdate({ organiserId: event.organiser_id, eventId: event.event_id, type, title, body });
  } catch (err) {
    console.error('Could not post follower update:', err.message);
  }
}

async function createEvent(req, res) {
  const { title, description, category, venue, region, eventDate } = req.body;
  const coverImageUrl = req.file ? '/uploads/' + req.file.filename : (req.body.coverImageUrl || null);

  if (!title || !eventDate) {
    return res.status(400).json({ error: 'Title and event date are required.' });
  }

  const { ageMin, familyFriendly } = cleanAudience(req.body);

  const eventId = await eventModel.createEvent({
    organiserId: req.session.userId, // NOT from req.body: the browser must not choose who owns the event
    title,
    description,
    category,
    venue,
    region,
    ageMin,
    familyFriendly,
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

  // Followers hear about it once, the first time it goes live
  const firstTime = event.status !== 'published';
  await eventModel.publishEvent(req.params.eventId);
  if (firstTime) {
    const when = new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const where = [event.venue, event.region].filter(Boolean).join(', ');
    await announce(event, 'new_event', 'New event: ' + event.title, [when, where].filter(Boolean).join(' · '));
  }
  res.json({ message: 'Event published.' });
}

async function cancelEvent(req, res) {
  const event = await eventModel.findEventById(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  if (event.organiser_id !== req.session.userId) {
    return res.status(403).json({ error: 'You do not own this event.' });
  }
  if (event.status !== 'published') {
    return res.status(409).json({ error: 'Only a published event can be cancelled.' });
  }

  await eventModel.cancelEvent(req.params.eventId);
  await announce(event, 'cancelled', 'Cancelled: ' + event.title, 'This event has been cancelled by the organiser.');
  res.json({ message: 'Event cancelled.' });
}

async function browseEvents(req, res) {
  const { search, location, category, organiser } = req.query;
  const organiserId = Number(req.query.organiserId) || null;
  const events = await eventModel.findPublishedEvents({ search, location, category, organiser, organiserId });
  res.json({ events });
}

async function highlights(req, res) {
  const { location } = req.query;
  const result = await eventModel.findHighlights({ location });
  res.json(result);
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

  const { title, description, category, venue, region, eventDate, coverImageUrl } = req.body;
  const { ageMin, familyFriendly } = cleanAudience(req.body);
  await eventModel.updateEvent(req.params.eventId, {
    title, description, category, venue, region, ageMin, familyFriendly, eventDate, coverImageUrl,
  });

  res.json({ message: 'Event updated.' });
}

module.exports = {
  createEvent, listMyEvents, getEvent, publishEvent, cancelEvent,
  browseEvents, highlights, getEventWithTickets, editEvent,
};