import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleChatRequest } from './lib/chat-handler.js';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '64kb' }));
app.all('/api/chat', handleChatRequest);
app.use(express.static(path.join(__dirname)));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
