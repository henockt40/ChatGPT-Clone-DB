import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import db from '../../../../db/db.config.js';
import { AppError } from '../../../utils/app-error.js';
import { validateCredentials } from '../validation/auth.validation.js';

const scrypt = promisify(scryptCallback);
const TOKEN_LIFETIME = 24 * 60 * 60;
const ISSUER = 'chatgpt-clone';
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');

function jwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (Buffer.byteLength(secret, 'utf8') < 32 || /^REPLACE|^YOUR_|^CHANGE_ME/i.test(secret)) {
    throw new Error('Set JWT_SECRET to a random value of at least 32 bytes in backend/.env.');
  }
  return secret;
}

export function signAccessToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ sub: String(userId), iss: ISSUER, iat: now, exp: now + TOKEN_LIFETIME });
  const input = `${header}.${payload}`;
  const signature = createHmac('sha256', jwtSecret()).update(input).digest('base64url');
  return `${input}.${signature}`;
}

export function verifyAccessToken(token) {
  if (typeof token !== 'string' || token.length > 4096) throw new AppError('Invalid authentication token.', 401);
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw new AppError('Invalid authentication token.', 401);
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = createHmac('sha256', jwtSecret()).update(`${encodedHeader}.${encodedPayload}`).digest();
  const provided = Buffer.from(signature, 'base64url');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new AppError('Invalid authentication token.', 401);
  }
  let header; let payload;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new AppError('Invalid authentication token.', 401);
  }
  const now = Math.floor(Date.now() / 1000);
  const userId = Number(payload.sub);
  if (header.alg !== 'HS256' || header.typ !== 'JWT' || payload.iss !== ISSUER ||
      !Number.isSafeInteger(userId) || userId < 1 || !Number.isSafeInteger(payload.exp) ||
      !Number.isSafeInteger(payload.iat) || payload.exp <= now || payload.iat > now + 30) {
    throw new AppError('Authentication token expired or invalid. Sign in again.', 401);
  }
  return userId;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function passwordMatches(password, storedHash) {
  const [method, salt, hex] = String(storedHash || '').split(':');
  if (method !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hex || '')) return false;
  const derived = await scrypt(password, salt, 64);
  return timingSafeEqual(derived, Buffer.from(hex, 'hex'));
}

const sanitize = row => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
});

export async function registerUser(input) {
  const { name, email, password } = validateCredentials(input || {}, true);
  const hash = await hashPassword(password);
  try {
    const [result] = await db.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
    const user = { id: Number(result.insertId), name, email };
    return { user, accessToken: signAccessToken(user.id) };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('An account already exists with this email.', 409);
    throw error;
  }
}

export async function loginUser(input) {
  const { email, password } = validateCredentials(input || {});
  const [rows] = await db.execute('SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
  if (!rows.length || !(await passwordMatches(password, rows[0].password_hash))) {
    throw new AppError('Email or password is incorrect.', 401);
  }
  const user = sanitize(rows[0]);
  return { user, accessToken: signAccessToken(user.id) };
}

export async function getUserById(id) {
  const [rows] = await db.execute('SELECT id, name, email FROM users WHERE id = ? LIMIT 1', [id]);
  return rows.length ? sanitize(rows[0]) : null;
}
