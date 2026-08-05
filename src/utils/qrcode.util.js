// src/utils/qrcode.util.js
const QRCode = require('qrcode');

async function generateQrDataUrl(token) {
  // returns a base64 image (data URL) that can go straight into an <img src="...">
  // or be attached to an email, with no separate file to manage
  return QRCode.toDataURL(token);
}

module.exports = { generateQrDataUrl };