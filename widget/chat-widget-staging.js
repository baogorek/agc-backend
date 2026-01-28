(function() {
  const scriptTag = document.currentScript;
  const CLIENT_ID = scriptTag.getAttribute('data-client-id');
  const BUBBLE_IMAGE = scriptTag.getAttribute('data-bubble-image');
  const BRAND_COLOR = scriptTag.getAttribute('data-brand-color') || '#2563eb';
  const GREETING = scriptTag.getAttribute('data-greeting');
  const SUPABASE_URL = 'https://wbgdpxogtpqijkqyaeke.supabase.co';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat`;

  const SESSION_ID = crypto.randomUUID();
  let hasGreeted = false;

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function buildStyles() {
    return `
    #chat-widget-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: ${BRAND_COLOR};
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      transition: transform 0.2s;
    }
    #chat-widget-bubble.has-image {
      width: 80px;
      height: 80px;
      background: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      border: 3px solid white;
    }
    #chat-widget-bubble:hover { transform: scale(1.05); }
    #chat-widget-bubble svg { width: 28px; height: 28px; fill: white; }
    #chat-widget-bubble img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }

    #chat-widget-speech {
      position: fixed;
      bottom: 108px;
      right: 20px;
      background: white;
      color: #1e293b;
      padding: 10px 16px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      cursor: pointer;
      max-width: 240px;
    }
    #chat-widget-speech::after {
      content: '';
      position: absolute;
      bottom: -8px;
      right: 28px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid white;
    }
    #chat-widget-speech.hidden { display: none; }

    #chat-widget-window {
      position: fixed;
      bottom: 110px;
      right: 20px;
      width: 380px;
      height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
    }
    #chat-widget-window::after {
      content: '';
      position: absolute;
      bottom: -10px;
      right: 30px;
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-top: 10px solid white;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
    }
    #chat-widget-window.open { display: flex; }

    #chat-widget-close {
      position: absolute;
      top: 8px;
      right: 12px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      z-index: 1;
    }
    #chat-widget-close:hover { color: #475569; }

    #chat-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      padding-top: 36px;
    }

    .chat-message {
      margin-bottom: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      max-width: 85%;
      line-height: 1.5;
      font-size: 14px;
    }
    .chat-message.user {
      background: ${BRAND_COLOR};
      color: white;
      margin-left: auto;
    }
    .chat-message.bot {
      background: #f1f5f9;
      color: #1e293b;
    }
    .chat-message.bot a {
      color: ${BRAND_COLOR};
      text-decoration: underline;
    }
    .chat-message.loading {
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 14px 18px;
    }
    .chat-message.loading .typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      animation: typing-pulse 1.4s ease-in-out infinite;
    }
    .chat-message.loading .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .chat-message.loading .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-pulse {
      0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
      30% { opacity: 1; transform: scale(1); }
    }

    #chat-widget-input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e2e8f0;
    }
    #chat-widget-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      outline: none;
      font-size: 14px;
    }
    #chat-widget-input:focus { border-color: ${BRAND_COLOR}; }
    #chat-widget-send {
      margin-left: 8px;
      padding: 10px 16px;
      background: ${BRAND_COLOR};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    #chat-widget-send:hover { background: ${BRAND_COLOR}; filter: brightness(0.9); }
    #chat-widget-send:disabled { background: #94a3b8; cursor: not-allowed; filter: none; }

    @media (max-width: 480px) {
      #chat-widget-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 120px);
        right: 10px;
        bottom: 110px;
      }
    }
  `;
  }

  function init() {
    if (!CLIENT_ID) {
      console.error('Chat widget: data-client-id attribute is required');
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.textContent = buildStyles();
    document.head.appendChild(styleEl);

    const bubble = document.createElement('div');
    bubble.id = 'chat-widget-bubble';
    if (BUBBLE_IMAGE) {
      bubble.classList.add('has-image');
      bubble.innerHTML = `<img src="${BUBBLE_IMAGE}" alt="Chat">`;
    } else {
      bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
    }
    document.body.appendChild(bubble);

    if (BUBBLE_IMAGE) {
      const speech = document.createElement('div');
      speech.id = 'chat-widget-speech';
      speech.textContent = GREETING || 'Ask me anything!';
      document.body.appendChild(speech);
      speech.addEventListener('click', toggleChat);
    }

    const chatWindow = document.createElement('div');
    chatWindow.id = 'chat-widget-window';
    chatWindow.innerHTML = `
      <button id="chat-widget-close">&times;</button>
      <div id="chat-widget-messages"></div>
      <div id="chat-widget-input-area">
        <input id="chat-widget-input" type="text" placeholder="Ask a question..." />
        <button id="chat-widget-send">Send</button>
      </div>
    `;
    document.body.appendChild(chatWindow);

    bubble.addEventListener('click', toggleChat);
    document.getElementById('chat-widget-close').addEventListener('click', toggleChat);
    document.getElementById('chat-widget-send').addEventListener('click', sendMessage);
    document.getElementById('chat-widget-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  function toggleChat() {
    const chatWindow = document.getElementById('chat-widget-window');
    chatWindow.classList.toggle('open');

    const speech = document.getElementById('chat-widget-speech');
    if (speech) {
      speech.classList.toggle('hidden', chatWindow.classList.contains('open'));
    }

    if (!hasGreeted && chatWindow.classList.contains('open')) {
      hasGreeted = true;
      showGreeting();
    }
  }

  function showGreeting() {
    if (GREETING) {
      addMessage(GREETING, 'bot');
    } else {
      const hour = new Date().getHours();
      let timeGreeting = "Hey there!";
      if (hour < 12) timeGreeting = "Good morning!";
      else if (hour < 17) timeGreeting = "Good afternoon!";
      else timeGreeting = "Good evening!";
      addMessage(`${timeGreeting} How can I help you today?`, 'bot');
    }
  }

  async function sendMessage() {
    const input = document.getElementById('chat-widget-input');
    const sendBtn = document.getElementById('chat-widget-send');
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;

    const loadingMsg = addLoadingIndicator();

    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          message: text,
          sessionId: SESSION_ID
        })
      });

      loadingMsg.remove();

      if (!response.ok) {
        const error = await response.json();
        addMessage(error.error || 'Sorry, something went wrong. Please try again.', 'bot');
        return;
      }

      const data = await response.json();
      addMessage(data.reply, 'bot');
    } catch (err) {
      loadingMsg.remove();
      addMessage('Unable to connect. Please check your internet and try again.', 'bot');
      console.error('Chat widget error:', err);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function addLoadingIndicator() {
    const messages = document.getElementById('chat-widget-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-message bot loading';
    msg.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  function addMessage(text, className) {
    const messages = document.getElementById('chat-widget-messages');
    const msg = document.createElement('div');
    msg.className = `chat-message ${className}`;

    if (className.includes('bot') && !className.includes('loading')) {
      let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, '<br>');
      html = html.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
      msg.innerHTML = html;
    } else {
      msg.textContent = text;
    }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
