'use strict';

/** Input validation helpers shared by the API routes. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Allow-list of uploadable file types (extension -> accepted MIME types).
const ALLOWED_TYPES = {
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
  csv: ['text/csv', 'application/vnd.ms-excel'],
  json: ['application/json', 'text/plain'],
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  svg: ['image/svg+xml'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

function isPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function extensionOf(filename) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(filename || ''));
  return match ? match[1].toLowerCase() : '';
}

/** Return true when an upload's name/MIME pair is allowed. */
function isAllowedFile(filename, mimeType) {
  const ext = extensionOf(filename);
  if (!ext || !ALLOWED_TYPES[ext]) return false;
  const mimes = ALLOWED_TYPES[ext];
  if (!mimeType) return true; // rely on extension when the client omits MIME
  return mimes.some((m) => m === mimeType || mimeType.startsWith(m + '+'));
}

/** Sanitize a user-supplied file name before storing it as metadata. */
function sanitizeFilename(filename) {
  const base = String(filename || 'file').split(/[\\/]/).pop();
  return base.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) || 'file';
}

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

module.exports = {
  ALLOWED_TYPES,
  isEmail,
  isPassword,
  normalizeEmail,
  extensionOf,
  isAllowedFile,
  sanitizeFilename,
  isUuid,
};
