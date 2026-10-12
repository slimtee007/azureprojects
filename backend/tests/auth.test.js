'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { uniqueEmail, strongPassword } = require('./helpers');

const app = createApp();

describe('auth flow (integration)', () => {
  test('register validates input', async () => {
    const badEmail = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: strongPassword() });
    expect(badEmail.status).toBe(400);

    const badPassword = await request(app)
      .post('/api/auth/register')
      .send({ email: uniqueEmail(), password: 'short' });
    expect(badPassword.status).toBe(400);
  });

  test('register, duplicate detection, login and /me', async () => {
    const email = uniqueEmail();
    const password = strongPassword();

    const registered = await request(app)
      .post('/api/auth/register')
      .send({ email, password });
    expect(registered.status).toBe(201);
    expect(registered.body.user.email).toBe(email);
    expect(registered.body.user.id).toBeDefined();
    expect(registered.body.user.passwordHash).toBeUndefined(); // never leak hashes

    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({ email, password });
    expect(duplicate.status).toBe(409);

    const badLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password-x' });
    expect(badLogin.status).toBe(401);

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password });
    expect(unknownUser.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.user.email).toBe(email);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);

    const unauth = await request(app).get('/api/auth/me');
    expect(unauth.status).toBe(401);

    const badToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(badToken.status).toBe(401);
  });
});
