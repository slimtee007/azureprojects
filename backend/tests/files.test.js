'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { uniqueEmail, strongPassword } = require('./helpers');

const app = createApp();

async function registerAndLogin() {
  const email = uniqueEmail();
  const password = strongPassword();
  const registered = await request(app).post('/api/auth/register').send({ email, password });
  expect(registered.status).toBe(201);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  expect(login.status).toBe(200);
  return { token: login.body.token, email };
}

describe('files + shares lifecycle (integration)', () => {
  test('upload, list, search, download URL, share, revoke and delete', async () => {
    const { token } = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    // --- upload -------------------------------------------------------------
    const uploadRes = await request(app)
      .post('/api/files')
      .set(auth)
      .attach('file', Buffer.from('hello azuredrop\n'), {
        filename: 'hello world.txt',
        contentType: 'text/plain',
      });
    expect(uploadRes.status).toBe(201);
    const file = uploadRes.body.file;
    expect(file.name).toBe('hello world.txt');
    expect(file.sizeBytes).toBe(16);
    expect(file.mimeType).toBe('text/plain');

    // --- list + search ------------------------------------------------------
    const listRes = await request(app).get('/api/files').set(auth);
    expect(listRes.status).toBe(200);
    expect(listRes.body.files.map((f) => f.id)).toContain(file.id);

    const searchHit = await request(app).get('/api/files?query=hello').set(auth);
    expect(searchHit.status).toBe(200);
    expect(searchHit.body.files.map((f) => f.id)).toContain(file.id);

    const searchMiss = await request(app).get('/api/files?query=zzz-no-such-file').set(auth);
    expect(searchMiss.status).toBe(200);
    expect(searchMiss.body.files).toHaveLength(0);

    // --- download (signed URL) ---------------------------------------------
    const downloadRes = await request(app)
      .get(`/api/files/${file.id}/download`)
      .set(auth);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.url).toMatch(/^https?:\/\//);
    expect(downloadRes.body.url).toContain('sig=');
    // Blobs are stored under random UUID names; the URL must target a .txt blob.
    expect(downloadRes.body.url).toMatch(/azuredrop-test\/[0-9a-f-]+\.txt\?/);
    expect(new Date(downloadRes.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    // --- sharing ------------------------------------------------------------
    const shareRes = await request(app)
      .post(`/api/files/${file.id}/share`)
      .set(auth)
      .send({});
    expect(shareRes.status).toBe(201);
    const share = shareRes.body.share;
    expect(share.token).toBeTruthy();
    expect(share.url).toContain(`/share/${share.token}`);

    // Public (unauthenticated) share resolution.
    const publicRes = await request(app).get(`/api/shares/${share.token}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.file.name).toBe('hello world.txt');
    expect(publicRes.body.download.url).toContain('sig=');

    // The owner can list active shares.
    const sharesList = await request(app)
      .get(`/api/files/${file.id}/shares`)
      .set(auth);
    expect(sharesList.status).toBe(200);
    expect(sharesList.body.shares.map((s) => s.id)).toContain(share.id);

    // --- revoke -------------------------------------------------------------
    const revokeRes = await request(app)
      .delete(`/api/shares/${share.id}`)
      .set(auth);
    expect(revokeRes.status).toBe(204);

    const revokedRes = await request(app).get(`/api/shares/${share.token}`);
    expect([404, 410]).toContain(revokedRes.status);

    const revokeAgain = await request(app)
      .delete(`/api/shares/${share.id}`)
      .set(auth);
    expect(revokeAgain.status).toBe(404);

    // --- delete file --------------------------------------------------------
    const deleteRes = await request(app)
      .delete(`/api/files/${file.id}`)
      .set(auth);
    expect(deleteRes.status).toBe(204);

    const downloadAfterDelete = await request(app)
      .get(`/api/files/${file.id}/download`)
      .set(auth);
    expect(downloadAfterDelete.status).toBe(404);

    const listAfterDelete = await request(app).get('/api/files').set(auth);
    expect(listAfterDelete.body.files.map((f) => f.id)).not.toContain(file.id);
  });

  test('rejects disallowed file types and unauthenticated access', async () => {
    const { token } = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    const evil = await request(app)
      .post('/api/files')
      .set(auth)
      .attach('file', Buffer.from('MZ...'), {
        filename: 'evil.exe',
        contentType: 'application/octet-stream',
      });
    expect(evil.status).toBe(400);

    const noFile = await request(app).post('/api/files').set(auth);
    expect(noFile.status).toBe(400);

    const unauthUpload = await request(app)
      .post('/api/files')
      .attach('file', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(unauthUpload.status).toBe(401);

    const missingFile = await request(app)
      .get('/api/files/123e4567-e89b-12d3-a456-426614174000/download')
      .set(auth);
    expect(missingFile.status).toBe(404);

    const badId = await request(app).get('/api/files/not-a-uuid/download').set(auth);
    expect(badId.status).toBe(400);

    const expiredShare = await request(app).get('/api/shares/does-not-exist-token');
    expect(expiredShare.status).toBe(404);
  });

  test('users cannot see or delete each other files', async () => {
    const alice = await registerAndLogin();
    const bob = await registerAndLogin();

    const uploadRes = await request(app)
      .post('/api/files')
      .set({ Authorization: `Bearer ${alice.token}` })
      .attach('file', Buffer.from('alice secret'), {
        filename: 'alice.txt',
        contentType: 'text/plain',
      });
    expect(uploadRes.status).toBe(201);
    const file = uploadRes.body.file;

    const bobDownload = await request(app)
      .get(`/api/files/${file.id}/download`)
      .set({ Authorization: `Bearer ${bob.token}` });
    expect(bobDownload.status).toBe(404);

    const bobDelete = await request(app)
      .delete(`/api/files/${file.id}`)
      .set({ Authorization: `Bearer ${bob.token}` });
    expect(bobDelete.status).toBe(404);

    const bobShare = await request(app)
      .post(`/api/files/${file.id}/share`)
      .set({ Authorization: `Bearer ${bob.token}` })
      .send({});
    expect(bobShare.status).toBe(404);

    const bobList = await request(app)
      .get('/api/files')
      .set({ Authorization: `Bearer ${bob.token}` });
    expect(bobList.body.files.map((f) => f.id)).not.toContain(file.id);
  });
});
