'use strict';

/**
 * Jest global setup for AzureDrop backend tests.
 *
 * - Default: boots an embedded PostgreSQL and an Azurite blob emulator from
 *   npm devDependencies, so `npm test` works with zero external services.
 * - With TEST_USE_EXTERNAL_SERVICES=true (CI): uses the DATABASE_URL and
 *   AZURE_STORAGE_CONNECTION_STRING provided by the environment (e.g. GitHub
 *   Actions service containers) and only applies migrations.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PG_PORT = 55432;
const BLOB_PORT = 55000;
const DEV_ACCOUNT_KEY =
  'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';

function blobConnectionString(port) {
  return (
    'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;' +
    `AccountKey=${DEV_ACCOUNT_KEY};` +
    `BlobEndpoint=http://127.0.0.1:${port}/devstoreaccount1;`
  );
}

function waitPort(port, timeoutMs = 30000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}`));
        } else {
          setTimeout(attempt, 250);
        }
      });
    };
    attempt();
  });
}

function runMigrations() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/db/migrate.js'], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`migrate exited with code ${code}`))
    );
    child.on('error', reject);
  });
}

module.exports = async function globalSetup() {
  const external = process.env.TEST_USE_EXTERNAL_SERVICES === 'true';
  const infra = { pg: null, azurite: null, dataDir: null };

  if (external) {
    if (!process.env.DATABASE_URL || !process.env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error(
        'TEST_USE_EXTERNAL_SERVICES=true requires DATABASE_URL and AZURE_STORAGE_CONNECTION_STRING'
      );
    }
  } else {
    const dataDir = path.join(ROOT, 'tmp', 'pgdata');
    fs.rmSync(dataDir, { recursive: true, force: true });

    const mod = require('embedded-postgres');
    const EmbeddedPostgres = mod.EmbeddedPostgres || mod.default || mod;
    const pg = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: 'postgres',
      password: 'postgres',
      port: PG_PORT,
      persistent: false,
    });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('azuredrop_test');
    infra.pg = pg;
    infra.dataDir = dataDir;

    const azuriteBin = fs.existsSync(path.join(ROOT, 'node_modules', '.bin', 'azurite-blob'))
      ? path.join(ROOT, 'node_modules', '.bin', 'azurite-blob')
      : path.join(ROOT, 'node_modules', '.bin', 'azurite');
    const azuriteDir = path.join(ROOT, 'tmp', 'azurite');
    fs.mkdirSync(azuriteDir, { recursive: true });
    const azurite = spawn(
      azuriteBin,
      [
        '--silent',
        '--location', azuriteDir,
        '--blobPort', String(BLOB_PORT),
        '--loose',
        '--skipApiVersionCheck',
      ],
      { cwd: ROOT, stdio: 'ignore', detached: false }
    );
    azurite.on('error', (err) => {
      console.error('[test-setup] azurite failed to start:', err.message);
    });
    infra.azurite = azurite;

    process.env.DATABASE_URL =
      `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/azuredrop_test`;
    process.env.AZURE_STORAGE_CONNECTION_STRING = blobConnectionString(BLOB_PORT);
    process.env.AZURE_STORAGE_PUBLIC_BASE_URL =
      `http://127.0.0.1:${BLOB_PORT}/devstoreaccount1`;

    await waitPort(BLOB_PORT);
    await waitPort(PG_PORT);
  }

  process.env.AZURE_STORAGE_CONTAINER =
    process.env.AZURE_STORAGE_CONTAINER || 'azuredrop-test';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || `test-secret-${Math.random().toString(36).slice(2)}`;
  process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173';
  process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';

  await runMigrations();

  globalThis.__AZUREDROP_TEST_INFRA__ = infra;
};
