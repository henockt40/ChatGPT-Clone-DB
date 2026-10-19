import { AppError } from '../utils/app-error.js';
// Lightweight per-IP limiter for local/single-process use. For multiple Render
// instances, replace it with an external shared rate limiter such as Redis.
const windowMs = 15 * 60 * 1000;
const attempts = new Map();
export function limitAuthAttempts(req, _res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  for (const [key, v] of attempts) if (now > v.until) attempts.delete(key);
  const record = attempts.get(ip) || { count: 0, until: now + windowMs };
  record.count++;
  attempts.set(ip, record);
  if (record.count > 20) return next(new AppError('Too many attempts. Try again in 15 minutes.', 429));
  next();
}
