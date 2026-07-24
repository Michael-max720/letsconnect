-- Lets Connect: database schema
-- Mirrors the ERD from Module 2 exactly: User, Event, TicketCategory,
-- Ticket, Transaction, Notification.
-- Run this once via phpMyAdmin (XAMPP) or `npm run migrate`.

CREATE DATABASE IF NOT EXISTS letsconnect
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE letsconnect;

-- ---------------------------------------------------------------------
-- USER
-- Covers all four roles from the SRS: Buyer, Organiser, Gate Agent, Admin.
-- A single table with a `role` column, matching the class diagram from
-- Module 3, rather than four separate tables.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)        NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash VARCHAR(255)        NOT NULL,
  role          ENUM('attendee','organiser','admin','gate_agent') NOT NULL DEFAULT 'attendee',
  status        ENUM('pending_verification','pending_approval','active','suspended')
                NOT NULL DEFAULT 'pending_verification',
  otp_code      VARCHAR(6),
  otp_expires_at DATETIME,
  date_registered TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- EVENT
-- One Organiser (a user with role='organiser') organises many events.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  event_id      INT AUTO_INCREMENT PRIMARY KEY,
  organiser_id  INT NOT NULL,
  title         VARCHAR(160) NOT NULL,
  description   TEXT,
  category      VARCHAR(80),
  venue         VARCHAR(160),
  event_date    DATETIME NOT NULL,
  cover_image_url VARCHAR(255),
  status        ENUM('draft','published','cancelled') NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organiser_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TICKET_CATEGORY
-- One Event offers many ticket categories (Regular, VIP, VVIP...).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_categories (
  category_id   INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  name          VARCHAR(60) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  quota         INT NOT NULL,
  sales_start   DATETIME,
  sales_end     DATETIME,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TRANSACTION
-- One Buyer makes many transactions; one transaction can cover several
-- tickets bought in the same checkout.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id  INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id        INT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  payment_method  ENUM('mpesa','card') NOT NULL,
  payment_status  ENUM('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
  mpesa_receipt   VARCHAR(40),
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TICKET
-- One ticket category generates many tickets; each ticket belongs to one
-- buyer and (once paid) one transaction.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id       INT AUTO_INCREMENT PRIMARY KEY,
  category_id     INT NOT NULL,
  buyer_id        INT NOT NULL,
  transaction_id  INT,
  qr_code_token   VARCHAR(64) UNIQUE NOT NULL,
  status          ENUM('reserved','paid','issued','used','cancelled','refunded')
                  NOT NULL DEFAULT 'reserved',
  issued_date     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at         DATETIME,
  FOREIGN KEY (category_id) REFERENCES ticket_categories(category_id),
  FOREIGN KEY (buyer_id) REFERENCES users(user_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- NOTIFICATION
-- One user receives many notifications (confirmations, reminders, alerts).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  type            ENUM('email','sms') NOT NULL,
  content         TEXT NOT NULL,
  sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status          ENUM('sent','failed') NOT NULL DEFAULT 'sent',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- SCAN_LOG
-- Supports the Gate Agent's scan history screen and FR-4.4 (audit log of
-- every scan attempt). Not in the original ERD as a separate box, but the
-- ERD's description already calls for logging every scan.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_logs (
  scan_id       INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id     INT,
  gate_agent_id INT NOT NULL,
  result        ENUM('valid','already_used','invalid') NOT NULL,
  scanned_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
  FOREIGN KEY (gate_agent_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
