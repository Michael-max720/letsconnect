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
  region        VARCHAR(80),
  age_min       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  family_friendly TINYINT(1) NOT NULL DEFAULT 0,
  event_date    DATETIME NOT NULL,
  cover_image_url VARCHAR(255),
  status        ENUM('draft','published','cancelled') NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organiser_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB,  is_featured   TINYINT(1) NOT NULL DEFAULT 0,UPDATE events SET is_featured = 1 WHERE event_id IN (1, 2);

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
  mpesa_checkout_request_id VARCHAR(60),
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
CREATE TABLE IF NOT EXISTS follows (
  follower_id  INT NOT NULL,
  organiser_id INT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, organiser_id),
  FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (organiser_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organiser_updates (
  update_id    INT AUTO_INCREMENT PRIMARY KEY,
  organiser_id INT NOT NULL,
  event_id     INT NULL,
  type         ENUM('post','new_event','cancelled') NOT NULL DEFAULT 'post',
  title        VARCHAR(160) NOT NULL,
  body         TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organiser_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  INDEX idx_updates_org_time (organiser_id, created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS saved_events (
  user_id    INT NOT NULL,
  event_id   INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reviews (
  review_id   INT AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT NOT NULL,
  target_type ENUM('event','organiser','platform') NOT NULL,
  target_id   INT NOT NULL DEFAULT 0,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     TEXT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY one_review_per_target (reviewer_id, target_type, target_id),
  INDEX idx_review_target (target_type, target_id),
  FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;