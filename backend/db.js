// db.js
const mysql = require("mysql2/promise");

// -------------------------------
// RAILWAY DATABASE CONFIG SUPPORT
// -------------------------------

// Railway provides these variables automatically:
const DB_HOST = process.env.MYSQLHOST || process.env.DB_HOST;
const DB_USER = process.env.MYSQLUSER || process.env.DB_USER;
const DB_PASS = process.env.MYSQLPASSWORD || process.env.DB_PASS;
const DB_NAME = process.env.MYSQLDATABASE || process.env.DB_NAME;
const DB_PORT = process.env.MYSQLPORT || process.env.DB_PORT || 3306;

// Create connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ---------------------------------------
// AUTO-CREATE TABLES ON BACKEND STARTUP
// ---------------------------------------
(async () => {
  try {
    const conn = await pool.getConnection();

    console.log("🔌 Connected to MySQL:", DB_HOST);

    const createUsers = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        profile_image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createItems = `
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await conn.query(createUsers);
    await conn.query(createItems);

    conn.release();
    console.log("✅ Tables ensured (users, items)");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  }
})();

module.exports = pool;
