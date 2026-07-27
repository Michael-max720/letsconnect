// src/models/transaction.model.js
const { pool } = require('../config/db');

async function createTransaction({ buyerId, amount, paymentMethod }) {
  const [result] = await pool.query(
    `INSERT INTO transactions (buyer_id, amount, payment_method, payment_status)
     VALUES (?, ?, ?, 'pending')`,
    [buyerId, amount, paymentMethod]
  );
  return result.insertId;
}

async function markConfirmed(transactionId, mpesaReceipt) {
  await pool.query(
    `UPDATE transactions SET payment_status = 'confirmed', mpesa_receipt = ? WHERE transaction_id = ?`,
    [mpesaReceipt, transactionId]
  );
}

async function markFailed(transactionId) {
  await pool.query(
    `UPDATE transactions SET payment_status = 'failed' WHERE transaction_id = ?`,
    [transactionId]
  );
}

async function findById(transactionId) {
  const [rows] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ?', [transactionId]);
  return rows[0] || null;
}
async function attachCheckoutRequestId(transactionId, checkoutRequestId) {
  await pool.query(
    `UPDATE transactions SET mpesa_checkout_request_id = ? WHERE transaction_id = ?`,
    [checkoutRequestId, transactionId]
  );
}

async function findByCheckoutRequestId(checkoutRequestId) {
  const [rows] = await pool.query(
    'SELECT * FROM transactions WHERE mpesa_checkout_request_id = ?',
    [checkoutRequestId]
  );
  return rows[0] || null;
}

module.exports = { createTransaction, markConfirmed, markFailed, findById, attachCheckoutRequestId, findByCheckoutRequestId };