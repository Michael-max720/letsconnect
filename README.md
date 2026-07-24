# Lets Connect — E-Ticketing Prototype

Online event and concert ticketing system for the Kenyan market. Node.js +
Express + MySQL backend, single responsive frontend for mobile and desktop.

This repo is being built module by module — see the roadmap below. Right now
**Module A (Foundation)** is complete: the project boots, connects to MySQL,
and the schema matching the Module 2 ERD is ready to run.

## Setup (Windows + XAMPP)

1. Start **Apache** and **MySQL** in the XAMPP control panel.
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the environment file and adjust if your MySQL setup differs from the
   XAMPP defaults (root user, no password, port 3306):
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
6. Visit `http://localhost:3000/api/health` — you should see
   `{"status":"ok","database":"connected"}`.

## Project structure

```
src/
  config/db.js       Database connection pool
  routes/             Express routes, one file per resource (Module B+)
  controllers/         Request handlers (Module B+)
  models/              Query functions per table (Module B+)
  middleware/          Auth checks, role guards (Module B+)
  utils/               Shared helpers (QR generation, etc.) (Module C+)
  app.js               Express app + middleware wiring
  server.js            Entry point
public/                Frontend: HTML/CSS/JS served as static files
migrations/
  schema.sql           Full database schema (matches Module 2 ERD)
  run.js               Runs schema.sql against your database
```

## Build roadmap

| Phase | Module | Status |
|---|---|---|
| A | Project setup + database | Done |
| B | Auth, Organiser, Attendee features | Next |
| C | Payment (M-Pesa) + notifications | Planned |
| D | Gate Agent + Admin tools | Planned |
| E | Frontend polish + deployment | Planned |

## Notes on the schema

- `users` covers all four SRS roles (attendee, organiser, admin, gate_agent)
  via a `role` column, matching the Module 3 class diagram — not four
  separate tables.
- `scan_logs` was added beyond the original 6-entity ERD to support FR-4.4
  (logging every scan attempt for audit purposes) and the Gate Agent's Scan
  History screen from Module 4.
