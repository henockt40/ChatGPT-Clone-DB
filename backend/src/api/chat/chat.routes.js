/**
 * Chat API routes: URL -> validator -> controller.
 * Mounted as /api/chat by main.routes.js.
 */
import { Router } from 'express';
import {
  createConversationController,
  getConversationsController,
  listThreads,
  createThread,
  renameThread,
  deleteThread,
  getThreadMessages,
  postThreadMessage,
} from './controller/chat.controller.js';
import {
  validateChatRequest,
  validateThreadId,
  validateTitle,
} from './validation/chat.validation.js';

const chatRouter = Router();

// Tutor GET/POST endpoints: /api/chat/conversations
chatRouter.get('/conversations', getConversationsController);
chatRouter.post('/conversations', validateChatRequest, createConversationController);

// Keep the full-stack React application's independent chat threads.
chatRouter.get('/threads', listThreads);
chatRouter.post('/threads', createThread);

chatRouter.patch('/threads/:threadId', validateThreadId, validateTitle, renameThread);
chatRouter.delete('/threads/:threadId', validateThreadId, deleteThread);

chatRouter.get('/threads/:threadId/messages', validateThreadId, getThreadMessages);
chatRouter.post(
  '/threads/:threadId/messages',
  validateThreadId,
  validateChatRequest,
  postThreadMessage,
);

export default chatRouter;
