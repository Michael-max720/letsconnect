// src/models/event.model.js
const { pool } = require('../config/db');

async function createEvent({ organiserId, title, description, category, venue, eventDate, coverImageUrl }) {
  const [result] = await pool.query(
    `INSERT INTO events (organiser_id, title, description, category, venue, event_date, cover_image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [organiserId, title, description, category, venue, eventDate, coverImageUrl || null]
  );
  return result.insertId;
}

async function findEventsByOrganiser(organiserId) {
  const [rows] = await pool.query(
    'SELECT * FROM events WHERE organiser_id = ? ORDER BY created_at DESC',
    [organiserId]
  );
  return rows;
}

async function findEventById(eventId) {
  const [rows] = await pool.query('SELECT * FROM events WHERE event_id = ?', [eventId]);
  return rows[0] || null;
}
async function publishEvent(eventId) {
  await pool.query(
    "UPDATE events SET status = 'published' WHERE event_id = ?",
    [eventId]
  );
}
async function findPublishedEvents({ search, category } = {}) {
  let query = "SELECT * FROM events WHERE status = 'published'";
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR venue LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY event_date ASC';

  const [rows] = await pool.query(query, params);
  return rows;
}

module.exports = { createEvent, findEventsByOrganiser, findEventById, publishEvent, findPublishedEvents };