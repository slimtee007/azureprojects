'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db/pool');
const storage = require('../services/storage');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { sanitizeFilename, extensionOf, isUuid } = require('../util/validate');

const router = express.Router();

router.use(requireAuth);

function fileDto(row) {
  return {
    id: row.id,
    name: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
    shareCount: row.share_count !== undefined ? Number(row.share_count) : undefined,
  };
}

function requireUuidParam(req, res, next) {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: { message: 'Invalid file id' } });
  }
  return next();
}

/** GET /api/files?query=&limit=&offset= - list/search own files. */
router.get('/', async (req, res, next) => {
  try {
    const query = String(req.query.query || req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const params = [req.user.id];
    let where = 'f.user_id = $1';
    if (query) {
      params.push(`%${query}%`);
      where += ` AND f.original_name ILIKE $${params.length}`;
    }
    params.push(limit, offset);
    const result = await db.query(
      `SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.created_at,
              (SELECT count(*) FROM share_tokens s
                WHERE s.file_id = f.id AND NOT s.revoked AND s.expires_at > now()) AS share_count
         FROM files f
        WHERE ${where}
        ORDER BY f.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return res.json({ files: result.rows.map(fileDto) });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/files - upload a file (multipart field name: "file"). */
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => (err ? next(err) : handleUpload(req, res, next)));
});

async function handleUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'A file is required (field name: file)' } });
    }
    const originalName = sanitizeFilename(req.file.originalname);
    const ext = extensionOf(originalName);
    const blobName = `${crypto.randomUUID()}${ext ? '.' + ext : ''}`;
    await storage.uploadBuffer(blobName, req.file.buffer, req.file.mimetype);
    try {
      const result = await db.query(
        `INSERT INTO files (user_id, original_name, blob_name, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, original_name, mime_type, size_bytes, created_at`,
        [req.user.id, originalName, blobName, req.file.mimetype || 'application/octet-stream', req.file.size]
      );
      return res.status(201).json({ file: fileDto(result.rows[0]) });
    } catch (err) {
      // Roll back the blob if metadata could not be saved.
      await storage.deleteBlob(blobName).catch(() => {});
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

/** GET /api/files/:id/download - short-lived signed Blob URL. */
router.get('/:id/download', requireUuidParam, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, blob_name FROM files WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }
    const { url, expiresOn } = storage.getDownloadUrl(result.rows[0].blob_name);
    return res.json({ url, expiresAt: expiresOn });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/files/:id - remove blob object and metadata. */
router.delete('/:id', requireUuidParam, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING blob_name',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }
    await storage.deleteBlob(result.rows[0].blob_name);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

/** POST /api/files/:id/share - create an expiring share link. */
router.post('/:id/share', requireUuidParam, async (req, res, next) => {
  try {
    const fileResult = await db.query(
      'SELECT id, blob_name FROM files WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!fileResult.rows[0]) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }
    const requested = parseInt(req.body?.expiresInMinutes, 10);
    const ttlMinutes = Number.isFinite(requested) && requested > 0
      ? Math.min(requested, 24 * 60)
      : config.shareTtlMinutes;
    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const result = await db.query(
      `INSERT INTO share_tokens (file_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, token, expires_at`,
      [req.params.id, token, expiresAt]
    );
    const row = result.rows[0];
    return res.status(201).json({
      share: {
        id: row.id,
        token: row.token,
        url: `${config.publicBaseUrl.replace(/\/+$/, '')}/share/${row.token}`,
        expiresAt: row.expires_at,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/files/:id/shares - active shares for a file. */
router.get('/:id/shares', requireUuidParam, async (req, res, next) => {
  try {
    const fileResult = await db.query(
      'SELECT id FROM files WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!fileResult.rows[0]) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }
    const result = await db.query(
      `SELECT id, token, expires_at, created_at FROM share_tokens
        WHERE file_id = $1 AND NOT revoked AND expires_at > now()
        ORDER BY created_at DESC`,
      [req.params.id]
    );
    return res.json({
      shares: result.rows.map((r) => ({
        id: r.id,
        token: r.token,
        url: `${config.publicBaseUrl.replace(/\/+$/, '')}/share/${r.token}`,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
