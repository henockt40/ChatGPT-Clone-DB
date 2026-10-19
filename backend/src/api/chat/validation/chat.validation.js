import { AppError } from '../../../utils/app-error.js';
export function validateQuestion(value) {
  if (typeof value !== 'string' || !value.trim()) throw new AppError('question is required', 400);
  const question = value.trim();
  if (question.length > 65535) throw new AppError('question is too long', 400);
  return question;
}
export function validateChatRequest(req, _res, next) {
  try { req.validatedQuestion = validateQuestion(req.body?.question); next(); } catch (error) { next(error); }
}
export function validateThreadId(req, _res, next) {
  const id = Number(req.params.threadId);
  if (!Number.isSafeInteger(id) || id < 1) return next(new AppError('Invalid chat ID.', 400));
  req.threadId = id;
  next();
}
export function validateTitle(req, _res, next) {
  const title = req.body?.title;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) {
    return next(new AppError('title must contain 1 to 160 characters.', 400));
  }
  req.validatedTitle = title.trim();
  next();
}
