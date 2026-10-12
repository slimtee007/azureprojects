'use strict';

const multer = require('multer');

/** Central error handler: consistent JSON error envelope. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      error: {
        message:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File exceeds the maximum upload size'
            : err.message,
        code: err.code,
      },
    });
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[api] unhandled error:', err);
  }
  return res.status(status).json({
    error: {
      message: status >= 500 ? 'Internal server error' : err.message,
      ...(err.code ? { code: err.code } : {}),
    },
  });
}

function notFound(req, res) {
  res.status(404).json({ error: { message: 'Not found' } });
}

module.exports = { errorHandler, notFound };
