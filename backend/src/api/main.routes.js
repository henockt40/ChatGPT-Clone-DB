import { Router } from 'express';
import authRouter from './auth/auth.routes.js';
import chatRouter from './chat/chat.routes.js';
import imagesRouter from './images/images.routes.js';
import appsRouter from './apps/apps.routes.js';
import researchRouter from './research/research.routes.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const mainRouter = Router();
mainRouter.get('/health', (_req, res) => res.status(200).json({ success: true, message: 'API server is running.' }));
mainRouter.use('/auth', authRouter);
mainRouter.use('/chat', requireAuth, chatRouter);
mainRouter.use('/images', requireAuth, imagesRouter);
mainRouter.use('/apps', requireAuth, appsRouter);
mainRouter.use('/research', requireAuth, researchRouter);
export default mainRouter;
