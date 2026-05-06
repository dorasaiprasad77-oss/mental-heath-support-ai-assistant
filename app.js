(() => {
  const $ = (sel) => document.querySelector(sel);

  const chatEl = $('#chat');
  const composer = $('#composer');
  const userInput = $('#userInput');
  const sendBtn = $('#sendBtn');
  const clearBtn = $('#clearBtn');
  const downloadBtn = $('#downloadBtn');
  const listenBtn = $('#listenBtn');
  const toggleVoiceBtn = $('#toggleVoiceBtn');
  const micStatus = $('#micStatus');
  const modal = $('#modal');
  const showDisclaimersBtn = $('#showDisclaimersBtn');
  const closeModalBtn = $('#closeModalBtn');
  const modalOkBtn = $('#modalOkBtn');

  const STORAGE_KEY = 'mh_ai_assistant_session';
  const WELCOME_TITLE = 'Welcome';
  const WELCOME_MESSAGE =
    "I'm here to offer non-clinical emotional support and coping ideas. If you're in immediate danger, contact emergency or crisis services right away.";

  const crisisKeywords = [
    'suicid', 'kill myself', 'end my life', 'take my life', 'hurt myself', 'self harm',
    'i want to die', 'no reason to live', 'murder', 'kill someone', 'hurt others', 'harm others',
    'i will hurt', 'im going to hurt', 'plan to kill', 'bang myself'
  ];

  const stressKeywords = [
    'anxious', 'anxiety', 'panic', 'panicking', 'stressed', 'stress', 'overwhelmed',
    'can\'t breathe', 'can not breathe', 'short of breath', 'can\'t sleep', 'cant sleep',
    'insomnia', 'racing thoughts', 'overthinking', 'nervous', 'fear', 'frightened',
    'hopeless', 'worthless', 'depressed'
  ];

  function escapeHtml(str) {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addMessage(role, text, title) {
    const msg = document.createElement('div');
    msg.className = `msg ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (title) {
      const t = document.createElement('p');
      t.className = 'msg-title';
      t.textContent = title;
      bubble.appendChild(t);
    }

    const p = document.createElement('p');
    p.className = 'msg-body';
    p.innerHTML = escapeHtml(text);

    bubble.appendChild(p);
    msg.appendChild(bubble);
    chatEl.appendChild(msg);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function normalize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function includesAny(haystack, needles) {
    const h = normalize(haystack);
    return needles.some((k) => {
      const nk = normalize(k);
      return nk && h.includes(nk);
    });
  }

  function detectCrisis(text) {
    return includesAny(text, crisisKeywords);
  }

  function detectStress(text) {
    return includesAny(text, stressKeywords);
  }

  function supportiveResponse(userText) {
    const stress = detectStress(userText);
    const crisis = detectCrisis(userText);

    if (crisis) {
      return {
        title: 'Safety first',
        text:
          "I'm really sorry you're going through this. Based on what you said, it sounds like you may be at serious risk.\n\n" +
          "If you're in danger right now or might hurt yourself or someone else, please seek immediate help:\n" +
          "- Call your local emergency number, or\n" +
          "- Contact a crisis hotline in your country. If you're in the U.S., you can call or text 988.\n\n" +
          "If you can, please reach out to someone you trust, such as a friend, family member, or counselor, and stay with them.\n\n" +
          "While you get help, try a quick grounding step:\n" +
          "1) Name 5 things you can see\n2) 4 things you can feel\n3) 3 things you can hear\n4) 2 things you can smell\n5) 1 thing you can taste\n\n" +
          "If you tell me what country you're in, I can point you to appropriate crisis resources."
      };
    }

    if (stress) {
      return {
        title: 'I hear you',
        text:
          "That sounds really overwhelming. I can't diagnose, but we can focus on coping in the moment.\n\n" +
          "Here are a few grounding options - pick one that feels doable:\n" +
          "- Slow breathing: inhale 4 seconds, exhale 6 seconds, repeat for 2-3 minutes\n" +
          "- Quick body reset: unclench your jaw, drop your shoulders, relax your hands\n" +
          "- Mind shift: name 3 things you can control right now, like water, rest, or one small task\n\n" +
          "Also, what's happening right before you start feeling this way: work or school, relationships, sleep, or something else?\n\n" +
          "If this is affecting your daily life, it may help to talk to a licensed counselor or trusted professional."
      };
    }

    const lower = normalize(userText);
    const asks = [
      { k: 'feel', r: 'When you say you feel that way, it makes sense. What part feels the hardest right now?' },
      { k: 'sad', r: "I'm sorry you're feeling sad. Would you be open to sharing what happened today, or what thoughts are looping?" },
      { k: 'anx', r: 'Anxiety can feel exhausting. On a scale from 1-10, how intense is it right now?' },
      { k: 'sleep', r: "Sleep struggles are common when you're stressed. What time did you try to sleep, and what's keeping your mind active?" },
      { k: 'panic', r: 'Panic moments are scary. Are you somewhere safe right now?' }
    ];

    const matched = asks.find((x) => lower.includes(x.k));
    const reflection = matched
      ? matched.r
      : "Thanks for sharing. I'm here with you. What's been going on, and what are you hoping to feel instead?";

    const coping =
      'In the meantime, we can try one small step:\n' +
      '- Write one sentence: "Right now, my main need is ____."\n' +
      '- Then choose one action that supports that need, like water, a short walk, a shower, or reaching out.';

    return {
      title: 'Support',
      text: `${reflection}\n\n${coping}\n\nIf you'd like, you can tell me: is this more about stress or anxiety, sadness, or something else?`
    };
  }

  function persistChat() {
    try {
      const messages = Array.from(chatEl.querySelectorAll('.msg')).map((m) => {
        const role = m.classList.contains('user')
          ? 'user'
          : (m.classList.contains('system') ? 'system' : 'assistant');
        const title = m.querySelector('.msg-title')?.innerText || '';
        const text = m.querySelector('.msg-body')?.innerText || '';
        return { role, title, text };
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, updatedAt: Date.now() }));
    } catch (_) {
      // ignore sessionStorage failures
    }
  }

  function loadChat() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (!parsed?.messages?.length) return false;

      chatEl.innerHTML = '';
      parsed.messages.forEach((m) => {
        if (m.role === 'user') addMessage('user', m.text, m.title || 'You');
        else if (m.role === 'assistant') addMessage('assistant', m.text, m.title || 'Assistant');
        else addMessage('system', m.text, m.title || WELCOME_TITLE);
      });

      return true;
    } catch (_) {
      return false;
    }
  }

  function clearChat() {
    chatEl.innerHTML = '';
    sessionStorage.removeItem(STORAGE_KEY);
    addMessage('system', 'Start a new conversation whenever you are ready.', WELCOME_TITLE);
    persistChat();
  }

  function exportChat() {
    const lines = [];
    Array.from(chatEl.querySelectorAll('.msg')).forEach((m) => {
      const role = m.classList.contains('user')
        ? 'You'
        : (m.classList.contains('assistant') ? 'Assistant' : 'Notice');
      const title = m.querySelector('.msg-title')?.innerText || '';
      const text = m.querySelector('.msg-body')?.innerText || '';
      const label = title ? `${role} - ${title}` : role;
      lines.push(`${label} (${nowTime()}):\n${text}`);
    });

    const blob = new Blob([lines.join('\n\n---\n\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mental-health-chat-export.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  let voiceEnabled = true;

  function speak(text) {
    if (!voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      // ignore speech synthesis failures
    }
  }

  toggleVoiceBtn?.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    toggleVoiceBtn.textContent = `Voice: ${voiceEnabled ? 'On' : 'Off'}`;
  });

  let recognition = null;
  let listening = false;

  function setupSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onstart = () => {
      listening = true;
      micStatus.textContent = 'Mic: listening...';
      listenBtn.textContent = 'Stop';
    };

    r.onend = () => {
      listening = false;
      micStatus.textContent = 'Mic: idle';
      listenBtn.textContent = 'Listen';
    };

    r.onerror = (e) => {
      micStatus.textContent = `Mic: error (${e.error || 'unknown'})`;
    };

    r.onresult = (event) => {
      const last = event.results?.[event.results.length - 1];
      const transcript = last?.[0]?.transcript || '';
      if (!transcript.trim()) return;
      userInput.value = transcript.trim();
      addMessage('user', transcript.trim(), 'You');
      handleSend(transcript.trim());
    };

    return r;
  }

  recognition = setupSpeechRecognition();

  if (!recognition && listenBtn) {
    listenBtn.disabled = true;
    listenBtn.title = 'Speech recognition is not supported in this browser.';
    listenBtn.textContent = 'Listen (unsupported)';
  }

  listenBtn?.addEventListener('click', () => {
    if (!recognition) return;

    if (listening) {
      try {
        recognition.stop();
      } catch (_) {
        // ignore stop failures
      }
      return;
    }

    try {
      recognition.start();
    } catch (_) {
      // Some browsers throw if start is called twice quickly.
    }
  });

  function setBusy(isBusy) {
    sendBtn.disabled = isBusy;
    composer.querySelectorAll('button').forEach((b) => {
      b.disabled = isBusy;
    });
  }

  async function handleSend(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    setBusy(true);

    let replyText = '';
    let title = 'Assistant';

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed })
      });

      if (!r.ok) {
        const fallback = supportiveResponse(trimmed);
        title = fallback.title || title;
        replyText = fallback.text;
      } else {
        const data = await r.json();
        title = data?.title || title;
        replyText = data?.reply || data?.text || '';

        if (!replyText.trim()) {
          const fallback = supportiveResponse(trimmed);
          title = fallback.title || title;
          replyText = fallback.text;
        }
      }
    } catch (_) {
      const fallback = supportiveResponse(trimmed);
      title = fallback.title || title;
      replyText = fallback.text;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    addMessage('assistant', replyText, title);
    speak(replyText);
    persistChat();
    setBusy(false);
  }

  composer?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    addMessage('user', text, 'You');
    userInput.value = '';
    persistChat();
    await handleSend(text);
  });

  showDisclaimersBtn?.addEventListener('click', () => {
    modal.hidden = false;
  });

  closeModalBtn?.addEventListener('click', () => {
    modal.hidden = true;
  });

  modalOkBtn?.addEventListener('click', () => {
    modal.hidden = true;
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  clearBtn?.addEventListener('click', clearChat);
  downloadBtn?.addEventListener('click', exportChat);

  if (!loadChat()) {
    addMessage('system', WELCOME_MESSAGE, WELCOME_TITLE);
    persistChat();
  }
})();
