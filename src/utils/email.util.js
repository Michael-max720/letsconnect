// src/utils/email.util.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendTicketConfirmation({ toEmail, eventTitle, eventDate, venue, ticketId }) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: `Your ticket for ${eventTitle}`,
    html: `
      <h2>Payment confirmed</h2>
      <p>Your ticket for <strong>${eventTitle}</strong> is ready.</p>
      <p>Date: ${eventDate}<br>Venue: ${venue}</p>
      <p>View your QR-coded ticket by logging into Lets Connect and visiting My Tickets.</p>
      <p>Ticket ID: ${ticketId}</p>
    `,
  });
}
async function sendOtpEmail({ toEmail, code, userId }) {
  // One-tap link: opens the verify page with the email and code already filled in.
  // Set APP_URL in .env (for example your ngrok domain) so the link works from a phone.
  const base = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  const link = `${base}/verify.html?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(toEmail)}&code=${encodeURIComponent(code)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: 'Your Lets Connect verification code',
    html: `
      <h2>Verify your account</h2>
      <p>Your 6-digit verification code is:</p>
      <p style="font-size:28px; font-weight:bold; letter-spacing:4px;">${code}</p>
      <p><a href="${link}" style="display:inline-block; padding:12px 22px; background:#1F3864; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Verify my account</a></p>
      <p>This code expires in 10 minutes. If you did not create an account, ignore this email.</p>
    `,
  });
}

module.exports = { sendTicketConfirmation, sendOtpEmail };