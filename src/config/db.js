// Module A2: Database connection.
// A pooled connection is reused across requests instead of opening a new
// MySQL connection every time, which is what you want under any real load.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'letsconnect',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('Database connected:', process.env.DB_NAME || 'letsconnect');
    conn.release();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.error('Check that XAMPP MySQL is running and .env matches your setup.');
  }
}

module.exports = { pool, testConnection };
