'use strict';

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // Keep the process alive on idle client errors; queries will reject individually.
  console.error('[db] unexpected pool error:', err.message);
});

function query(text, params) {
  return pool.query(text, params);
}

async function healthy() {
  const result = await query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}

module.exports = { pool, query, healthy };
