const organiserAgentModel = require('../models/organiserAgent.model');
const userModel = require('../models/user.model');
const eventModel = require('../models/event.model');

async function createAgent(req, res) {
  const { name, email, phone, password, eventId } = req.body;
  if (!name || !email || !password || !eventId) {
    return res.status(400).json({ error: 'name, email, password and eventId are required.' });
  }
  const event = await eventModel.findEventById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (event.organiser_id !== req.session.userId) {
    return res.status(403).json({ error: 'You do not own this event.' });
  }
  const existing = await userModel.findByEmail(email);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const userId = await organiserAgentModel.createAgentAccount({
    name, email, phone, password, organiserId: req.session.userId, eventId,
  });
  res.status(201).json({ message: 'Gate agent account created and sent for admin approval.', userId });
}

async function listAgents(req, res) {
  const agents = await organiserAgentModel.listAgentsForOrganiser(req.session.userId);
  res.json({ agents });
}

async function eventReport(req, res) {
  const report = await organiserAgentModel.eventPerformanceReport(req.session.userId);
  res.json({ report });
}

async function agentReport(req, res) {
  const report = await organiserAgentModel.agentPerformanceReport(req.session.userId);
  res.json({ report });
}

module.exports = { createAgent, listAgents, eventReport, agentReport };