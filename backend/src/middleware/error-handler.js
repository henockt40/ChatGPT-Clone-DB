import { AppError } from '../utils/app-error.js';

export const notFound = (_req, _res, next) => next(new AppError('Route not found', 404));

export const errorHandler = (error, _req, res, _next) => {
  // Express JSON parser signals malformed JSON with HTTP 400.
  if (error?.type === 'entity.parse.failed' && error.status === 400) {
    return res.status(400).json({ status: false, message: 'Invalid JSON body' });
  }
  const code = error instanceof AppError ? error.statusCode : 500;
  if (!(error instanceof AppError)) console.error('Unhandled server error:', error);
  return res.status(code).json({
    status: false,
    message: error instanceof AppError ? error.message : 'Something went wrong try again later',
  });
};
