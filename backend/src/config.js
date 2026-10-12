'use strict';

require('dotenv').config();

function int(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5001),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'insecure-dev-secret-do-not-use-in-production',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  azureStoragePublicBaseUrl: process.env.AZURE_STORAGE_PUBLIC_BASE_URL || 'http://127.0.0.1:10000/devstoreaccount1',
  azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER || 'azuredrop',
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 25 * 1024 * 1024),
  shareTtlMinutes: int(process.env.SHARE_TTL_MINUTES, 60),
  signedUrlTtlMinutes: int(process.env.SIGNED_URL_TTL_MINUTES, 15),
};

module.exports = config;
