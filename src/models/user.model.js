// src/models/user.model.js
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function createUser({ name, email, phone, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10); // 10 = hashing cost, higher = slower but more secure
  const [result] = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, phone, passwordHash, role]
  );
  return result.insertId;
}

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(userId) {
  const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function setOtp(userId, code, expiresAt) {
  await pool.query(
    'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE user_id = ?',
    [code, expiresAt, userId]
  );
}

async function verifyOtpAndActivate(userId) {
  // Organiser and Gate Agent still need Admin approval after this;
  // Attendee and Admin become fully active immediately.
  const user = await findById(userId);
  const nextStatus = ['organiser', 'gate_agent'].includes(user.role)
    ? 'pending_approval'
    : 'active';
  await pool.query(
    `UPDATE users SET status = ?, otp_code = NULL, otp_expires_at = NULL
     WHERE user_id = ?`,
    [nextStatus, userId]
  );
  return nextStatus;
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
async function setResetToken(userId, code, expiresAt) {
  await pool.query(
    'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE user_id = ?',
    [code, expiresAt, userId]
  );
}

async function resetPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE users SET password_hash = ?, otp_code = NULL, otp_expires_at = NULL WHERE user_id = ?',
    [passwordHash, userId]
  );
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  setOtp,
  verifyOtpAndActivate,
  comparePassword,
  setResetToken,
  resetPassword,
};