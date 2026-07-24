// src/controllers/auth.controller.js
const userModel = require('../models/user.model');
const { generateOtp } = require('../utils/otp.util');

async function register(req, res) {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  // role defaults to 'attendee' if the request didn't specify one
  const userId = await userModel.createUser({
    name, email, phone, password, role: role || 'attendee',
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

  res.json({ message: 'Logged in.', role: user.role });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
}

module.exports = { register, verifyOtp, login, logout };