'use strict';

const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('[migrate] schema applied');
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] failed:', err.message);
      process.exit(1);
    });
}

module.exports = { migrate };
