# ChatGPT Clone Frontend

React + Vite. Start with `npm ci` then `npm run dev` from `frontend/`.

The unauthenticated app shows the ChatGPT-inspired `src/components/Auth/AuthScreen.jsx` screen. It calls the existing `/api/auth/login` and `/api/auth/register` endpoints and uses the token/session logic from `src/api/authApi.js`. The original chat interface and sidebar features are unchanged.

Copy `.env.example` to `.env`. For a local backend, the Vite proxy routes `/api` to `http://127.0.0.1:3777`. Configure `VITE_API_BASE_URL` only if deploying to a separate backend domain. Never place MySQL passwords or Gemini API keys in frontend environment variables.
