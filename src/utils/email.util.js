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
async function sendOtpEmail({ toEmail, code }) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: 'Your Lets Connect verification code',
    html: `
      <h2>Verify your account</h2>
      <p>Your 6-digit verification code is:</p>
      <p style="font-size:28px; font-weight:bold; letter-spacing:4px;">${code}</p>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

module.exports = { sendTicketConfirmation, sendOtpEmail };