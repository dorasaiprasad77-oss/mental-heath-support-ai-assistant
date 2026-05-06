import { handleChatRequest } from '../lib/chat-handler.js';

export default async function handler(req, res) {
  return handleChatRequest(req, res);
}
