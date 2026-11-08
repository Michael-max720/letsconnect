// src/utils/otp.util.js
const crypto = require('crypto');

function generateOtp() {
  // crypto.randomInt is cryptographically secure, unlike Math.random(),
  // so the code cannot be predicted from earlier codes.
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // valid for 10 minutes
  return { code, expiresAt };
}

module.exports = { generateOtp };