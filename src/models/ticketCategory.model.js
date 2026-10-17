// src/models/ticketCategory.model.js
const { pool } = require('../config/db');

async function createCategory({ eventId, name, price, quota, salesStart, salesEnd }) {
  const [result] = await pool.query(
    `INSERT INTO ticket_categories (event_id, name, price, quota, sales_start, sales_end)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [eventId, name, price, quota, salesStart || null, salesEnd || null]
  );
  return result.insertId;
}

// Each category also reports how many tickets are still available.
async function findCategoriesByEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT tc.*,
            GREATEST(tc.quota - (
              SELECT COUNT(*) FROM tickets t
              WHERE t.category_id = tc.category_id
                AND t.status IN ('reserved', 'paid', 'issued', 'used')
            ), 0) AS available
     FROM ticket_categories tc
     WHERE tc.event_id = ?`,
    [eventId]
  );
  return rows;
}

async function findCategoryById(categoryId) {
  const [rows] = await pool.query(
    'SELECT * FROM ticket_categories WHERE category_id = ?',
    [categoryId]
  );
  return rows[0] || null;
}

async function updateCategory(categoryId, { name, price, quota, salesStart, salesEnd }) {
  await pool.query(
    `UPDATE ticket_categories SET name = ?, price = ?, quota = ?, sales_start = ?, sales_end = ?
     WHERE category_id = ?`,
    [name, price, quota, salesStart || null, salesEnd || null, categoryId]
  );
}

module.exports = { createCategory, findCategoriesByEvent, findCategoryById, updateCategory };