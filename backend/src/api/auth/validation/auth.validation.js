import { AppError } from '../../../utils/app-error.js';

// Validate and normalize credentials BEFORE they reach a controller or MySQL.
// The same pure validator is also called inside auth.service.js for callers
// which bypass HTTP (for example, service-level tests).
export function validateCredentials(input, register = false) {
  const { name, email, password } = input && typeof input === 'object' ? input : {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new AppError('Enter a valid email address.', 400);
  }
  if (typeof password !== 'string' || (register && (password.length < 10 || password.length > 128))) {
    throw new AppError(register ? 'Password must be 10 to 128 characters.' : 'Email or password is incorrect.', 400);
  }
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (register && (!normalizedName || normalizedName.length > 80)) {
    throw new AppError('Name must contain 1 to 80 characters.', 400);
  }
  return { name: normalizedName, email: normalizedEmail, password };
}

const validateRequest = register => (req, _res, next) => {
  try {
    req.validatedAuth = validateCredentials(req.body, register);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateRegisterRequest = validateRequest(true);
export const validateLoginRequest = validateRequest(false);
