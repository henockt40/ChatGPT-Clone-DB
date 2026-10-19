import { AppError } from '../utils/app-error.js';
import { getUserById, verifyAccessToken } from '../api/auth/service/auth.service.js';

export async function requireAuth(req, _res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer (\S+)$/i.exec(authorization);
  if (!match) return next(new AppError('Sign in to use your chats.', 401));
  try {
    const id = verifyAccessToken(match[1]);
    const user = await getUserById(id);
    if (!user) throw new AppError('Account not found. Sign in again.', 401);
    req.user = user;
    next();
  } catch (error) { next(error); }
}
