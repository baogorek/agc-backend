(function() {
  const scriptTag = document.currentScript;
  const CLIENT_ID = scriptTag.getAttribute('data-client-id');
  const SUPABASE_URL = 'https://rukppthsduuvsfjynfmw.supabase.co';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat`;

  const SESSION_ID = crypto.randomUUID();
  let hasGreeted = false;

  const styles = `
    #chat-widget-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: #2563eb;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      transition: transform 0.2s;
    }
    #chat-widget-bubble:hover {
      background: #1d4ed8;
      transform: scale(1.05);
    }
    #chat-widget-bubble svg { width: 28px; height: 28px; fill: white; }

    #chat-widget-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      display: none;
      flex-direction: column;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #chat-widget-window.open { display: flex; }

    #chat-widget-header {
      background: #2563eb;
      color: white;
      padding: 16px;
      border-radius: 12px 12px 0 0;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #chat-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    #chat-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
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
      background: #2563eb;
      color: white;
      margin-left: auto;
    }
    .chat-message.bot {
      background: #f1f5f9;
      color: #1e293b;
    }
    .chat-message.bot a {
      color: #2563eb;
      text-decoration: underline;
    }
    .chat-message.loading {
      color: #64748b;
      font-style: italic;
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
    #chat-widget-input:focus { border-color: #2563eb; }
    #chat-widget-send {
      margin-left: 8px;
      padding: 10px 16px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    #chat-widget-send:hover { background: #1d4ed8; }
    #chat-widget-send:disabled { background: #94a3b8; cursor: not-allowed; }

    @media (max-width: 480px) {
      #chat-widget-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        right: 10px;
        bottom: 80px;
      }
    }
  `;

  function init() {
    if (!CLIENT_ID) {
      console.error('Chat widget: data-client-id attribute is required');
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const bubble = document.createElement('div');
    bubble.id = 'chat-widget-bubble';
    bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
    document.body.appendChild(bubble);

    const chatWindow = document.createElement('div');
    chatWindow.id = 'chat-widget-window';
    chatWindow.innerHTML = `
      <div id="chat-widget-header">
        <span>Chat Assistant</span>
        <button id="chat-widget-close">&times;</button>
      </div>
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

    if (!hasGreeted && chatWindow.classList.contains('open')) {
      hasGreeted = true;
      showGreeting();
    }
  }

  function showGreeting() {
    const hour = new Date().getHours();
    let timeGreeting = "Hey there!";
    if (hour < 12) timeGreeting = "Good morning!";
    else if (hour < 17) timeGreeting = "Good afternoon!";
    else timeGreeting = "Good evening!";

    addMessage(`${timeGreeting} How can I help you today?`, 'bot');
  }

  async function sendMessage() {
    const input = document.getElementById('chat-widget-input');
    const sendBtn = document.getElementById('chat-widget-send');
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;

    const loadingMsg = addMessage('Typing...', 'bot loading');

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
