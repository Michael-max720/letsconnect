// src/controllers/auth.controller.js
const userModel = require('../models/user.model');
const { generateOtp } = require('../utils/otp.util');

async function register(req, res) {
  const { name, password, role } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').replace(/[\s-]/g, '');
  const username = String(req.body.username || '').trim();

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'Name, email, phone number and password are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!/^(\+?254|0)?[17]\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Please enter a valid Kenyan phone number, e.g. 0712 345 678.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (username && !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 letters, numbers or underscores.' });
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  if (username && await userModel.findByUsername(username)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  // Public sign-up may only create attendee or organiser accounts.
  // (Admins are created by hand; gate agents are created by organisers.)
  const safeRole = ['attendee', 'organiser'].includes(role) ? role : 'attendee';

  const userId = await userModel.createUser({
    name, username, email, phone, password, role: safeRole,
  });

  const { code, expiresAt } = generateOtp();
  await userModel.setOtp(userId, code, expiresAt);

  // Module C will replace this with a real email/SMS send.
  // For now we log it so you can test the flow end to end.
  console.log(`[DEV ONLY] OTP for ${email}: ${code}`);

  res.status(201).json({ message: 'Account created. Check your email for a verification code.', userId });
}

async function verifyOtp(req, res) {
  const { userId, code } = req.body;

  const user = await userModel.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.otp_code !== code) {
    return res.status(400).json({ error: 'Incorrect code.' });
  }
  if (new Date(user.otp_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Code expired. Request a new one.' });
  }

  const newStatus = await userModel.verifyOtpAndActivate(userId);
  res.json({ message: 'Account verified.', status: newStatus });
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const passwordMatches = await userModel.comparePassword(password, user.password_hash);
  if (!passwordMatches) return res.status(401).json({ error: 'Invalid email or password.' });

  if (user.status === 'pending_verification') {
    return res.status(403).json({ error: 'Please verify your account first.' });
  }
  if (user.status === 'pending_approval') {
    return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
  }

  // this is what requireAuth and requireRole check on every later request
  req.session.userId = user.user_id;
  req.session.role = user.role;
  if (req.body.rememberMe) {
  req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
}

  res.json({ message: 'Logged in.', role: user.role });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
}
async function resendOtp(req, res) {
  const { userId } = req.body;
  const user = await userModel.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { code, expiresAt } = generateOtp();
  await userModel.setOtp(userId, code, expiresAt);

  const { sendOtpEmail } = require('../utils/email.util');
  try {
    await sendOtpEmail({ toEmail: user.email, code });
  } catch (emailErr) {
    console.error('OTP email failed to send:', emailErr.message);
    console.log(`[DEV ONLY fallback] OTP for ${user.email}: ${code}`);
  }

  res.json({ message: 'A new code has been sent.' });
}
async function getCurrentUser(req, res) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  const user = await userModel.findById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });
    res.json({ userId: user.user_id, name: user.name, username: user.username, email: user.email, role: user.role });
}
async function requestPasswordReset(req, res) {
  const { email } = req.body;
  const user = await userModel.findByEmail(email);
  // Always return success, even if no account matches — this stops someone
  // from using this form to discover which emails have accounts.
  if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });

  const { code, expiresAt } = generateOtp();
  await userModel.setResetToken(user.user_id, code, expiresAt);
  console.log(`[DEV ONLY] Password reset code for ${email}: ${code}`);
  res.json({ message: 'If that email exists, a reset code has been sent.', userId: user.user_id });
}

async function confirmPasswordReset(req, res) {
  const { userId, code, newPassword } = req.body;
  const user = await userModel.findById(userId);
  if (!user || user.otp_code !== code) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  if (new Date(user.otp_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Code expired. Request a new one.' });
  }
  await userModel.resetPassword(userId, newPassword);
  res.json({ message: 'Password updated. You can now log in.' });
}
module.exports = { register, verifyOtp, login, logout, resendOtp, getCurrentUser, requestPasswordReset, confirmPasswordReset };