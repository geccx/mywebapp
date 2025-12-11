// db.js
const mysql = require("mysql2/promise");

// Railway-friendly env variables with local fallback
const DB_HOST = process.env.MYSQLHOST || process.env.DB_HOST || "localhost";
const DB_USER = process.env.MYSQLUSER || process.env.DB_USER || "root";
const DB_PASS = process.env.MYSQLPASSWORD || process.env.DB_PASS || "";
const DB_NAME = process.env.MYSQLDATABASE || process.env.DB_NAME || "mywebappdb";
const DB_PORT = process.env.MYSQLPORT || process.env.DB_PORT || 3306;

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 10
});

// Auto create tables
(async () => {
  try {
    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        profile_image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tables ensured");
    conn.release();
  } catch (err) {
    console.error("DB initialization error:", err);
  }
})();

module.exports = pool;
