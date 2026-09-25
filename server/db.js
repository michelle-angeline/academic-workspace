// Database connection to academic_workspace (equivalent of config.php)
const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'academic_workspace',
  waitForConnections: true,
  connectionLimit: 10,
  // Return DATE/DATETIME columns as plain strings instead of JS Date objects
  dateStrings: true,
});

module.exports = pool;
