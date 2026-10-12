'use strict';

jest.mock('../src/db/pool');
jest.mock('../src/services/storage');

const request = require('supertest');
const db = require('../src/db/pool');
const storage = require('../src/services/storage');
const { createApp } = require('../src/app');

const app = createApp();

describe('GET /health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 when database and storage are healthy', async () => {
    db.healthy.mockResolvedValue(true);
    storage.healthy.mockResolvedValue(true);

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'healthy', database: 'healthy', storage: 'healthy' });
  });

  test('returns 503 when the database is down', async () => {
    db.healthy.mockRejectedValue(new Error('connection refused'));
    storage.healthy.mockResolvedValue(true);

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unhealthy', database: 'unhealthy', storage: 'healthy' });
  });

  test('returns 503 when storage is down', async () => {
    db.healthy.mockResolvedValue(true);
    storage.healthy.mockRejectedValue(new Error('blob unreachable'));

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unhealthy', database: 'healthy', storage: 'unhealthy' });
  });

  test('returns 503 when both dependencies are down', async () => {
    db.healthy.mockRejectedValue(new Error('down'));
    storage.healthy.mockRejectedValue(new Error('down'));

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unhealthy');
  });
});
