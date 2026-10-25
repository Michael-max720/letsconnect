
// src/models/saved.model.js
// Events an attendee has saved (the heart button).
const { pool } = require('../config/db');

// INSERT IGNORE: saving twice is harmless (the pair is the primary key)
async function save(userId, eventId) {
  await pool.query(
    'INSERT IGNORE INTO saved_events (user_id, event_id) VALUES (?, ?)',
    [userId, eventId]
  );
}

async function unsave(userId, eventId) {
  await pool.query(
    'DELETE FROM saved_events WHERE user_id = ? AND event_id = ?',
    [userId, eventId]
  );
}

// Just the ids, so every heart on a page can be filled in with one request
async function listIds(userId) {
  const [rows] = await pool.query(
    'SELECT event_id FROM saved_events WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.event_id);
}

module.exports = { save, unsave, listIds };