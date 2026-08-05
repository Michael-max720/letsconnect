// src/models/scanLog.model.js
const { pool } = require('../config/db');

async function recordScan({ ticketId, gateAgentId, result }) {
  await pool.query(
    `INSERT INTO scan_logs (ticket_id, gate_agent_id, result) VALUES (?, ?, ?)`,
    [ticketId, gateAgentId, result]
  );
}

async function findTodaysScans(gateAgentId) {
  const [rows] = await pool.query(
    `SELECT sl.*, t.qr_code_token
     FROM scan_logs sl
     LEFT JOIN tickets t ON sl.ticket_id = t.ticket_id
     WHERE sl.gate_agent_id = ? AND DATE(sl.scanned_at) = CURDATE()
     ORDER BY sl.scanned_at DESC`,
    [gateAgentId]
  );
  return rows;
}

module.exports = { recordScan, findTodaysScans };