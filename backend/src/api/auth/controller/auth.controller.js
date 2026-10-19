import { getUserById, loginUser, registerUser } from '../service/auth.service.js';

const handle = fn => async (req, res, next) => {
  try { await fn(req, res); } catch (error) { next(error); }
};

export const registerController = handle(async (req, res) => {
  const result = await registerUser(req.validatedAuth);
  res.status(201).json({ success: true, data: result });
});
export const loginController = handle(async (req, res) => {
  const result = await loginUser(req.validatedAuth);
  res.status(200).json({ success: true, data: result });
});
export const meController = handle(async (req, res) => {
  const user = await getUserById(req.user.id);
  res.status(200).json({ success: true, data: { user } });
});
