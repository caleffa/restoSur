const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool(db);

async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

module.exports = { pool, testConnection };
