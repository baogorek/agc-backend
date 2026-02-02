(function() {
  const scriptTag = document.currentScript;
  const CLIENT_ID = scriptTag.getAttribute('data-client-id');
  const WIDGET_ID = scriptTag.getAttribute('data-widget-id') || 'default';
  const SUPABASE_URL = 'https://wbgdpxogtpqijkqyaeke.supabase.co';
  const CONVERSATION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

  // Data attributes can override server config
  const ATTR_POSITION = scriptTag.getAttribute('data-position');
  const ATTR_BUBBLE_IMAGE = scriptTag.getAttribute('data-bubble-image');
  const ATTR_BRAND_COLOR = scriptTag.getAttribute('data-brand-color');
  const ATTR_GREETING = scriptTag.getAttribute('data-greeting');
  const ATTR_BOTTOM_OFFSET = scriptTag.getAttribute('data-bottom-offset');
  const ATTR_H_MARGIN = scriptTag.getAttribute('data-horizontal-margin');
  const ATTR_PERSONA = scriptTag.getAttribute('data-persona');

  // Config values (populated from server, then overridden by data attributes)
  let POSITION = 'right';
  let BUBBLE_IMAGE = null;
  let BRAND_COLOR = '#2563eb';
  let GREETING = null;
  let BOTTOM_OFFSET = 0;
  let H_MARGIN = 40;
  let PERSONA = null;

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 37, g: 99, b: 235 };
  }

  function getLightTint(hex, opacity = 0.12) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  }
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat`;
  const STORAGE_KEY = `chat-widget-${CLIENT_ID}-${WIDGET_ID}`;

  // Element IDs scoped to this widget instance
  const ID = {
    bubble: `chat-widget-bubble-${WIDGET_ID}`,
    speech: `chat-widget-speech-${WIDGET_ID}`,
    window: `chat-widget-window-${WIDGET_ID}`,
    close: `chat-widget-close-${WIDGET_ID}`,
    newChat: `chat-widget-new-${WIDGET_ID}`,
    messages: `chat-widget-messages-${WIDGET_ID}`,
    inputArea: `chat-widget-input-area-${WIDGET_ID}`,
    input: `chat-widget-input-${WIDGET_ID}`,
    send: `chat-widget-send-${WIDGET_ID}`
  };

  let SESSION_ID = crypto.randomUUID();
  let hasGreeted = false;
  let conversationHistory = [];
  let isOpen = false;
  let speechAutoHidden = false;
  let isWaitingForResponse = false;

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessionId: SESSION_ID,
      hasGreeted,
      conversationHistory,
      isOpen,
      lastActivity: Date.now()
    }));
  }

  function loadState() {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      // Check if conversation has expired
      if (state.lastActivity && (Date.now() - state.lastActivity) > CONVERSATION_EXPIRY_MS) {
        sessionStorage.removeItem(STORAGE_KEY);
        return false;
      }
      SESSION_ID = state.sessionId || SESSION_ID;
      hasGreeted = state.hasGreeted || false;
      conversationHistory = state.conversationHistory || [];
      isOpen = state.isOpen || false;
      return true;
    }
    return false;
  }

  function restoreMessages() {
    conversationHistory.forEach(msg => {
      addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
    });
  }

  function resetChat() {
    sessionStorage.removeItem(STORAGE_KEY);
    SESSION_ID = crypto.randomUUID();
    conversationHistory = [];
    const messages = document.getElementById(ID.messages);
    if (messages) messages.innerHTML = '';
    hasGreeted = true;
    showGreeting();
  }

  function buildStyles() {
    const posLeft = POSITION === 'left';
    const hPos = posLeft ? `left: ${H_MARGIN}px;` : `right: ${H_MARGIN}px;`;
    const hPosWindow = posLeft ? `left: ${H_MARGIN}px;` : `right: ${H_MARGIN}px;`;
    const speechArrow = posLeft ? 'left: 28px;' : 'right: 28px;';
    const windowArrow = posLeft ? 'left: 30px;' : 'right: 30px;';
    const bubbleBottom = 20 + BOTTOM_OFFSET;
    const speechBottom = 108 + BOTTOM_OFFSET;
    const windowBottom = 110 + BOTTOM_OFFSET;
    const speechBgColor = getLightTint(BRAND_COLOR, 0.15);
    const rgb = hexToRgb(BRAND_COLOR);

    return `
    #${ID.bubble} {
      position: fixed;
      bottom: ${bubbleBottom}px;
      ${hPos}
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
      touch-action: manipulation;
    }
    #${ID.bubble}.has-image {
      width: 80px;
      height: 80px;
      background: none;
      box-shadow: 0 0 0 3px white, 0 4px 16px rgba(0,0,0,0.35);
      border: 3px solid ${BRAND_COLOR};
    }
    #${ID.bubble}:hover { transform: scale(1.05); }
    #${ID.bubble} svg { width: 28px; height: 28px; fill: white; }
    #${ID.bubble} img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }

    #${ID.speech} {
      position: fixed;
      bottom: ${speechBottom}px;
      ${hPos}
      background: white;
      color: #1e293b;
      padding: 10px 16px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      border: 2px solid ${BRAND_COLOR};
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      cursor: pointer;
      max-width: 240px;
      transition: opacity 0.3s, visibility 0.3s;
      touch-action: manipulation;
    }
    #${ID.speech}::after {
      content: '';
      position: absolute;
      bottom: -10px;
      ${speechArrow}
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid ${BRAND_COLOR};
    }
    #${ID.speech}::before {
      content: '';
      position: absolute;
      bottom: -7px;
      ${speechArrow}
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid white;
      z-index: 1;
    }
    #${ID.speech}.hidden { display: none; }
    #${ID.speech}.auto-hidden { opacity: 0; visibility: hidden; pointer-events: none; }

    #${ID.window} {
      position: fixed;
      bottom: ${windowBottom}px;
      ${hPosWindow}
      width: 380px;
      height: min(500px, calc(100vh - ${windowBottom}px - 70px));
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
    }
    #${ID.window}::after {
      content: '';
      position: absolute;
      bottom: -10px;
      ${windowArrow}
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-top: 10px solid white;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
    }
    #${ID.window}.open { display: flex; }

    #${ID.close} {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 24px;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
    }
    #${ID.close}:hover { color: #475569; }

    #${ID.newChat} {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
    }
    #${ID.newChat}:hover { color: #1e293b; background: #e2e8f0; }

    #${ID.window} .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      background: white;
    }

    #${ID.messages} {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    #${ID.window} .chat-message {
      margin-bottom: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      max-width: 85%;
      line-height: 1.5;
      font-size: 14px;
    }
    #${ID.window} .chat-message.user {
      background: ${BRAND_COLOR};
      color: white;
      margin-left: auto;
    }
    #${ID.window} .chat-message.bot {
      background: #f1f5f9;
      color: #1e293b;
    }
    #${ID.window} .chat-message.bot a {
      color: ${BRAND_COLOR};
      text-decoration: underline;
    }
    #${ID.window} .chat-message.loading {
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 14px 18px;
    }
    #${ID.window} .chat-message.loading .typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      animation: typing-pulse-${WIDGET_ID} 1.4s ease-in-out infinite;
    }
    #${ID.window} .chat-message.loading .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    #${ID.window} .chat-message.loading .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-pulse-${WIDGET_ID} {
      0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
      30% { opacity: 1; transform: scale(1); }
    }

    #${ID.inputArea} {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e2e8f0;
    }
    #${ID.input} {
      flex: 1;
      padding: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      outline: none;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      min-height: 20px;
      max-height: 80px;
      overflow-y: auto;
    }
    #${ID.input}:focus { border-color: ${BRAND_COLOR}; }
    #${ID.send} {
      margin-left: 8px;
      padding: 10px 16px;
      background: ${BRAND_COLOR};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    #${ID.send}:hover { background: ${BRAND_COLOR}; filter: brightness(0.9); }
    #${ID.send}:disabled { background: #94a3b8; cursor: not-allowed; filter: none; }

    @media (max-width: 430px) {
      #${ID.bubble}.has-image {
        width: 60px;
        height: 60px;
      }
      #${ID.speech} {
        display: none;
      }
      #${ID.bubble}.chat-open {
        display: none;
      }
      #${ID.window} {
        position: fixed;
        top: 60px;
        left: 0;
        right: 0;
        bottom: 0;
        width: auto;
        height: auto;
        border-radius: 16px 16px 0 0;
        z-index: 10001;
      }
      #${ID.window}::after {
        display: none;
      }
      #${ID.window} .chat-header {
        position: sticky;
        top: 0;
        height: auto;
        background: white;
        padding: 16px 20px;
        padding-top: max(16px, env(safe-area-inset-top));
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 10;
      }
      #${ID.close} {
        font-size: 32px;
        padding: 8px 12px;
      }
      #${ID.newChat} {
        font-size: 14px;
        padding: 10px 16px;
      }
      #${ID.messages} {
        padding: 20px;
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      #${ID.window} .chat-message {
        font-size: 16px;
        padding: 14px 18px;
      }
      #${ID.inputArea} {
        padding: 16px;
        padding-bottom: max(16px, env(safe-area-inset-bottom));
      }
      #${ID.input} {
        font-size: 16px;
        padding: 14px;
      }
      #${ID.send} {
        padding: 14px 20px;
        font-size: 16px;
      }
    }
  `;
  }

  async function fetchConfig() {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/config?clientId=${CLIENT_ID}&widgetId=${WIDGET_ID}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Chat widget: Could not fetch config, using defaults', err);
    }
    return null;
  }

  function applyConfig(serverConfig) {
    // Server config as base
    if (serverConfig) {
      POSITION = serverConfig.position || POSITION;
      BUBBLE_IMAGE = serverConfig.bubbleImage || BUBBLE_IMAGE;
      BRAND_COLOR = serverConfig.brandColor || BRAND_COLOR;
      GREETING = serverConfig.greeting || GREETING;
      BOTTOM_OFFSET = serverConfig.bottomOffset ?? BOTTOM_OFFSET;
      H_MARGIN = serverConfig.horizontalMargin ?? H_MARGIN;
      PERSONA = serverConfig.persona || PERSONA;
    }

    // Data attributes override server config
    if (ATTR_POSITION) POSITION = ATTR_POSITION;
    if (ATTR_BUBBLE_IMAGE) BUBBLE_IMAGE = ATTR_BUBBLE_IMAGE;
    if (ATTR_BRAND_COLOR) BRAND_COLOR = ATTR_BRAND_COLOR;
    if (ATTR_GREETING) GREETING = ATTR_GREETING;
    if (ATTR_BOTTOM_OFFSET) BOTTOM_OFFSET = parseInt(ATTR_BOTTOM_OFFSET) || 0;
    if (ATTR_H_MARGIN) H_MARGIN = parseInt(ATTR_H_MARGIN) || 40;
    if (ATTR_PERSONA) PERSONA = ATTR_PERSONA;
  }

  async function init() {
    if (!CLIENT_ID) {
      console.error('Chat widget: data-client-id attribute is required');
      return;
    }

    // Fetch config from server
    const serverConfig = await fetchConfig();
    applyConfig(serverConfig);

    const styleEl = document.createElement('style');
    styleEl.textContent = buildStyles();
    document.head.appendChild(styleEl);

    const bubble = document.createElement('div');
    bubble.id = ID.bubble;
    if (BUBBLE_IMAGE) {
      bubble.classList.add('has-image');
      bubble.innerHTML = `<img src="${BUBBLE_IMAGE}" alt="Chat">`;
    } else {
      bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
    }
    document.body.appendChild(bubble);

    if (BUBBLE_IMAGE) {
      const speech = document.createElement('div');
      speech.id = ID.speech;
      speech.textContent = GREETING || 'Ask me anything!';
      document.body.appendChild(speech);
      speech.addEventListener('click', toggleChat);

      // Auto-hide speech bubble after 6 seconds
      setTimeout(() => {
        speechAutoHidden = true;
        if (!isOpen) speech.classList.add('auto-hidden');
      }, 6000);

      // Show speech on bubble hover, hide on mouse leave
      bubble.addEventListener('mouseenter', () => {
        if (!isOpen) speech.classList.remove('auto-hidden');
      });
      bubble.addEventListener('mouseleave', () => {
        if (!isOpen) speech.classList.add('auto-hidden');
      });
    }

    const chatWindow = document.createElement('div');
    chatWindow.id = ID.window;
    chatWindow.innerHTML = `
      <div class="chat-header">
        <button id="${ID.newChat}">New chat</button>
        <button id="${ID.close}">&times;</button>
      </div>
      <div id="${ID.messages}"></div>
      <div id="${ID.inputArea}">
        <textarea id="${ID.input}" placeholder="Ask a question..." rows="1"></textarea>
        <button id="${ID.send}">Send</button>
      </div>
    `;
    document.body.appendChild(chatWindow);

    bubble.addEventListener('click', toggleChat);
    document.getElementById(ID.close).addEventListener('click', toggleChat);
    document.getElementById(ID.newChat).addEventListener('click', resetChat);
    document.getElementById(ID.send).addEventListener('click', sendMessage);
    document.getElementById(ID.input).addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Restore state from sessionStorage
    if (loadState()) {
      restoreMessages();
      if (isOpen) {
        chatWindow.classList.add('open');
        const speechBubble = document.getElementById(ID.speech);
        if (speechBubble) speechBubble.classList.add('hidden');
        // Notify other widgets that we're open
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chat-widget-toggle', {
            detail: { widgetId: WIDGET_ID, isOpen: true }
          }));
        }, 0);
      }
    }
  }

  function toggleChat() {
    const chatWindow = document.getElementById(ID.window);
    chatWindow.classList.toggle('open');
    isOpen = chatWindow.classList.contains('open');

    const bubble = document.getElementById(ID.bubble);
    bubble.classList.toggle('chat-open', isOpen);

    const speech = document.getElementById(ID.speech);
    if (speech) {
      speech.classList.toggle('hidden', isOpen);
      // Keep speech auto-hidden when closing if timer already fired
      if (!isOpen && speechAutoHidden) {
        speech.classList.add('auto-hidden');
      }
    }

    // Notify other widgets that a chat opened/closed
    window.dispatchEvent(new CustomEvent('chat-widget-toggle', {
      detail: { widgetId: WIDGET_ID, isOpen }
    }));

    if (!hasGreeted && isOpen) {
      hasGreeted = true;
      showGreeting();
    }
    saveState();
  }

  // Listen for other widgets opening/closing
  window.addEventListener('chat-widget-toggle', (e) => {
    if (e.detail.widgetId === WIDGET_ID) return; // Ignore our own events

    const speech = document.getElementById(ID.speech);
    const chatWindow = document.getElementById(ID.window);

    if (e.detail.isOpen) {
      // Another widget opened - close our chat and hide speech bubble
      if (chatWindow && isOpen) {
        chatWindow.classList.remove('open');
        isOpen = false;
        saveState();
      }
      if (speech) speech.classList.add('hidden');
    } else if (!isOpen) {
      // Another widget closed and ours isn't open - show our speech bubble
      if (speech) speech.classList.remove('hidden');
    }
  });

  function showGreeting() {
    let greetingText;
    if (GREETING) {
      greetingText = GREETING;
    } else {
      const hour = new Date().getHours();
      if (hour < 12) greetingText = "Good morning! How can I help you today?";
      else if (hour < 17) greetingText = "Good afternoon! How can I help you today?";
      else greetingText = "Good evening! How can I help you today?";
    }
    addMessage(greetingText, 'bot');
    conversationHistory.push({ role: 'assistant', content: greetingText });
    saveState();
  }

  async function sendMessage() {
    const input = document.getElementById(ID.input);
    const sendBtn = document.getElementById(ID.send);
    const text = input.value.trim();
    if (!text || isWaitingForResponse) return;

    isWaitingForResponse = true;
    addMessage(text, 'user');
    conversationHistory.push({ role: 'user', content: text });
    saveState();
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    const loadingMsg = addLoadingIndicator();

    try {
      // Get user's local time and timezone for time-aware responses
      const now = new Date();
      const userTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const userDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          widgetId: WIDGET_ID,
          message: text,
          sessionId: SESSION_ID,
          history: conversationHistory,
          persona: PERSONA,
          userTime: `${userDay} ${userTime}`,
          userTimezone: userTimezone
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
      conversationHistory.push({ role: 'assistant', content: data.reply });
      saveState();
    } catch (err) {
      loadingMsg.remove();
      addMessage('Unable to connect. Please check your internet and try again.', 'bot');
      console.error('Chat widget error:', err);
    } finally {
      isWaitingForResponse = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function addLoadingIndicator() {
    const messages = document.getElementById(ID.messages);
    const msg = document.createElement('div');
    msg.className = 'chat-message bot loading';
    msg.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  function addMessage(text, className) {
    const messages = document.getElementById(ID.messages);
    const msg = document.createElement('div');
    msg.className = `chat-message ${className}`;

    if (className.includes('bot') && !className.includes('loading')) {
      let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, '<br>');
      html = html.replace(/(^|[^"'>])(https?:\/\/[^\s<"'—–]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
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
