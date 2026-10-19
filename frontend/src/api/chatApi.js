import { getAuthToken } from './authApi';
import axios from 'axios';
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 150000,
  headers: { 'Content-Type': 'application/json' },
});
client.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const expect = (data, path) => {
  if (data?.success !== true || !data.data) throw new Error(data?.message || `Invalid ${path} response.`);
  return data.data;
};
export const getThreads = async () => {
  const { data } = await client.get('/chat/threads');
  return expect(data, 'threads').threads;
};
export const createThread = async () => {
  const { data } = await client.post('/chat/threads');
  return expect(data, 'new chat').thread;
};
export const getThreadMessages = async id => {
  const { data } = await client.get(`/chat/threads/${id}/messages`);
  return expect(data, 'messages').conversations;
};
export const postThreadMessage = async (id, question) => {
  const { data } = await client.post(`/chat/threads/${id}/messages`, { question });
  return expect(data, 'answer');
};
export const renameThread = async (id, title) => {
  const { data } = await client.patch(`/chat/threads/${id}`, { title });
  return expect(data, 'rename').thread;
};
export const deleteThread = id => client.delete(`/chat/threads/${id}`);
// Compatibility for the Evangadi API documentation.
export const getConversations = async () => {
  const { data } = await client.get('/chat/conversations');
  return expect(data, 'history').conversations;
};
export const postConversation = async question => {
  const { data } = await client.post('/chat/conversations', { question });
  return expect(data, 'answer');
};
export const getApiError = error => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ECONNABORTED') return 'The request timed out. Check your backend and AI provider.';
  if (error.code === 'ERR_NETWORK') return 'Cannot connect to the API. Check that your backend runs on port 3777.';
  return error.message || 'Something went wrong. Please try again.';
};
