// Module A1: Express app setup.
// This file wires up middleware and routes. src/server.js is what actually
// starts listening — kept separate so the app itself is easy to test later.
const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// --- Core middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('./config/db');
const sessionStore = new MySQLStore({}, pool);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));



// --- Module B routes will be mounted here as they're built ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/ticket-categories', require('./routes/ticketCategory.routes'));

module.exports = app;
