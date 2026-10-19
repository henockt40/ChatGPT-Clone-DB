import axios from 'axios';

// The browser never connects to MySQL or Gemini directly. Authentication
// requests go to the same Express API as the existing chat endpoints.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});
const KEY = 'chatgpt_clone_access_token';

export function getAuthToken() {
  return sessionStorage.getItem(KEY);
}
export function setAuthToken(token) {
  if (token) sessionStorage.setItem(KEY, token);
  else sessionStorage.removeItem(KEY);
}

function unpack(response) {
  if (response.data?.success !== true || !response.data?.data) {
    throw new Error(response.data?.message || 'Invalid authentication response.');
  }
  return response.data.data;
}

export async function registerAccount({ name, email, password }) {
  return unpack(await api.post('/auth/register', { name, email, password }));
}
export async function loginAccount({ email, password }) {
  return unpack(await api.post('/auth/login', { email, password }));
}
export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  const response = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  return unpack(response).user;
}
