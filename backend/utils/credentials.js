const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTempPassword() {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return `CM2-${suffix}`;
}

function slugifyUsername(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

async function generateUniqueUsername(db, baseName, prefix = '') {
  const base = (prefix + slugifyUsername(baseName)) || (prefix + 'user');
  let candidate = base;
  let n = 1;
  while (await db.get('SELECT id FROM users WHERE username = ?', [candidate])) {
    candidate = `${base}${n++}`;
  }
  return candidate;
}

module.exports = { generateTempPassword, slugifyUsername, generateUniqueUsername };
