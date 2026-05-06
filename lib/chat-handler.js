const crisisKeywords = [
  'suicid', 'kill myself', 'end my life', 'take my life', 'hurt myself', 'self harm',
  'i want to die', 'no reason to live', 'kill someone', 'hurt others', 'plan to kill',
  'i will hurt', 'im going to hurt'
];

const stressKeywords = [
  'anxious', 'anxiety', 'panic', 'panicking', 'stressed', 'stress', 'overwhelmed',
  "can't breathe", 'can not breathe', 'short of breath', "can't sleep", 'cant sleep',
  'insomnia', 'racing thoughts', 'overthinking', 'nervous', 'fear', 'frightened',
  'hopeless', 'worthless', 'depressed'
];

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

function buildFallbackReply(userText) {
  if (includesAny(userText, crisisKeywords)) {
    return {
      title: 'Safety first',
      reply: buildCrisisReply()
    };
  }

  if (includesAny(userText, stressKeywords)) {
    return {
      title: 'I hear you',
      reply:
        "That sounds really overwhelming. I can't diagnose, but we can focus on coping in the moment.\n\n" +
        'Here are a few grounding options:\n' +
        '- Slow breathing: inhale for 4 seconds, exhale for 6 seconds, and repeat for 2-3 minutes.\n' +
        '- Relax your jaw, shoulders, and hands.\n' +
        '- Name 3 things you can control right now, like water, rest, or one small task.\n\n' +
        "If you'd like, tell me what tends to happen right before you start feeling this way."
    };
  }

  return {
    title: 'Support',
    reply:
      "Thanks for sharing. I'm here with you.\n\n" +
      'Try one small step right now:\n' +
      '- Write one sentence: "Right now, my main need is ____."\n' +
      '- Then choose one action that supports that need, like water, a short walk, a shower, or reaching out.\n\n' +
      "If you'd like, tell me whether this feels more like stress, sadness, or something else."
  };
}

function normalizeBody(body) {
  if (body == null) return {};

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return {};

    try {
      return JSON.parse(trimmed);
    } catch {
      return { message: trimmed };
    }
  }

  if (Buffer.isBuffer(body)) {
    return normalizeBody(body.toString('utf8'));
  }

  return body;
}

async function readJsonBody(req) {
  if (req.body !== undefined) {
    return normalizeBody(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return {};
  return normalizeBody(Buffer.concat(chunks));
}

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload);
  }

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sendEmpty(res, statusCode) {
  if (typeof res.status === 'function' && typeof res.end === 'function') {
    res.status(statusCode);
    return res.end();
  }

  res.statusCode = statusCode;
  res.end();
}

function buildCrisisReply() {
  return (
    "I'm really sorry you're going through this. If you're in danger right now or might hurt yourself or someone else, please seek immediate help:\n\n" +
    '- Call your local emergency number, or\n' +
    "- Contact a crisis hotline in your country. If you're in the U.S., call or text 988.\n\n" +
    'If you can, reach out to someone you trust and stay with them. While you get help, try a grounding step: name 5 things you can see, 4 things you can feel, 3 things you can hear, 2 things you can smell, 1 thing you can taste.\n\n' +
    'If you tell me your country, I can point you to appropriate crisis resources.'
  );
}

export async function handleChatRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendEmpty(res, 204);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const userText = String(body?.message || '').trim();
    if (!userText) {
      return sendJson(res, 400, { error: 'Missing message' });
    }

    if (includesAny(userText, crisisKeywords)) {
      return sendJson(res, 200, buildFallbackReply(userText));
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return sendJson(res, 200, buildFallbackReply(userText));
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${buildSafetyPrefix()}\n\nUser message: ${userText}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return sendJson(res, 200, buildFallbackReply(userText));
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.map((part) => part?.text).filter(Boolean).join('\n')
      || "I'm here with you. Can you tell me a bit more about what you're feeling?";

    const title = includesAny(userText, [
      'anxious', 'anxiety', 'panic', 'overwhelmed', "can't sleep", 'insomnia'
    ])
      ? 'I hear you'
      : 'Support';

    return sendJson(res, 200, { title, reply });
  } catch (error) {
    return sendJson(res, 200, buildFallbackReply(''));
  }
}
