/**
 * EVANGADI CHATGPT CLONE — Express entrypoint (tutor-style folder layout)
 *
 * Route flow:
 * index.js -> src/api/main.routes.js -> src/api/chat/routes/chat.routes.js
 * -> controller -> services (SQL + Gemini).
 *
 * GET / POST endpoints are declared in chat.routes.js (not here) to avoid
 * duplicate registrations and keep the tutorial's modular routing flow.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db/db.config.js';
import mainRoutes from './src/api/main.routes.js';
import { errorHandler, notFound } from './src/middleware/error-handler.js';
import { signAccessToken } from './src/api/auth/service/auth.service.js';

const app = express();
const port = Number(process.env.PORT || 3777);

app.disable('x-powered-by');
app.use(cors({
  origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim()),
}));
app.use(express.json({ limit: '512kb' }));

// This one registration exposes /api/health and all chat endpoints.
app.use('/api', mainRoutes);

// Middleware must follow every route.
app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    // Validate token signing secret and migrated database tables.
    signAccessToken(1);
    await db.query('SELECT chat_id FROM conversations LIMIT 1');
    await db.query('SELECT id, user_id FROM chats LIMIT 1');
    await db.query('SELECT id, email FROM users LIMIT 1');
    await db.query('SELECT id, user_id FROM images LIMIT 1');
    await db.query('SELECT id, user_id FROM research_reports LIMIT 1');
    await db.query("UPDATE research_reports SET status='error', error_message='Interrupted by server restart', finished_at=CURRENT_TIMESTAMP WHERE status='running'");
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('MySQL login rejected. Check DB_USER and DB_PASSWORD in backend/.env.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('MySQL is not reachable. Start your MySQL server and verify DB_PORT.');
    } else if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_BAD_DB_ERROR'].includes(error.code)) {
      console.error('MySQL schema is incomplete. Back up existing data, then apply the appropriate schema changes in MySQL Workbench (see README.md).');
    } else {
      console.error('MySQL startup check failed:', error.message);
    }
    process.exitCode = 1;
    await db.end();
    return;
  }

  const server = app.listen(port, () => {
    console.log(`ChatGPT Clone API running at http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
  });

  const shutdown = () => {
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

// Do not start a listener when this module is being imported for route tests.
if (process.env.SKIP_START_SERVER !== '1') startServer();

export default app;
