// src/controllers/admin.controller.js
const adminModel = require('../models/admin.model');

async function listPendingApprovals(req, res) {
  const pending = await adminModel.findPendingApprovals();
  res.json({ pending });
}

async function approveOrganiser(req, res) {
  await adminModel.approveUser(req.params.userId);
  res.json({ message: 'User approved.' });
}

async function rejectOrganiser(req, res) {
  await adminModel.rejectUser(req.params.userId);
  res.json({ message: 'User rejected.' });
}

async function getDashboardStats(req, res) {
  const stats = await adminModel.platformStats();
  res.json({ stats });
}

module.exports = { listPendingApprovals, approveOrganiser, rejectOrganiser, getDashboardStats };