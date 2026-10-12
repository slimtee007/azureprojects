'use strict';

const express = require('express');
const db = require('../db/pool');
const storage = require('../services/storage');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/shares/:token - PUBLIC. Resolve a share link:
 * returns file metadata plus a short-lived signed download URL.
 */
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length > 128) {
      return res.status(400).json({ error: { message: 'Invalid share token' } });
    }
    const result = await db.query(
      `SELECT s.id AS share_id, s.expires_at, s.revoked,
              f.id AS file_id, f.original_name, f.mime_type, f.size_bytes, f.blob_name
         FROM share_tokens s
         JOIN files f ON f.id = s.file_id
        WHERE s.token = $1`,
      [token]
    );
    const row = result.rows[0];
    const invalid = { error: { message: 'Share link is invalid, expired or revoked' } };
    if (!row || row.revoked === true) {
      return res.status(404).json(invalid);
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return res.status(410).json(invalid);
    }
    const { url, expiresOn } = storage.getDownloadUrl(row.blob_name);
    return res.json({
      share: {
        id: row.share_id,
        expiresAt: row.expires_at,
      },
      file: {
        id: row.file_id,
        name: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
      },
      download: { url, expiresAt: expiresOn },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/shares/:id - revoke a share (owner only).
 * Route mounted under /api/shares, protected here.
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE share_tokens s SET revoked = TRUE
         FROM files f
        WHERE s.id = $1 AND f.id = s.file_id AND f.user_id = $2 AND NOT s.revoked
        RETURNING s.id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { message: 'Share not found' } });
    }
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
