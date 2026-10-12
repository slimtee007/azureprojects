'use strict';

const crypto = require('crypto');

const uniqueEmail = () => `test-${crypto.randomUUID()}@example.com`;

const strongPassword = () => 'Sup3r-secret-pass';

module.exports = { uniqueEmail, strongPassword };
