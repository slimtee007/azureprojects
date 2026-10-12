'use strict';

const config = require('./config');
const { createApp } = require('./app');
const db = require('./db/pool');
const storage = require('./services/storage');

async function main() {
  // Make sure the blob container exists before accepting traffic.
  try {
    await storage.ensureContainer();
    console.log('[startup] blob container ready');
  } catch (err) {
    console.error('[startup] blob storage not reachable yet:', err.message);
    console.error('[startup] /health will report storage=unhealthy until it recovers');
  }

  const app = createApp();
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[startup] AzureDrop API listening on :${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`[startup] ${signal} received, shutting down`);
    server.close(() => {
      db.pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[startup] fatal:', err);
  process.exit(1);
});
