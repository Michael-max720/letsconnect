// src/models/review.model.js
// Reviews of an event, of an organiser, or of the platform itself.
// target_id is the event id or the organiser's user id; it is 0 for the platform.
const { pool } = require('../config/db');

async function summary(type, targetId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n, AVG(rating) AS avg,
            SUM(rating = 5) AS r5, SUM(rating = 4) AS r4, SUM(rating = 3) AS r3,
            SUM(rating = 2) AS r2, SUM(rating = 1) AS r1
     FROM reviews WHERE target_type = ? AND target_id = ?`,
    [type, targetId]
  );
  const r = rows[0];
  const n = Number(r.n);
  return {
    count: n,
    average: n ? Math.round(Number(r.avg) * 10) / 10 : 0,
    breakdown: { 5: Number(r.r5 || 0), 4: Number(r.r4 || 0), 3: Number(r.r3 || 0), 2: Number(r.r2 || 0), 1: Number(r.r1 || 0) },
  };
}

async function list(type, targetId, limit = 50) {
  const [rows] = await pool.query(
    `SELECT r.review_id, r.reviewer_id, r.rating, r.comment, r.created_at, r.updated_at,
            u.name AS reviewer_name
     FROM reviews r JOIN users u ON u.user_id = r.reviewer_id
     WHERE r.target_type = ? AND r.target_id = ?
     ORDER BY r.created_at DESC, r.review_id DESC
     LIMIT ?`,
    [type, targetId, limit]
  );
  return rows;
}

async function findMine(reviewerId, type, targetId) {
  const [rows] = await pool.query(
    'SELECT review_id, rating, comment FROM reviews WHERE reviewer_id = ? AND target_type = ? AND target_id = ?',
    [reviewerId, type, targetId]
  );
  return rows[0] || null;
}

// One review per person per target: writing again replaces the earlier one
async function upsert({ reviewerId, type, targetId, rating, comment }) {
  await pool.query(
    `INSERT INTO reviews (reviewer_id, target_type, target_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
    [reviewerId, type, targetId, rating, comment || null]
  );
}

async function findById(reviewId) {
  const [rows] = await pool.query('SELECT * FROM reviews WHERE review_id = ?', [reviewId]);
  return rows[0] || null;
}

async function remove(reviewId) {
  await pool.query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);
}

// Tickets this person paid for at one event
async function ticketsForEvent(userId, eventId) {
  const [rows] = await pool.query(
    `SELECT t.status FROM tickets t
     JOIN ticket_categories tc ON tc.category_id = t.category_id
     WHERE t.buyer_id = ? AND tc.event_id = ? AND t.status IN ('paid', 'issued', 'used')`,
    [userId, eventId]
  );
  return rows;
}

// Tickets this person paid for at any (not cancelled) event of one organiser
async function ticketsForOrganiser(userId, organiserId) {
  const [rows] = await pool.query(
    `SELECT t.status, e.event_date FROM tickets t
     JOIN ticket_categories tc ON tc.category_id = t.category_id
     JOIN events e ON e.event_id = tc.event_id
     WHERE t.buyer_id = ? AND e.organiser_id = ? AND e.status <> 'cancelled'
       AND t.status IN ('paid', 'issued', 'used')`,
    [userId, organiserId]
  );
  return rows;
}

// Everything said about an organiser and their events (for the organiser's own page)
async function receivedBy(organiserId) {
  const [reviews] = await pool.query(
    `SELECT r.review_id, r.reviewer_id, r.target_type, r.rating, r.comment, r.created_at,
            u.name AS reviewer_name, e.title AS event_title, e.event_id
     FROM reviews r
     JOIN users u ON u.user_id = r.reviewer_id
     LEFT JOIN events e ON r.target_type = 'event' AND e.event_id = r.target_id
     WHERE (r.target_type = 'organiser' AND r.target_id = ?)
        OR (r.target_type = 'event' AND e.organiser_id = ?)
     ORDER BY r.created_at DESC, r.review_id DESC
     LIMIT 100`,
    [organiserId, organiserId]
  );
  const [events] = await pool.query(
    `SELECT e.event_id, e.title, COUNT(r.review_id) AS n, AVG(r.rating) AS avg
     FROM events e
     LEFT JOIN reviews r ON r.target_type = 'event' AND r.target_id = e.event_id
     WHERE e.organiser_id = ? AND e.status IN ('published', 'cancelled')
     GROUP BY e.event_id, e.title, e.event_date
     ORDER BY e.event_date DESC`,
    [organiserId]
  );
  return { reviews, events };
}

module.exports = {
  summary, list, findMine, upsert, findById, remove,
  ticketsForEvent, ticketsForOrganiser, receivedBy,
};