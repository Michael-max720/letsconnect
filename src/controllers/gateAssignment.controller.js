const gateAssignmentModel = require('../models/gateAssignment.model');
const eventModel = require('../models/event.model');

async function invite(req, res) {
  const { eventId, gateAgentEmail } = req.body;
  const event = await eventModel.findEventById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (event.organiser_id !== req.session.userId) {
    return res.status(403).json({ error: 'You do not own this event.' });
  }
  try {
    await gateAssignmentModel.inviteAgent({ eventId, gateAgentEmail, invitedBy: req.session.userId });
    res.status(201).json({ message: 'Invitation sent. Awaiting admin approval.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function listPending(req, res) {
  const pending = await gateAssignmentModel.findPendingAssignments();
  res.json({ pending });
}

async function approve(req, res) {
  await gateAssignmentModel.approveAssignment(req.params.assignmentId);
  res.json({ message: 'Assignment approved.' });
}

async function reject(req, res) {
  await gateAssignmentModel.rejectAssignment(req.params.assignmentId);
  res.json({ message: 'Assignment rejected.' });
}

async function myEvents(req, res) {
  const events = await gateAssignmentModel.findAssignmentsForAgent(req.session.userId);
  res.json({ events });
}

module.exports = { invite, listPending, approve, reject, myEvents };