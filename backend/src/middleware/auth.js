'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/** Express middleware: require a valid Bearer JWT, attach `req.user`. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

function signToken(user) {
  return jwt.sign({ email: user.email }, config.jwtSecret, {
    subject: user.id,
    expiresIn: '12h',
  });
}

module.exports = { requireAuth, signToken };
