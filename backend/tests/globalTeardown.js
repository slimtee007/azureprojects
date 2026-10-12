'use strict';

/** Jest global teardown: stop embedded PostgreSQL and Azurite. */

module.exports = async function globalTeardown() {
  const infra = globalThis.__AZUREDROP_TEST_INFRA__ || {};
  try {
    if (infra.azurite && !infra.azurite.killed) {
      infra.azurite.kill('SIGTERM');
    }
    if (infra.pg) {
      await infra.pg.stop();
    }
    if (infra.dataDir) {
      require('fs').rmSync(infra.dataDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('[test-teardown]', err.message);
  }
};
