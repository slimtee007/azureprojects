'use strict';

const multer = require('multer');
const config = require('../config');
const { isAllowedFile, sanitizeFilename, extensionOf } = require('../util/validate');

/**
 * Multer upload handler: keeps files in memory, enforces size and type rules.
 * Bytes are streamed straight to Blob storage afterwards.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter(req, file, cb) {
    const name = sanitizeFilename(file.originalname);
    if (!isAllowedFile(name, file.mimetype)) {
      const ext = extensionOf(name);
      const err = new Error(
        `File type not allowed: .${ext || 'unknown'} (allowed: ${Object.keys(
          require('../util/validate').ALLOWED_TYPES
        ).join(', ')})`
      );
      err.status = 400;
      err.code = 'FILE_TYPE_NOT_ALLOWED';
      return cb(err);
    }
    return cb(null, true);
  },
});

module.exports = { upload };
