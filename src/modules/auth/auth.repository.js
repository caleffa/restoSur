const { query } = require('../../repositories/baseRepository');

async function findByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ? AND active = 1 LIMIT 1', [email]);
  return rows[0] || null;
}

module.exports = { findByEmail };
