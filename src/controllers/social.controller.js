
// src/controllers/social.controller.js
const social = require('../models/social.model');
const eventModel = require('../models/event.model');

// Public organiser page: name, follower count, whether YOU follow, recent updates
async function profile(req, res) {
  const organiser = await social.findOrganiser(req.params.id);
  if (!organiser) return res.status(404).json({ error: 'Organiser not found.' });

  const viewerId = req.session.userId || null;
  const [followers, following, updates] = await Promise.all([
    social.countFollowers(organiser.user_id),
    viewerId ? social.isFollowing(viewerId, organiser.user_id) : false,
    social.listUpdatesByOrganiser(organiser.user_id, 20),
  ]);

  res.json({
    organiser: { id: organiser.user_id, name: organiser.name },
    followers,
    isFollowing: following,
    viewerRole: req.session.role || null,
    updates,
  });
}

async function follow(req, res) {
  const organiser = await social.findOrganiser(req.params.id);
  if (!organiser) return res.status(404).json({ error: 'Organiser not found.' });
  await social.follow(req.session.userId, organiser.user_id);
  res.json({ following: true, followers: await social.countFollowers(organiser.user_id) });
}

async function unfollow(req, res) {
  const organiserId = Number(req.params.id);
  await social.unfollow(req.session.userId, organiserId);
  res.json({ following: false, followers: await social.countFollowers(organiserId) });
}

async function following(req, res) {
  res.json({ organisers: await social.listFollowing(req.session.userId) });
}

async function feed(req, res) {
  res.json({ updates: await social.feedFor(req.session.userId) });
}

// An organiser posts news to everyone who follows them
async function postUpdate(req, res) {
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  let eventId = req.body.eventId ? Number(req.body.eventId) : null;

  if (!title) return res.status(400).json({ error: 'Please give your update a title.' });
  if (title.length > 160) return res.status(400).json({ error: 'The title must be 160 characters or fewer.' });
  if (body.length > 1000) return res.status(400).json({ error: 'The message must be 1000 characters or fewer.' });

  if (eventId) {
    const event = await eventModel.findEventById(eventId);
    if (!event || event.organiser_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only link updates to your own events.' });
    }
  }

  const updateId = await social.createUpdate({
    organiserId: req.session.userId, eventId, type: 'post', title, body,
  });
  res.status(201).json({ message: 'Update posted to your followers.', updateId });
}

async function myUpdates(req, res) {
  const [followers, updates] = await Promise.all([
    social.countFollowers(req.session.userId),
    social.listUpdatesByOrganiser(req.session.userId, 50),
  ]);
  res.json({ followers, updates });
}

module.exports = { profile, follow, unfollow, following, feed, postUpdate, myUpdates };