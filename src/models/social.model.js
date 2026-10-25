// src/models/social.model.js
// Following organisers and the updates they post.
const { pool } = require('../config/db');

async function findOrganiser(organiserId) {
  const [rows] = await pool.query(
    "SELECT user_id, name FROM users WHERE user_id = ? AND role = 'organiser' AND status = 'active'",
    [organiserId]
  );
  return rows[0] || null;
}

async function countFollowers(organiserId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM follows WHERE organiser_id = ?',
    [organiserId]
  );
  return Number(rows[0].n);
}

async function isFollowing(followerId, organiserId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM follows WHERE follower_id = ? AND organiser_id = ?',
    [followerId, organiserId]
  );
  return rows.length > 0;
}

// INSERT IGNORE: following twice is harmless (the pair is the primary key)
async function follow(followerId, organiserId) {
  await pool.query(
    'INSERT IGNORE INTO follows (follower_id, organiser_id) VALUES (?, ?)',
    [followerId, organiserId]
  );
}

async function unfollow(followerId, organiserId) {
  await pool.query(
    'DELETE FROM follows WHERE follower_id = ? AND organiser_id = ?',
    [followerId, organiserId]
  );
}

async function listFollowing(followerId) {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.name,
            (SELECT COUNT(*) FROM follows f2 WHERE f2.organiser_id = u.user_id) AS followers
     FROM follows f
     JOIN users u ON u.user_id = f.organiser_id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC`,
    [followerId]
  );
  return rows;
}

async function listUpdatesByOrganiser(organiserId, limit = 20) {
  const [rows] = await pool.query(
    `SELECT update_id, event_id, type, title, body, created_at
     FROM organiser_updates
     WHERE organiser_id = ?
     ORDER BY created_at DESC, update_id DESC
     LIMIT ?`,
    [organiserId, limit]
  );
  return rows;
}

// Your updates feed: new activity from organisers you follow (from the moment you followed)
// plus news about events you saved (from the moment you saved them).
async function feedFor(followerId, limit = 50) {
  const [rows] = await pool.query(
    `SELECT ou.update_id, ou.organiser_id, ou.event_id, ou.type, ou.title, ou.body, ou.created_at,
            u.name AS organiser_name
     FROM organiser_updates ou
     JOIN users u ON u.user_id = ou.organiser_id
     LEFT JOIN follows f ON f.organiser_id = ou.organiser_id AND f.follower_id = ?
     LEFT JOIN saved_events s ON s.event_id = ou.event_id AND s.user_id = ?
     WHERE (f.follower_id IS NOT NULL AND ou.created_at >= f.created_at)
        OR (s.user_id IS NOT NULL AND ou.created_at >= s.created_at)
     ORDER BY ou.created_at DESC, ou.update_id DESC
     LIMIT ?`,
    [followerId, followerId, limit]
  );
  return rows;
}

async function createUpdate({ organiserId, eventId, type, title, body }) {
  const [result] = await pool.query(
    `INSERT INTO organiser_updates (organiser_id, event_id, type, title, body)
     VALUES (?, ?, ?, ?, ?)`,
    [organiserId, eventId || null, type || 'post', title, body || null]
  );
  return result.insertId;
}

module.exports = {
  findOrganiser, countFollowers, isFollowing, follow, unfollow,
  listFollowing, listUpdatesByOrganiser, feedFor, createUpdate,
};