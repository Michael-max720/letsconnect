// src/utils/otp.util.js

function generateOtp() {
  // Math.random() gives 0–1, we scale it to a 6-digit number
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // valid for 10 minutes
  return { code, expiresAt };
}

module.exports = { generateOtp };