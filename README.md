# Lets Connect — Online Event and Concert E-Ticketing System

A full-stack e-ticketing prototype for the Kenyan market, built with Node.js,
Express and MySQL on the backend, and a single responsive HTML/CSS/JavaScript
frontend that serves both mobile and desktop from one codebase. Supports
M-Pesa (Safaricom Daraja) payments, QR-coded digital tickets, and four
distinct user roles: Attendee, Organiser, Administrator, and Gate Agent.

## Features by role

**Attendee**
- Register, verify by OTP, log in (with show/hide password and Remember Me)
- Forgot password / reset flow
- Browse and search published events without needing to log in
- View event details and live ticket-category pricing and availability
- Purchase tickets via M-Pesa STK push, with phone numbers accepted with or
  without the `254` country code
- Track payment status in real time and view a QR-coded digital ticket once
  paid
- Verify a held ticket is genuine (read-only check, does not change its
  status)

**Organiser**
- Register (subject to Admin approval), log in, manage a personal dashboard
- Create, edit and publish events, including a cover image URL
- Add, edit and manage ticket categories (name, price, quota) per event
- Create Gate Agent accounts directly, assigning each to a specific event
  (subject to Admin approval of both the account and the event assignment)
- View all Gate Agents working their events and which events each one
  covers
- View event performance reports (tickets sold, revenue, attendance) and
  Gate Agent performance reports (scans, valid vs. duplicate attempts)

**Administrator**
- Log in and view platform-wide statistics (organisers, pending approvals,
  live events, total revenue)
- Approve or reject pending Organiser and Gate Agent accounts
- Approve or reject Organiser-to-Gate-Agent event assignments, providing a
  second layer of trust beyond the account-level approval

**Gate Agent**
- Log in and see which event(s) they are currently authorised to check
  guests in for
- Scan (manually enter) a ticket's QR token to validate entry
- Scanning is restricted to events the agent has an active, admin-approved
  assignment for — an approved Gate Agent account alone is not enough to
  scan tickets for an arbitrary event
- Duplicate scans and unrecognised tokens are rejected and logged
- View a log of the day's scan history

## Tech stack

- **Backend:** Node.js, Express, MySQL (via `mysql2`)
- **Auth:** `express-session` with `express-mysql-session` for persistent
  sessions, `bcryptjs` for password hashing
- **Payments:** Safaricom Daraja API (M-Pesa STK push, sandbox)
- **Tickets:** `qrcode` for signed, UUID-based QR code generation
- **Email:** Nodemailer (SMTP delivery currently unresolved — see
  Known Limitations)
- **Frontend:** Plain HTML/CSS/JavaScript, served as static files by Express,
  no build step or framework

## Prerequisites

- Node.js 18 or later
- XAMPP (or any local MySQL server)
- A free Safaricom Daraja sandbox account, for M-Pesa credentials
- ngrok (or similar), only needed if testing the M-Pesa payment callback
  locally, since Safaricom's sandbox must reach a public URL

## Setup and installation

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the environment file and fill in your own values:
   ```
   copy .env.example .env
   ```
4. Create the database and tables:
   ```
   npm run migrate
   ```
5. Start the server:
   ```
   npm run dev
   ```
6. Visit `http://localhost:3000` in a browser. It redirects to the event
   browsing page.
7. Confirm the server and database are both healthy at any time via:
   ```
   http://localhost:3000/api/health
   ```

### Testing M-Pesa payments locally

Safaricom's sandbox cannot reach `localhost` directly. To test a real STK
push and its callback locally:

1. Run `ngrok http 3000` in a separate terminal.
2. Copy the `https://...ngrok-free.app` (or your account's static domain)
   URL it gives you.
3. Set `MPESA_CALLBACK_URL` in `.env` to that URL plus
   `/api/payments/callback`.
4. Restart the server (`.env` changes require a full restart, not just a
   file save).

## Environment variables

See `.env.example` for the full list, including database credentials,
session secret, M-Pesa Daraja sandbox keys, SMTP settings, and the M-Pesa
callback URL.

## Project structure

```
src/
  config/db.js         Database connection pool
  routes/               One file per resource (auth, events, tickets,
                         payments, admin, gate scanning, gate assignments,
                         organiser agents/reports, ticket categories)
  controllers/           Request handlers, one per route file
  models/                 Query functions per database table
  middleware/             requireAuth / requireRole session guards
  utils/                   OTP generation, M-Pesa Daraja calls, QR code
                            generation, email sending
  app.js                  Express app and middleware wiring
  server.js               Entry point
public/                  Frontend: static HTML/CSS/JS pages, one per screen
migrations/
  schema.sql              Full database schema
  run.js                   Runs schema.sql against the configured database
```

## Known limitations

- **Email delivery is not currently working.** Nodemailer is wired in and
  called at the right points (OTP codes, purchase confirmations, password
  resets), but SMTP authentication is unresolved in this environment. OTP
  and reset codes print to the server console (`[DEV ONLY] ...`) rather
  than arriving by email — this is a configuration issue, not a logic
  defect.
- **Gate Agent scanning uses manual QR-token entry**, not a live camera
  scanner. Camera-based scanning needs a QR-decoding library and HTTPS
  (camera access is blocked on plain HTTP except on `localhost`), and was
  deferred to prioritise a complete backend across all four roles.
- **Not yet deployed to a public host.** The application currently runs on
  `localhost` with an ngrok tunnel used only to expose the M-Pesa callback
  endpoint during testing.
- **Event cover images are URL-based**, not a real file upload. Pasting a
  direct image link works; uploading a file from a device does not yet.
- Scan attempts on unrecognised/fake QR tokens cannot be attributed to a
  specific event in the Organiser's agent performance report, since scan
  logs do not currently capture which event an agent was actively working
  at the time of the scan.

## Roadmap

- Resolve SMTP configuration for real email delivery
- Live camera-based QR scanning for Gate Agents
- Deploy to a public host (e.g. Render/Railway for backend and database)
- Real file upload for event cover images
- Attribute all scan attempts, including invalid ones, to an event context
