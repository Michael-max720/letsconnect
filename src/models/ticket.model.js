// src/models/ticket.model.js
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function countSoldForCategory(categoryId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS sold FROM tickets
     WHERE category_id = ? AND status IN ('reserved', 'paid', 'issued', 'used')`,
    [categoryId]
  );
  return rows[0].sold;
}

async function reserveTickets({ categoryId, buyerId, quantity }) {
  const ticketIds = [];
  for (let i = 0; i < quantity; i++) {
    const qrToken = uuidv4();
    const [result] = await pool.query(
      `INSERT INTO tickets (category_id, buyer_id, qr_code_token, status)
       VALUES (?, ?, ?, 'reserved')`,
      [categoryId, buyerId, qrToken]
    );
    ticketIds.push(result.insertId);
  }
  return ticketIds;
}

async function attachTransaction(ticketIds, transactionId) {
  await pool.query(
    `UPDATE tickets SET transaction_id = ? WHERE ticket_id IN (?)`,
    [transactionId, ticketIds]
  );
}

async function findByBuyer(buyerId) {
  const [rows] = await pool.query(
    `SELECT t.*, tc.name AS category_name, tc.price, e.title AS event_title, e.event_date, e.venue
     FROM tickets t
     JOIN ticket_categories tc ON t.category_id = tc.category_id
     JOIN events e ON tc.event_id = e.event_id
     WHERE t.buyer_id = ?
     ORDER BY t.issued_date DESC`,
    [buyerId]
  );
  return rows;
}
async function findByIdWithDetails(ticketId) {
  const [rows] = await pool.query(
    `SELECT t.*, tc.name AS category_name, tc.price, e.title AS event_title, e.event_date, e.venue, e.cover_image_url
     FROM tickets t
     JOIN ticket_categories tc ON t.category_id = tc.category_id
     JOIN events e ON tc.event_id = e.event_id
     WHERE t.ticket_id = ?`,
    [ticketId]
  );
  return rows[0] || null;
}

async function findByQrToken(qrToken) {
  const [rows] = await pool.query(
    `SELECT t.*, e.title AS event_title, e.event_date
     FROM tickets t
     JOIN ticket_categories tc ON t.category_id = tc.category_id
     JOIN events e ON tc.event_id = e.event_id
     WHERE t.qr_code_token = ?`,
    [qrToken]
  );
  return rows[0] || null;
}

async function markUsed(ticketId) {
  await pool.query(
    "UPDATE tickets SET status = 'used', used_at = NOW() WHERE ticket_id = ?",
    [ticketId]
  );
}

module.exports = { countSoldForCategory, reserveTickets, attachTransaction, findByBuyer, findByIdWithDetails, findByQrToken, markUsed };