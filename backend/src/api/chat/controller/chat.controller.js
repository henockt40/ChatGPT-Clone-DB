/**
 * Chat controllers (Evangadi tutor-style)
 * Each controller receives Express req/res, calls a service, and responds.
 * All SQL, AI prompts, and business decisions stay in chat.services.js.
 */
import {
  createChatService,
  postConversationsService,
  getConversationsService,
  createChatModel,
} from '../service/chat.service.js';
import db from '../../../../db/db.config.js';

const scopedService = req => createChatService(createChatModel(db, req.user.id));

// Forward asynchronous errors to our centralized Express error handler.
const handle = fn => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

// POST /api/chat/conversations (tutorial endpoint)
export const createConversationController = handle(async (req, res) => {
  const question = req.validatedQuestion ?? req.body?.question;
  // Tutor-style service accepts { question } instead of a bare string.
  const result = await postConversationsService({ question, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Conversation posted successfully.',
    data: result, // { userConversation, assistantConversation, threadId }
  });
});

// GET /api/chat/conversations (tutorial endpoint)
export const getConversationsController = handle(async (req, res) => {
  // Tutor screenshot: request the latest 100 messages.
  const result = await getConversationsService(100, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Conversations fetched successfully.',
    // Preserve the documented API contract required by the React frontend.
    // The tutor's introductory version used `data: result` instead.
    data: { conversations: result },
  });
});

// Compatibility aliases for code using earlier controller export names.
export const postConversation = createConversationController;
export const getConversations = getConversationsController;

// The existing React frontend uses separate chat threads, so preserve these.
export const listThreads = handle(async (req, res) => {
  const threads = await scopedService(req).listThreads();
  res.status(200).json({ success: true, data: { threads } });
});

export const createThread = handle(async (req, res) => {
  const thread = await scopedService(req).createThread();
  res.status(201).json({ success: true, data: { thread } });
});

export const renameThread = handle(async (req, res) => {
  const thread = await scopedService(req).renameThread(req.threadId, req.validatedTitle);
  res.status(200).json({ success: true, data: { thread } });
});

export const deleteThread = handle(async (req, res) => {
  await scopedService(req).deleteThread(req.threadId);
  res.status(204).end();
});

export const getThreadMessages = handle(async (req, res) => {
  const conversations = await scopedService(req).getThreadMessages(req.threadId);
  res.status(200).json({ success: true, data: { conversations } });
});

export const postThreadMessage = handle(async (req, res) => {
  const result = await scopedService(req).postConversation(
    req.validatedQuestion ?? req.body?.question,
    req.threadId,
  );
  res.status(201).json({
    success: true,
    message: 'Conversation posted successfully.',
    data: result,
  });
});
