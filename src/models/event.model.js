// src/models/event.model.js
const { pool } = require('../config/db');

// Per-event ticket statistics, used to work out Open / Sold out / Coming soon / Closed.
const STATS_JOIN = `
  LEFT JOIN (
    SELECT event_id,
           COUNT(*) AS cat_count,
           SUM(quota) AS total_quota,
           SUM(sales_start IS NOT NULL AND sales_start > NOW()) AS not_started,
           SUM(sales_end IS NOT NULL AND sales_end < NOW()) AS ended
    FROM ticket_categories
    GROUP BY event_id
  ) cs ON cs.event_id = e.event_id
  LEFT JOIN (
    SELECT tc.event_id, COUNT(*) AS sold
    FROM tickets t
    JOIN ticket_categories tc ON t.category_id = tc.category_id
    WHERE t.status IN ('reserved', 'paid', 'issued', 'used')
    GROUP BY tc.event_id
  ) sd ON sd.event_id = e.event_id`;

const STATS_COLS = `e.*,
  COALESCE(cs.cat_count, 0) AS cat_count,
  COALESCE(cs.total_quota, 0) AS total_quota,
  COALESCE(cs.not_started, 0) AS not_started,
  COALESCE(cs.ended, 0) AS ended,
  COALESCE(sd.sold, 0) AS sold`;

// Adds sales_status ('open' | 'sold_out' | 'coming_soon' | 'closed') and tickets_left
function withStatus(ev) {
  if (!ev) return null;
  const cats = Number(ev.cat_count);
  const quota = Number(ev.total_quota);
  const sold = Number(ev.sold);

  let salesStatus = 'open';
  if (ev.status === 'cancelled' || new Date(ev.event_date) < new Date() || (cats > 0 && Number(ev.ended) === cats)) {
    salesStatus = 'closed';
  } else if (cats === 0 || Number(ev.not_started) === cats) {
    salesStatus = 'coming_soon';
  } else if (sold >= quota) {
    salesStatus = 'sold_out';
  }
  return { ...ev, sales_status: salesStatus, tickets_left: Math.max(quota - sold, 0) };
}

async function createEvent({ organiserId, title, description, category, venue, region, ageMin, familyFriendly, eventDate, coverImageUrl }) {
  const [result] = await pool.query(
    `INSERT INTO events (organiser_id, title, description, category, venue, region, age_min, family_friendly, event_date, cover_image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [organiserId, title, description || null, category || null, venue || null, region || null,
     ageMin || 0, familyFriendly ? 1 : 0, eventDate, coverImageUrl || null]
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
  const [rows] = await pool.query(
    `SELECT ${STATS_COLS} FROM events e ${STATS_JOIN} WHERE e.event_id = ?`,
    [eventId]
  );
  return withStatus(rows[0]);
}

async function publishEvent(eventId) {
  await pool.query(
    "UPDATE events SET status = 'published' WHERE event_id = ?",
    [eventId]
  );
}

// Name, location and category filters are all optional and can be combined.
async function findPublishedEvents({ search, location, category } = {}) {
  let query = `SELECT ${STATS_COLS} FROM events e ${STATS_JOIN} WHERE e.status = 'published'`;
  const params = [];

  if (search) {
    query += ' AND e.title LIKE ?';
    params.push(`%${search}%`);
  }
  if (location) {
    query += ' AND (e.venue LIKE ? OR e.region LIKE ?)';
    params.push(`%${location}%`, `%${location}%`);
  }
  if (category) {
    query += ' AND e.category = ?';
    params.push(category);
  }

  // upcoming events first, past events last
  query += ' ORDER BY (e.event_date < NOW()) ASC, e.event_date ASC';

  const [rows] = await pool.query(query, params);
  return rows.map(withStatus);
}

async function updateEvent(eventId, { title, description, category, venue, region, ageMin, familyFriendly, eventDate, coverImageUrl }) {
  await pool.query(
    `UPDATE events SET title = ?, description = ?, category = ?, venue = ?, region = ?,
            age_min = ?, family_friendly = ?, event_date = ?, cover_image_url = ?
     WHERE event_id = ?`,
    [title, description || null, category || null, venue || null, region || null,
     ageMin || 0, familyFriendly ? 1 : 0, eventDate, coverImageUrl || null, eventId]
  );
}

module.exports = { createEvent, findEventsByOrganiser, findEventById, publishEvent, findPublishedEvents, updateEvent };