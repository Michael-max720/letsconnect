// src/models/admin.model.js
const { pool } = require('../config/db');

async function findPendingApprovals() {
  const [rows] = await pool.query(
    `SELECT user_id, name, email, phone, role, date_registered
     FROM users WHERE status = 'pending_approval'
     ORDER BY date_registered ASC`
  );
  return rows;
}

async function approveUser(userId) {
  await pool.query(
    "UPDATE users SET status = 'active' WHERE user_id = ? AND status = 'pending_approval'",
    [userId]
  );
}

async function rejectUser(userId) {
  await pool.query(
    "UPDATE users SET status = 'suspended' WHERE user_id = ? AND status = 'pending_approval'",
    [userId]
  );
}

async function platformStats() {
  const [[{ totalOrganisers }]] = await pool.query(
    "SELECT COUNT(*) AS totalOrganisers FROM users WHERE role = 'organiser' AND status = 'active'"
  );
  const [[{ pendingCount }]] = await pool.query(
    "SELECT COUNT(*) AS pendingCount FROM users WHERE status = 'pending_approval'"
  );
  const [[{ liveEvents }]] = await pool.query(
    "SELECT COUNT(*) AS liveEvents FROM events WHERE status = 'published'"
  );
  const [[{ platformRevenue }]] = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS platformRevenue FROM transactions WHERE payment_status = 'confirmed'"
  );
  return { totalOrganisers, pendingCount, liveEvents, platformRevenue };
}

module.exports = { findPendingApprovals, approveUser, rejectUser, platformStats };