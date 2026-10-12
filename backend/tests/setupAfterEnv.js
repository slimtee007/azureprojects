'use strict';

/**
 * Loaded before each test file: make sure the pg pool is closed afterwards so
 * Jest can exit cleanly even when tests opened real database connections.
 */
const db = require('../src/db/pool');

afterAll(async () => {
  if (db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
  }
});
