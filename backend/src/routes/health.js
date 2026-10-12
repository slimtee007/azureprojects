'use strict';

const express = require('express');
const db = require('../db/pool');
const storage = require('../services/storage');

const router = express.Router();

/**
 * GET /health - dependency health used by the frontend, CI and the demo.
 * Returns 200 when database AND storage are healthy, 503 otherwise.
 */
router.get('/', async (req, res) => {
  const checks = { database: 'unhealthy', storage: 'unhealthy' };

  try {
    await db.healthy();
    checks.database = 'healthy';
  } catch (err) {
    console.error('[health] database check failed:', err.message);
  }

  try {
    await storage.healthy();
    checks.storage = 'healthy';
  } catch (err) {
    console.error('[health] storage check failed:', err.message);
  }

  const healthy = checks.database === 'healthy' && checks.storage === 'healthy';
  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    database: checks.database,
    storage: checks.storage,
  });
});

module.exports = router;
