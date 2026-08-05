// src/controllers/scan.controller.js
const ticketModel = require('../models/ticket.model');
const scanLogModel = require('../models/scanLog.model');

async function scanTicket(req, res) {
  const { qrToken } = req.body;
  if (!qrToken) return res.status(400).json({ error: 'qrToken is required.' });

  const ticket = await ticketModel.findByQrToken(qrToken);

  // case 1: token doesn't match any ticket at all
  if (!ticket) {
    await scanLogModel.recordScan({
      ticketId: null,
      gateAgentId: req.session.userId,
      result: 'invalid',
    });
    return res.status(404).json({ result: 'invalid', message: 'This ticket is not recognised.' });
  }

  // case 2: ticket exists but was already scanned in
  if (ticket.status === 'used') {
    await scanLogModel.recordScan({
      ticketId: ticket.ticket_id,
      gateAgentId: req.session.userId,
      result: 'already_used',
    });
    return res.status(409).json({
      result: 'already_used',
      message: 'This ticket has already been used.',
      usedAt: ticket.used_at,
    });
  }

  // case 3: ticket exists but was never actually paid for (e.g. still 'reserved')
  if (ticket.status !== 'paid') {
    await scanLogModel.recordScan({
      ticketId: ticket.ticket_id,
      gateAgentId: req.session.userId,
      result: 'invalid',
    });
    return res.status(409).json({ result: 'invalid', message: `Ticket status is '${ticket.status}', not valid for entry.` });
  }

  // case 4: genuinely valid — mark it used
  await ticketModel.markUsed(ticket.ticket_id);
  await scanLogModel.recordScan({
    ticketId: ticket.ticket_id,
    gateAgentId: req.session.userId,
    result: 'valid',
  });

  res.json({
    result: 'valid',
    message: 'Entry approved.',
    eventTitle: ticket.event_title,
  });
}

async function getScanHistory(req, res) {
  const scans = await scanLogModel.findTodaysScans(req.session.userId);
  res.json({ scans });
}

module.exports = { scanTicket, getScanHistory };