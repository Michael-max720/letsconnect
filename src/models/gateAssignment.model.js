const { pool } = require('../config/db');

async function inviteAgent({ eventId, gateAgentEmail, invitedBy }) {
  const [agentRows] = await pool.query(
    "SELECT user_id FROM users WHERE email = ? AND role = 'gate_agent'", [gateAgentEmail]
  );
  if (agentRows.length === 0) {
    throw new Error('No gate agent account exists with that email. Ask them to register first.');
  }
  const gateAgentId = agentRows[0].user_id;
  await pool.query(
    `INSERT INTO event_gate_agents (event_id, gate_agent_id, invited_by, status)
     VALUES (?, ?, ?, 'pending_admin')`,
    [eventId, gateAgentId, invitedBy]
  );
}

async function isAgentActiveForEvent(gateAgentId, eventId) {
  const [rows] = await pool.query(
    "SELECT 1 FROM event_gate_agents WHERE gate_agent_id = ? AND event_id = ? AND status = 'active'",
    [gateAgentId, eventId]
  );
  return rows.length > 0;
}

async function findPendingAssignments() {
  const [rows] = await pool.query(
    `SELECT ega.assignment_id, u.name AS agent_name, u.email AS agent_email, e.title AS event_title
     FROM event_gate_agents ega
     JOIN users u ON ega.gate_agent_id = u.user_id
     JOIN events e ON ega.event_id = e.event_id
     WHERE ega.status = 'pending_admin'`
  );
  return rows;
}

async function approveAssignment(assignmentId) {
  await pool.query("UPDATE event_gate_agents SET status = 'active' WHERE assignment_id = ?", [assignmentId]);
}

async function rejectAssignment(assignmentId) {
  await pool.query("UPDATE event_gate_agents SET status = 'revoked' WHERE assignment_id = ?", [assignmentId]);
}

async function findAssignmentsForAgent(gateAgentId) {
  const [rows] = await pool.query(
    `SELECT e.event_id, e.title FROM event_gate_agents ega
     JOIN events e ON ega.event_id = e.event_id
     WHERE ega.gate_agent_id = ? AND ega.status = 'active'`,
    [gateAgentId]
  );
  return rows;
}

module.exports = { inviteAgent, isAgentActiveForEvent, findPendingAssignments, approveAssignment, rejectAssignment, findAssignmentsForAgent };