// src/models/event.model.js
const { pool } = require('../config/db');

// Per-event ticket statistics, used to work out the poster state:
// open / sold_out / coming_soon / closed / cancelled
const STATS_JOIN = `
  JOIN users u ON u.user_id = e.organiser_id
  LEFT JOIN (
    SELECT event_id,
           COUNT(*) AS cat_count,
           SUM(quota) AS total_quota,
           MIN(price) AS min_price,
           MIN(sales_start) AS first_start,
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
  u.name AS organiser_name,
  COALESCE(cs.cat_count, 0) AS cat_count,
  COALESCE(cs.total_quota, 0) AS total_quota,
  cs.min_price AS min_price,
  cs.first_start AS first_start,
  COALESCE(cs.not_started, 0) AS not_started,
  COALESCE(cs.ended, 0) AS ended,
  COALESCE(sd.sold, 0) AS sold`;

// Adds sales_status ('open' | 'sold_out' | 'coming_soon' | 'closed' | 'cancelled') and tickets_left
function withStatus(ev) {
  if (!ev) return null;
  const cats = Number(ev.cat_count);
  const quota = Number(ev.total_quota);
  const sold = Number(ev.sold);

  let salesStatus = 'open';
  if (ev.status === 'cancelled') {
    salesStatus = 'cancelled';
  } else if (new Date(ev.event_date) < new Date() || (cats > 0 && Number(ev.ended) === cats)) {
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

async function cancelEvent(eventId) {
  await pool.query(
    "UPDATE events SET status = 'cancelled' WHERE event_id = ?",
    [eventId]
  );
}

// Public list. Cancelled events stay visible (clearly marked) so people who
// heard about them can see what happened instead of wondering.
// Name, location, category and organiser filters are all optional and can be combined.
async function findPublishedEvents({ search, location, category, organiser, organiserId } = {}) {
  let query = `SELECT ${STATS_COLS} FROM events e ${STATS_JOIN} WHERE e.status IN ('published', 'cancelled')`;
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
  if (organiser) {
    query += ' AND u.name LIKE ?';
    params.push(`%${organiser}%`);
  }
  if (organiserId) {
    query += ' AND e.organiser_id = ?';
    params.push(organiserId);
  }

  // events you can still act on first; past and cancelled ones last
  query += ' ORDER BY ((e.event_date < NOW()) OR e.status = \'cancelled\') ASC, e.event_date ASC';

  const [rows] = await pool.query(query, params);
  return rows.map(withStatus);
}

// Slider content. Only events a person can still do something about:
// upcoming, published, and either on sale or about to go on sale.
//   featured = chosen for promotion (is_featured = 1)
//   trending = most tickets sold so far
//   recent   = most recently added
async function findHighlights({ location } = {}) {
  let query = `SELECT ${STATS_COLS} FROM events e ${STATS_JOIN}
               WHERE e.status = 'published' AND e.event_date >= NOW()`;
  const params = [];
  if (location) {
    query += ' AND (e.venue LIKE ? OR e.region LIKE ?)';
    params.push(`%${location}%`, `%${location}%`);
  }

  const [rows] = await pool.query(query, params);
  const live = rows.map(withStatus).filter((ev) => ev.sales_status === 'open' || ev.sales_status === 'coming_soon');

  const byDate = (a, b) => new Date(a.event_date) - new Date(b.event_date);
  const featured = live.filter((ev) => ev.is_featured).sort(byDate).slice(0, 6);
  const trending = live
    .filter((ev) => Number(ev.sold) > 0)
    .sort((a, b) => Number(b.sold) - Number(a.sold) || byDate(a, b))
    .slice(0, 6);
  const recent = [...live].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

  return { featured, trending, recent };
}
// An attendee's saved events, with the same poster state as everywhere else.
// Upcoming ones first; closed and cancelled ones stay listed (marked) at the bottom.
async function findSavedEvents(userId) {
  const query = `SELECT ${STATS_COLS} FROM events e ${STATS_JOIN}
                 JOIN saved_events sv ON sv.event_id = e.event_id AND sv.user_id = ?
                 WHERE e.status IN ('published', 'cancelled')
                 ORDER BY ((e.event_date < NOW()) OR e.status = 'cancelled') ASC, e.event_date ASC`;
  const [rows] = await pool.query(query, [userId]);
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

module.exports = {
  createEvent, findEventsByOrganiser, findEventById, publishEvent, cancelEvent,
  findPublishedEvents, findHighlights, findSavedEvents, updateEvent,
};