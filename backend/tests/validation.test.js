'use strict';

const {
  isEmail,
  isPassword,
  normalizeEmail,
  extensionOf,
  isAllowedFile,
  sanitizeFilename,
  isUuid,
} = require('../src/util/validate');

describe('validation helpers', () => {
  test('isEmail accepts normal addresses', () => {
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail(' first.last+tag@sub.domain.io ')).toBe(false); // spaces not trimmed
    expect(isEmail('user@example.com')).toBe(true);
  });

  test('isEmail rejects junk', () => {
    expect(isEmail('')).toBe(false);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail(null)).toBe(false);
    expect(isEmail('a@b.c ')).toBe(false);
  });

  test('isPassword enforces length bounds', () => {
    expect(isPassword('12345678')).toBe(true);
    expect(isPassword('short')).toBe(false);
    expect(isPassword('x'.repeat(129))).toBe(false);
    expect(isPassword(undefined)).toBe(false);
  });

  test('normalizeEmail lowercases and trims', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  test('extensionOf', () => {
    expect(extensionOf('report.PDF')).toBe('pdf');
    expect(extensionOf('archive.tar.gz')).toBe('gz');
    expect(extensionOf('noext')).toBe('');
    expect(extensionOf('.bashrc')).toBe('bashrc');
  });

  test('isAllowedFile allow-list', () => {
    expect(isAllowedFile('photo.png', 'image/png')).toBe(true);
    expect(isAllowedFile('doc.pdf', 'application/pdf')).toBe(true);
    expect(isAllowedFile('evil.exe', 'application/octet-stream')).toBe(false);
    expect(isAllowedFile('script.sh', 'text/x-shellscript')).toBe(false);
    expect(isAllowedFile('notes.txt', 'text/plain')).toBe(true);
    expect(isAllowedFile('weird.txt', 'application/evil')).toBe(false);
    expect(isAllowedFile('noext', 'text/plain')).toBe(false);
  });

  test('sanitizeFilename strips paths and control chars', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('C:\\Users\\me\\file.txt')).toBe('file.txt');
    expect(sanitizeFilename('bad\u0000name.txt')).toBe('badname.txt');
    expect(sanitizeFilename('')).toBe('file');
    expect(sanitizeFilename('x'.repeat(400)).length).toBe(255);
  });

  test('isUuid', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});
