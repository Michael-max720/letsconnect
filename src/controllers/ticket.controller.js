// src/controllers/ticket.controller.js
const ticketModel = require('../models/ticket.model');
const { generateQrDataUrl } = require('../utils/qrcode.util');

async function getMyTickets(req, res) {
  const tickets = await ticketModel.findByBuyer(req.session.userId);
  res.json({ tickets });
}

async function getTicket(req, res) {
  const ticket = await ticketModel.findByIdWithDetails(req.params.ticketId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  // ownership check — same pattern as event/ticket-category ownership,
  // just checking buyer_id instead of organiser_id
  if (ticket.buyer_id !== req.session.userId) {
    return res.status(403).json({ error: 'This is not your ticket.' });
  }

  const qrCode = await generateQrDataUrl(ticket.qr_code_token);
  res.json({ ticket, qrCode });
}

module.exports = { getMyTickets, getTicket };