'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/pool');
const { signToken, requireAuth } = require('../middleware/auth');
const { isEmail, isPassword, normalizeEmail } = require('../util/validate');

const router = express.Router();

function publicUser(row) {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

/** POST /api/auth/register - create an account. */
router.post('/register', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};
    if (!isEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email is required' } });
    }
    if (!isPassword(password)) {
      return res.status(400).json({
        error: { message: 'Password must be between 8 and 128 characters' },
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    let result;
    try {
      result = await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, passwordHash]
      );
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: { message: 'Email already registered' } });
      }
      throw err;
    }
    return res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/auth/login - exchange credentials for a JWT. */
router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};
    if (!email || typeof password !== 'string') {
      return res.status(400).json({ error: { message: 'Email and password are required' } });
    }
    const result = await db.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    // Same error for unknown email and bad password (no user enumeration).
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/auth/me - current user (protected). */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    return res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
