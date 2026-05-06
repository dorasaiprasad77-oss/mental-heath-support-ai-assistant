# AI Mental Health Support Assistant

A non-clinical mental health support web app with a browser chat UI, voice input and output, safety-focused crisis handling, and a Gemini-backed server route with a local fallback response system.

## Features

- Text chat UI for supportive conversations
- Voice input with the Web Speech API in supported browsers
- Voice output with speech synthesis
- Safety-oriented crisis keyword detection on both client and server
- Gemini API integration through an Express backend
- Session-based local chat history in the browser

## Tech stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- Environment config: `dotenv`

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` and add your Gemini API key:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

## Vercel deployment

1. Import the repository into Vercel.
2. Add the environment variable `GEMINI_API_KEY` in the Vercel project settings.
3. Redeploy after saving the environment variable.

The deployed app serves the frontend as static files and uses `api/chat.js` as the serverless backend for `/api/chat`.

## Browser notes

- Voice input relies on `SpeechRecognition` / `webkitSpeechRecognition`, which works best in Chrome or Edge.
- Voice output uses `speechSynthesis`.
- If speech recognition is unavailable, the listen button is disabled automatically.

## Safety and privacy

- This project is for emotional support and coping guidance only. It is not a medical device or emergency service.
- Messages sent through chat are posted to the app backend and may be forwarded to the Gemini API to generate responses.
- The app does not intentionally store conversations on the server. Chat history is kept in the browser session unless the user exports it.
- If a message looks like an immediate safety risk, the assistant switches to urgent-help guidance instead of normal supportive chat.

## Project files

- `index.html`: chat interface markup
- `styles.css`: UI styling
- `app.js`: browser chat, voice, fallback logic, and session persistence
- `server.js`: Express server and Gemini API proxy
- `vercel.json`: Vercel configuration
