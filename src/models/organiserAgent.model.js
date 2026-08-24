const { pool } = require('../config/db');
const userModel = require('./user.model');

async function createAgentAccount({ name, email, phone, password, organiserId, eventId }) {
  const userId = await userModel.createUser({ name, email, phone, password, role: 'gate_agent' });
  // Organiser-created accounts skip email OTP; go straight to admin review.
  await pool.query("UPDATE users SET status = 'pending_approval' WHERE user_id = ?", [userId]);
  await pool.query(
    `INSERT INTO event_gate_agents (event_id, gate_agent_id, invited_by, status)
     VALUES (?, ?, ?, 'pending_admin')`,
    [eventId, userId, organiserId]
  );
  return userId;
}

async function listAgentsForOrganiser(organiserId) {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.name, u.email, u.status AS account_status,
       GROUP_CONCAT(DISTINCT CONCAT(e.title, ' (', ega.status, ')') SEPARATOR ', ') AS events
     FROM users u
     JOIN event_gate_agents ega ON u.user_id = ega.gate_agent_id
     JOIN events e ON ega.event_id = e.event_id
     WHERE e.organiser_id = ?
     GROUP BY u.user_id, u.name, u.email, u.status`,
    [organiserId]
  );
  return rows;
}

async function eventPerformanceReport(organiserId) {
  const [rows] = await pool.query(
    `SELECT e.event_id, e.title, e.status,
       COUNT(DISTINCT t.ticket_id) AS tickets_sold,
       COALESCE(SUM(CASE WHEN t.status IN ('paid','used') THEN tc.price ELSE 0 END), 0) AS revenue,
       SUM(CASE WHEN t.status = 'used' THEN 1 ELSE 0 END) AS attended
     FROM events e
     LEFT JOIN ticket_categories tc ON tc.event_id = e.event_id
     LEFT JOIN tickets t ON t.category_id = tc.category_id AND t.status IN ('paid','used')
     WHERE e.organiser_id = ?
     GROUP BY e.event_id, e.title, e.status`,
    [organiserId]
  );
  return rows;
}

async function agentPerformanceReport(organiserId) {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.name, u.email,
       COUNT(sl.scan_id) AS total_scans,
       SUM(sl.result = 'valid') AS valid_scans,
       SUM(sl.result = 'already_used') AS duplicate_scans
     FROM scan_logs sl
     JOIN users u ON sl.gate_agent_id = u.user_id
     JOIN tickets t ON sl.ticket_id = t.ticket_id
     JOIN ticket_categories tc ON t.category_id = tc.category_id
     JOIN events e ON tc.event_id = e.event_id
     WHERE e.organiser_id = ?
     GROUP BY u.user_id, u.name, u.email`,
    [organiserId]
  );
  return rows;
}

module.exports = { createAgentAccount, listAgentsForOrganiser, eventPerformanceReport, agentPerformanceReport };