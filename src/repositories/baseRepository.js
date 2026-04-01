const { pool } = require('../config/database');

async function query(sql, params = [], connection = null) {
  const executor = connection || pool;
  const [rows] = await executor.query(sql, params);
  return rows;
}

module.exports = { query };
