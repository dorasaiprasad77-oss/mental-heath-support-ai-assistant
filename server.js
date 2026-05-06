import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname)));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildSafetyPrefix() {
  return [
    'You are a non-clinical student well-being support assistant.',
    'Provide empathetic, supportive responses, coping strategies, and suggest contacting professional help when appropriate.',
    'Follow mandatory safety rules: if the user indicates they are in imminent danger or may harm themselves or others, immediately give urgent crisis guidance and encourage contacting local emergency or crisis services.',
    'Do not provide medical diagnosis or prescribe medication.',
    'Keep responses clear and non-judgmental.'
  ].join('\n');
}

function includesAny(haystack, needles) {
  const h = (haystack || '').toLowerCase();
  return needles.some((k) => h.includes(k));
}

const crisisKeywords = [
  'suicid', 'kill myself', 'end my life', 'take my life', 'hurt myself', 'self harm',
  'i want to die', 'no reason to live', 'kill someone', 'hurt others', 'plan to kill',
  'i will hurt', 'im going to hurt'
];

app.post('/api/chat', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });
    }

    const { message } = req.body || {};
    const userText = String(message || '').trim();
    if (!userText) return res.status(400).json({ error: 'Missing message' });

    if (includesAny(userText, crisisKeywords)) {
      return res.json({
        title: 'Safety first',
        reply:
          "I'm really sorry you're going through this. If you're in danger right now or might hurt yourself or someone else, please seek immediate help:\n\n" +
          '- Call your local emergency number, or\n' +
          "- Contact a crisis hotline in your country. If you're in the U.S., call or text 988.\n\n" +
          'If you can, reach out to someone you trust and stay with them. While you get help, try a grounding step: name 5 things you can see, 4 things you can feel, 3 things you can hear, 2 things you can smell, 1 thing you can taste.\n\n' +
          'If you tell me your country, I can point you to appropriate crisis resources.'
      });
    }

    const systemInstruction = buildSafetyPrefix();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstruction}\n\nUser message: ${userText}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Gemini request failed' });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('\n')
      || "I'm here with you. Can you tell me a bit more about what you're feeling?";

    const title = includesAny(userText, ['anxious', 'anxiety', 'panic', 'overwhelmed', 'can\'t sleep', 'insomnia'])
      ? 'I hear you'
      : 'Support';

    return res.json({ title, reply });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
