/**
 * Evangadi ChatGPT Clone - Chat Services
 * - Database model queries (createChatModel)
 * - Chat orchestration (createChatService)
 * - Gemini SDK chats.create/sendMessage + 503 retries; optional OpenAI
 *
 * Kept together to match the requested tutorial folder layout.
 * The controller does not execute SQL or call Gemini directly.
 */
import db from '../../../../db/db.config.js';
import { GoogleGenAI } from '@google/genai';
import { AppError } from '../../../utils/app-error.js';

// SECTION 1: DATABASE QUERIES / DATA ACCESS
// The tutor uses five recent messages as AI context and 100 as the visible
// history limit. Clamp inputs before a LIMIT clause to avoid invalid SQL.
export function normalizeRowLimit(limit = 5, fallback = 5) {
  const n = Number(limit);
  return Number.isSafeInteger(n) && n >= 1 ? Math.min(n, 100) : fallback;
}

/** MODEL: SQL access only. Input is always parameterized, and routes validate IDs. */
export function createChatModel(db, userId) {
  if (!Number.isSafeInteger(Number(userId)) || Number(userId) < 1) {
    throw new AppError('Authentication required.', 401);
  }
  const ownerId = Number(userId);
  return {
    async getThreads() {
      const [rows] = await db.query(`SELECT id, title, created_at, updated_at FROM chats WHERE user_id=? ORDER BY updated_at DESC, id DESC LIMIT 200`, [ownerId]);
      return rows;
    },
    async getThread(id) {
      const [rows] = await db.execute('SELECT id, title, created_at, updated_at FROM chats WHERE id=? AND user_id=? LIMIT 1', [id, ownerId]);
      return rows[0] || null;
    },
    async createThread(title = 'New chat') {
      const [result] = await db.execute('INSERT INTO chats (title, user_id) VALUES (?, ?)', [title, ownerId]);
      return this.getThread(result.insertId);
    },
    async renameThread(id, title) {
      const [result] = await db.execute('UPDATE chats SET title=? WHERE id=? AND user_id=?', [title, id, ownerId]);
      return result.affectedRows > 0 ? this.getThread(id) : null;
    },
    async deleteThread(id) {
      // Foreign key ON DELETE CASCADE removes this thread's messages only.
      const [result] = await db.execute('DELETE FROM chats WHERE id=? AND user_id=?', [id, ownerId]);
      return result.affectedRows > 0;
    },
    async touchThread(id) {
      await db.execute('UPDATE chats SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?', [id, ownerId]);
    },
    async getMessages(chatId, limit = 100) {
      const [rows] = await db.query(`SELECT id, chat_id, role, content, token_count, created_at
        FROM conversations WHERE chat_id=? AND EXISTS (SELECT 1 FROM chats WHERE id=? AND user_id=?) ORDER BY id DESC LIMIT ?`, [chatId, chatId, ownerId, normalizeRowLimit(limit, 100)]);
      return rows;
    },
    // Tutorial equivalent of getRecentConversationRows(limit=5),
    // but scoped to a chat so separate threads never leak context.
    async getRecentConversationRows(chatId, limit = 5) {
      const [rows] = await db.query(`SELECT role, content FROM conversations
        WHERE chat_id=? AND EXISTS (SELECT 1 FROM chats WHERE id=? AND user_id=?) ORDER BY id DESC LIMIT ?`, [chatId, chatId, ownerId, normalizeRowLimit(limit, 100)]);
      return rows;
    },
    async saveMessage(chatId, role, content, tokenCount = 0) {
      const [result] = await db.execute(`INSERT INTO conversations (chat_id, role, content, token_count)
        VALUES (?, ?, ?, ?)`, [chatId, role, content, tokenCount]);
      return result.insertId;
    },
    // Tutorial: getMessageById(messageId). Fetch a saved row to return exact
    // database-generated values (ID, role, text, tokens and timestamp).
    async getMessageById(messageId) {
      const [rows] = await db.execute(`SELECT m.id, m.chat_id, m.role, m.content, m.token_count, m.created_at
        FROM conversations m JOIN chats c ON c.id = m.chat_id WHERE m.id = ? AND c.user_id=? LIMIT 1`, [messageId, ownerId]);
      return rows[0] || null;
    },
    async getAllRecent(limit = 100) {
      const [rows] = await db.query(`SELECT m.id, m.chat_id, m.role, m.content, m.token_count, m.created_at
        FROM conversations m JOIN chats c ON c.id=m.chat_id WHERE c.user_id=? ORDER BY m.id DESC LIMIT ?`, [ownerId,normalizeRowLimit(limit, 100)]);
      return rows;
    },
    async getLegacyThread() {
      const [rows] = await db.execute('SELECT id FROM chats WHERE title=? AND user_id=? ORDER BY id LIMIT 1', ['Imported chat history', ownerId]);
      if (rows.length) return rows[0].id;
      const [result] = await db.execute('INSERT INTO chats (title,user_id) VALUES (?,?)', ['Imported chat history',ownerId]);
      return result.insertId;
    },
  };
}

// Tutor helper: fetch recent DB history in chronological order.
// Optional chatId keeps multiple chat threads isolated when required.
export async function getRecentConversationRows(limit = 5, chatId = null, userId) {
  const count = normalizeRowLimit(limit, 5);
  const model = createChatModel(db, userId);
  const rows = chatId == null
    ? await model.getAllRecent(count)
    : await model.getMessages(chatId, count);
  return rows.reverse();
}

// Tutor helper: fetch an inserted message by its auto-increment ID.
export async function getMessageById(messageId, userId) {
  const id = Number(messageId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError('Invalid message ID.', 400);
  }
  const row = await createChatModel(db, userId).getMessageById(id);
  return row ? serializeMessage(row) : null;
}

// SECTION 2: CHAT BUSINESS LOGIC

export const serializeMessage = row => ({
  id: Number(row.id),
  chatId: row.chat_id == null ? null : Number(row.chat_id),
  role: row.role,
  content: row.content,
  tokenCount: Number(row.token_count || 0),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
});
export const serializeThread = row => ({
  id: Number(row.id),
  title: row.title,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
});

export function createChatService(model, provider = aiProvider) {
  const requireThread = async id => {
    const chat = await model.getThread(id);
    if (!chat) throw new AppError('Chat not found.', 404);
    return chat;
  };
  return {
    async listThreads() { return (await model.getThreads()).map(serializeThread); },
    async createThread() { return serializeThread(await model.createThread()); },
    async renameThread(id, title) {
      await requireThread(id);
      return serializeThread(await model.renameThread(id, title));
    },
    async deleteThread(id) {
      await requireThread(id);
      await model.deleteThread(id);
    },
    async getThreadMessages(id) {
      await requireThread(id);
      return (await model.getMessages(id, 100)).reverse().map(serializeMessage);
    },
    // Backward-compatible single-history API from the Evangadi documentation.
    async getConversations() {
      // The 100 most recent rows are fetched DESC and returned oldest first.
      return (await model.getAllRecent(100)).reverse().map(serializeMessage);
    },

    // Tutor's createConversationService(question), extended with optional
    // threadId because the existing React app supports multiple saved chats.
    async postConversation(rawQuestion, specifiedThreadId = null) {
      // STEP 1 — Validate user question. The route validator also performs
      // this check; keeping it here protects direct service calls as well.
      if (typeof rawQuestion !== 'string' || !rawQuestion.trim()) {
        throw new AppError('question is required', 400);
      }
      const question = rawQuestion.trim();
      if (question.length > 65535) throw new AppError('question is too long', 400);
      if (!provider.isConfigured()) {
        throw new AppError('AI provider API key is not configured. Check backend/.env.', 500);
      }

      const threadId = specifiedThreadId ?? await model.getLegacyThread();
      const chat = await requireThread(threadId);

      // STEP 2 — Read latest FIVE messages before inserting the question.
      // Scope to this chat so context does not cross other saved threads.
      const historyRows = (await model.getRecentConversationRows(threadId, 5)).reverse();

      // STEP 3 — Insert the user question ONCE, before calling Gemini.
      // Note: a provider failure leaves the user row saved (tutor behavior).
      // The React client refreshes its chat instead of automatically reposting.
      const userMessageId = await model.saveMessage(threadId, 'user', question, 0);
      if (chat.title === 'New chat') {
        await model.renameThread(threadId, question.slice(0, 80));
      } else {
        await model.touchThread(threadId);
      }

      // STEP 4 — Format previous history and ask Gemini in the service.
      // The provider retries temporary 503s internally. Retries do NOT
      // repeat the INSERT above. Failed questions remain visible in MySQL.
      const { content: assistantAnswer, tokenCount: totalTokens } =
        await provider.generate(historyRows, question);
      if (!assistantAnswer?.trim()) {
        throw new AppError('The model returned an empty answer.', 502);
      }

      // STEP 5 — Persist assistant reply + Gemini usage metadata.
      const assistantMessageId = await model.saveMessage(
        threadId, 'assistant', assistantAnswer, totalTokens || 0,
      );
      await model.touchThread(threadId);

      // STEP 6 — Fetch EACH saved row by ID (like the tutor's helper).
      // This returns database values rather than constructing fake rows.
      const [savedUser, savedAssistant] = await Promise.all([
        model.getMessageById(userMessageId),
        model.getMessageById(assistantMessageId),
      ]);
      if (!savedUser || !savedAssistant ||
          savedUser.role !== 'user' || savedAssistant.role !== 'assistant' ||
          Number(savedUser.chat_id) !== Number(threadId) ||
          Number(savedAssistant.chat_id) !== Number(threadId)) {
        throw new AppError('Unable to read saved conversation rows.', 500);
      }

      // STEP 7 — Match the existing frontend and course API response.
      return {
        userConversation: serializeMessage(savedUser),
        assistantConversation: serializeMessage(savedAssistant),
        threadId: Number(threadId),
      };
    },
  };
}

// Public tutor-compatible helpers still require the authenticated user ID.

// POST: read five messages, save the user message, call Gemini, save its answer,
// select the two inserted rows by ID and return the documented API objects.
export async function createConversationService(question, threadId = null, userId) {
  return createChatService(createChatModel(db,userId)).postConversation(question, threadId);
}

/**
 * Tutor screenshot: postConversationsService({ question }).
 * Accepts an object rather than a positional string while delegating to the
 * existing full-stack service. This preserves: thread-scoped history,
 * one-time user INSERT, Gemini SDK retries, assistant INSERT, token counting,
 * both getMessageById reads, and the documented response shape.
 *
 * @param {{question: string, threadId?: number|null}} params
 * @returns {Promise<{userConversation: object, assistantConversation: object, threadId: number}>}
 */
export async function postConversationsService({ question, threadId = null, userId } = {}) {
  return createConversationService(question, threadId, userId);
}

/**
 * Tutor screenshot: getConversationsService() gets stored chat history.
 * GET returns only the latest 100 rows, oldest first. The controller wraps
 * this array as data.conversations for the existing React Axios client.
 *
 * @param {number} limit
 * @returns {Promise<Array<object>>}
 */
export async function getConversationsService(limit = 100, userId) {
  const rows = await getRecentConversationRows(limit, null, userId);
  return rows.map(serializeMessage);
}

// SECTION 3: AI PROVIDER — GOOGLE GEMINI SDK (TUTOR'S chats.create STYLE)

const SYSTEM_PROMPT = `You are a friendly, accurate programming assistant.
Focus on software engineering, debugging, computer science, and IT.
Explain concepts clearly and practically. Use Markdown and fenced code blocks.
Politely decline unrelated requests and redirect to a programming topic.
Do not assist with malicious, harmful, or unethical software activity.`;

const getProvider = () => (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
const cleanModel = value => String(value || '').trim().replace(/^models\//, '');
const hasRealKey = key => typeof key === 'string' && !!key.trim() &&
  !/^(your_|replace_|paste_|enter_|example|<)/i.test(key.trim());

// The SDK accepts history as [{role:'user'|'model', parts:[{text:'...'}]}].
// It must start with the user and alternate user/model turns.
// A previously saved question without an assistant response is NOT an AI turn,
// so trailing unanswered user rows are omitted from SDK history (but stay in MySQL).
export function formatGeminiHistory(historyRows = []) {
  const history = [];
  for (const row of historyRows) {
    const role = row?.role === 'assistant' ? 'model' : row?.role === 'user' ? 'user' : null;
    if (!role || typeof row.content !== 'string' || !row.content.trim()) continue;
    if (!history.length && role !== 'user') continue;
    if (history.at(-1)?.role === role) {
      history.at(-1).parts.push({ text: row.content });
    } else {
      history.push({ role, parts: [{ text: row.content }] });
    }
  }
  // Google chats.create initial history requires completed user/model pairs.
  if (history.at(-1)?.role === 'user') history.pop();
  return history;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function googleStatus(error) {
  const numeric = Number(error?.status ?? error?.code);
  if (Number.isInteger(numeric) && numeric >= 400 && numeric <= 599) return numeric;
  const match = String(error?.message || '').match(/(?:^|\b)(400|401|403|404|429|500|502|503|504)(?:\b|:)/);
  return match ? Number(match[1]) : null;
}

function safeErrorDetails(error) {
  let msg = String(error?.message || 'Unexpected provider failure.');
  for (const key of [process.env.GEMINI_API_KEY, process.env.OPENAI_API_KEY]) {
    if (hasRealKey(key)) msg = msg.replaceAll(key, '[REDACTED_API_KEY]');
  }
  return msg.slice(0, 600);
}

function providerError(error, model, provider = 'Gemini') {
  const status = googleStatus(error);
  const name = provider;
  let message;
  if (status === 400) message = `${name} rejected the request (HTTP 400). Check model and request settings.`;
  else if ([401, 403].includes(status)) message = `${name} denied API access (HTTP ${status}). Check the API key and permissions.`;
  else if (status === 404) message = `${name} model "${model}" is not available (HTTP 404). Check the model name and your Gemini API account model access.`;
  else if (status === 429) message = `${name} quota/rate limit exceeded (HTTP 429). Check quota and billing.`;
  else if ([500, 502, 503, 504].includes(status)) message = `${name} is temporarily unavailable (HTTP ${status}). Please try again shortly.`;
  else message = `Could not complete the ${name} request. Check the backend terminal.`;
  const failure = new AppError(message, 502);
  failure.upstreamStatus = status;
  failure.transient = [500, 502, 503, 504].includes(status) || /ETIMEDOUT|ECONNRESET|fetch failed/i.test(error?.message || '');
  return failure;
}

function newGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 25000 }, // per request, milliseconds
  });
}

// Named to match the tutor's generateAssistantAnswer({ historyRows, question }).
// A fresh SDK Chat is created for EACH retry; no failed SDK session is reused.
export async function generateAssistantAnswer({ historyRows = [], question, client = null }) {
  const primary = cleanModel(process.env.GEMINI_MODEL || 'gemini-flash-latest');
  const fallback = cleanModel(process.env.GEMINI_FALLBACK_MODEL);
  const requested = Number(process.env.GEMINI_MAX_ATTEMPTS || 3);
  const attempts = Number.isInteger(requested) ? Math.max(1, Math.min(5, requested)) : 3;
  const geminiClient = client || newGeminiClient();
  const history = formatGeminiHistory(historyRows);
  const models = fallback && fallback !== primary ? [primary, fallback] : [primary];

  let lastError;
  for (const [modelIndex, model] of models.entries()) {
    // Only one attempt for fallback to stay within the 150-second frontend timeout.
    const maxTries = modelIndex === 0 ? attempts : 1;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        // Like the tutorial: create a chat with previous DB context, send one question.
        const chat = geminiClient.chats.create({
          model,
          history,
          config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.5 },
        });
        const response = await chat.sendMessage({ message: question });
        const content = (response?.text || response?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || '').join('\n') || '').trim();
        if (!content) throw new AppError('The model returned an empty answer.', 502);
        // Screenshot: result.text + result.usageMetadata.totalTokenCount.
        // Normalize those SDK values for the database's token_count column.
        return { content, tokenCount: Number(response?.usageMetadata?.totalTokenCount || 0) };
      } catch (error) {
        if (error instanceof AppError && error.message === 'The model returned an empty answer.') throw error;
        lastError = providerError(error, model);
        console.error(`Gemini model=${model}, attempt=${attempt}, HTTP=${lastError.upstreamStatus ?? 'network'}:`, safeErrorDetails(error));
        if (!lastError.transient) throw lastError;
        if (attempt < maxTries) {
          const delay = Math.min(1000 * (2 ** (attempt - 1)) + Math.random() * 500, 6000);
          await wait(delay);
        }
      }
    }
    if (modelIndex === 0 && models.length === 2) {
      console.warn(`Gemini primary model unavailable. Trying fallback: ${fallback}`);
    }
  }
  throw lastError || new AppError('Gemini did not respond.', 502);
}

// Keep optional OpenAI mode compatible with the existing .env option.
async function generateOpenAI(historyRows, question) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  let response;
  try {
    response = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historyRows.map(row => ({ role: row.role === 'user' ? 'user' : 'assistant', content: row.content })),
          { role: 'user', content: question },
        ],
      }),
      signal: AbortSignal.timeout(50000),
    });
  } catch (error) {
    console.error('OpenAI connection failed:', safeErrorDetails(error));
    throw new AppError('Unable to reach the OpenAI provider.', 502);
  }
  if (!response.ok) {
    console.error(`OpenAI HTTP ${response.status}:`, (await response.text()).slice(0, 200));
    throw providerError({ status: response.status }, model, 'OpenAI');
  }
  const data = await response.json();
  return {
    content: data?.choices?.[0]?.message?.content?.trim() || '',
    tokenCount: Number(data?.usage?.total_tokens || 0),
  };
}

export const aiProvider = {
  isConfigured() {
    const provider = getProvider();
    return provider === 'gemini' ? hasRealKey(process.env.GEMINI_API_KEY)
      : provider === 'openai' ? hasRealKey(process.env.OPENAI_API_KEY) : false;
  },
  async generate(historyRows, question) {
    const provider = getProvider();
    if (!['gemini', 'openai'].includes(provider)) {
      throw new AppError('Set AI_PROVIDER=gemini or AI_PROVIDER=openai in backend/.env.', 500);
    }
    if (!this.isConfigured()) throw new AppError(`AI key missing for ${provider}. Check backend/.env.`, 500);
    const result = provider === 'gemini'
      ? await generateAssistantAnswer({ historyRows, question })
      : await generateOpenAI(historyRows, question);
    if (!result.content?.trim()) throw new AppError('The model returned an empty answer.', 502);
    return { content: result.content, tokenCount: Math.max(0, Number(result.tokenCount) || 0) };
  },
};
