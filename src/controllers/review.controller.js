// src/controllers/review.controller.js
const reviewModel = require('../models/review.model');
const eventModel = require('../models/event.model');
const socialModel = require('../models/social.model');

const TYPES = ['event', 'organiser', 'platform'];

// "Amina Wanjiru" -> "Amina W."  (reviews show a first name and an initial, never the full name)
function displayName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Attendee';
  return parts.length > 1 ? parts[0] + ' ' + parts[parts.length - 1][0].toUpperCase() + '.' : parts[0];
}

// Check the thing being reviewed exists. Returns { ok, targetId, event? } or an error.
async function resolveTarget(type, rawId) {
  if (!TYPES.includes(type)) return { error: 'Choose what you are reviewing: an event, an organiser or the platform.' };
  if (type === 'platform') return { ok: true, targetId: 0 };
  const id = Number(rawId);
  if (!id) return { error: 'Missing id.' };
  if (type === 'event') {
    const event = await eventModel.findEventById(id);
    if (!event || event.status === 'draft') return { error: 'Event not found.', notFound: true };
    return { ok: true, targetId: id, event };
  }
  const organiser = await socialModel.findOrganiser(id);
  if (!organiser) return { error: 'Organiser not found.', notFound: true };
  return { ok: true, targetId: id };
}

// Can this attendee review this target right now? Returns 'ok' or the reason why not.
async function eligibility(userId, type, target) {
  if (type === 'platform') return 'ok';

  const started = (date) => new Date(date) <= new Date();

  if (type === 'event') {
    if (target.event.status === 'cancelled') return 'cancelled';
    const tickets = await reviewModel.ticketsForEvent(userId, target.targetId);
    if (!tickets.length) return 'need_ticket';
    const attended = tickets.some((t) => t.status === 'used') || started(target.event.event_date);
    return attended ? 'ok' : 'not_yet';
  }

  const tickets = await reviewModel.ticketsForOrganiser(userId, target.targetId);
  if (!tickets.length) return 'need_ticket';
  const attended = tickets.some((t) => t.status === 'used' || started(t.event_date));
  return attended ? 'ok' : 'not_yet';
}

// Public: ratings and reviews for one target, plus what the viewer may do
async function list(req, res) {
  const target = await resolveTarget(req.query.type, req.query.id);
  if (target.error) return res.status(target.notFound ? 404 : 400).json({ error: target.error });
  const type = req.query.type;

  const viewerId = req.session.userId || null;
  const role = req.session.role || null;

  const [summary, rows] = await Promise.all([
    reviewModel.summary(type, target.targetId),
    reviewModel.list(type, target.targetId),
  ]);

  let state = 'login';
  let mine = null;
  if (viewerId) {
    if (role !== 'attendee') {
      state = 'attendees_only';
    } else {
      state = await eligibility(viewerId, type, target);
      mine = await reviewModel.findMine(viewerId, type, target.targetId);
      // someone who already reviewed keeps the right to edit it
      if (mine && state !== 'ok' && state !== 'cancelled') state = 'ok';
    }
  }

  res.json({
    summary,
    reviews: rows.map((r) => ({
      review_id: r.review_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: displayName(r.reviewer_name),
      is_mine: viewerId !== null && r.reviewer_id === viewerId,
      verified: type !== 'platform',   // event and organiser reviews come from ticket holders
    })),
    state,
    myReview: mine ? { rating: mine.rating, comment: mine.comment } : null,
    viewerRole: role,
  });
}

// Attendee: write or replace their review
async function save(req, res) {
  const { type } = req.body;
  const target = await resolveTarget(type, req.body.id);
  if (target.error) return res.status(target.notFound ? 404 : 400).json({ error: target.error });

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Please choose a rating from 1 to 5 stars.' });
  }
  const comment = String(req.body.comment || '').trim();
  if (comment.length > 1000) {
    return res.status(400).json({ error: 'Your review is too long. Please keep it under 1000 characters.' });
  }

  const userId = req.session.userId;
  const mine = await reviewModel.findMine(userId, type, target.targetId);
  const state = await eligibility(userId, type, target);
  if (state !== 'ok' && !(mine && state !== 'cancelled')) {
    const why = {
      need_ticket: type === 'event'
        ? 'Only people who bought a ticket for this event can review it.'
        : 'Only people who attended one of this organiser\'s events can review them.',
      not_yet: 'You can leave a review after the event has taken place.',
      cancelled: 'This event was cancelled, so it cannot be reviewed.',
    }[state] || 'You cannot review this yet.';
    return res.status(403).json({ error: why });
  }

  await reviewModel.upsert({ reviewerId: userId, type, targetId: target.targetId, rating, comment });
  res.json({ message: mine ? 'Your review was updated.' : 'Thank you! Your review was posted.' });
}

// The writer can remove their own review; an administrator can remove any (moderation)
async function remove(req, res) {
  const review = await reviewModel.findById(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found.' });
  if (review.reviewer_id !== req.session.userId && req.session.role !== 'admin') {
    return res.status(403).json({ error: 'You can only remove your own reviews.' });
  }
  await reviewModel.remove(review.review_id);
  res.json({ message: 'Review removed.' });
}

// Organiser: everything said about them and their events
async function received(req, res) {
  const organiserId = req.session.userId;
  const [about, data] = await Promise.all([
    reviewModel.summary('organiser', organiserId),
    reviewModel.receivedBy(organiserId),
  ]);

  // overall score across the organiser's own reviews and all their event reviews
  const all = data.reviews;
  const overall = all.length
    ? Math.round((all.reduce((sum, r) => sum + r.rating, 0) / all.length) * 10) / 10
    : 0;

  res.json({
    overall: { average: overall, count: all.length },
    organiser: about,
    events: data.events.map((e) => ({
      event_id: e.event_id, title: e.title,
      count: Number(e.n), average: Number(e.n) ? Math.round(Number(e.avg) * 10) / 10 : 0,
    })),
    reviews: all.map((r) => ({
      review_id: r.review_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: displayName(r.reviewer_name),
      about: r.target_type === 'event' ? r.event_title : 'You (organiser)',
      event_id: r.target_type === 'event' ? r.event_id : null,
    })),
  });
}

module.exports = { list, save, remove, received };