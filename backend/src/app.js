'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/shares');
const healthRoutes = require('./routes/health');
const { errorHandler, notFound } = require('./middleware/errorHandler');

/** Build the Express application (exported for tests). */
function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/curl requests (no Origin header) and the allow-list.
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/shares', shareRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
