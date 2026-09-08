// PyWebView UI bridge for SimpleCPP.
// Single control path: pywebview.js_api. No HTTP fallback.

function setStatus(message) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function bridge() {
  if (window.pywebview && window.pywebview.api) {
    return window.pywebview.api;
  }
  return null;
}

function readNumber(id, fallback) {
  const el = document.getElementById(id);
  if (!el) {
    return fallback;
  }
  const raw = el.value.trim();
  if (raw === '') {
    return fallback;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

function readText(id, fallback) {
  const el = document.getElementById(id);
  if (!el) {
    return fallback;
  }
  const raw = el.value.trim();
  return raw === '' ? fallback : raw;
}

function collectConfig() {
  const stopRaw = readText('stop-sequences', '');
  return {
    model_path: readText('model-path', ''),
    port: readNumber('port', 8080),
    n_threads: readNumber('n-threads', 8),
    ctx_size: readNumber('ctx-size', 4096),
    batch_size: readNumber('batch-size', 512),
    seed: readNumber('seed', 0),
    temperature: readNumber('temperature', 0.7),
    top_k: readNumber('top-k', 40),
    top_p: readNumber('top-p', 0.9),
    repetition_penalty: readNumber('repetition-penalty', 1.1),
    max_tokens: readNumber('max-tokens', 2048),
    stop: stopRaw ? stopRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [],
  };
}

// Chat tab state. Server URL comes from the backend; the iframe is only
// ever pointed at a running server. Set true to jump to Chat on launch.
const AUTO_SWITCH_TO_CHAT = false;
let serverUrl = '';
let uiAvailable = false;

function setTab(name) {
  const configTab = document.getElementById('tab-config');
  const chatTab = document.getElementById('tab-chat');
  const configView = document.getElementById('view-config');
  const chatView = document.getElementById('view-chat');
  const showChat = name === 'chat';
  if (configTab) {
    configTab.classList.toggle('active', !showChat);
    configTab.setAttribute('aria-selected', String(!showChat));
  }
  if (chatTab) {
    chatTab.classList.toggle('active', showChat);
    chatTab.setAttribute('aria-selected', String(showChat));
  }
  if (configView) configView.hidden = showChat;
  if (chatView) chatView.hidden = !showChat;
}

function refreshChatPane() {
  const frame = document.getElementById('chat-frame');
  const hint = document.getElementById('chat-hint');
  const chatTab = document.getElementById('tab-chat');
  if (!frame || !hint || !chatTab) {
    return;
  }
  if (serverUrl && uiAvailable) {
    if (frame.getAttribute('src') !== serverUrl) {
      frame.setAttribute('src', serverUrl);
    }
    frame.hidden = false;
    hint.hidden = true;
    chatTab.disabled = false;
  } else if (serverUrl && !uiAvailable) {
    frame.removeAttribute('src');
    frame.hidden = true;
    hint.hidden = false;
    hint.textContent = 'Server running, but this binary serves no embedded chat UI.';
    chatTab.disabled = true;
  } else {
    frame.removeAttribute('src');
    frame.hidden = true;
    hint.hidden = false;
    hint.textContent = 'Launch the server to open the chat UI.';
    chatTab.disabled = true;
  }
}

async function syncServerUrl() {
  const api = bridge();
  if (!api || typeof api.get_server_url !== 'function') {
    return;
  }
  try {
    const result = await api.get_server_url();
    if (result && result.ok && result.url) {
      serverUrl = result.url;
    } else {
      serverUrl = '';
    }
  } catch (err) {
    serverUrl = '';
  }
}

function initTabs() {
  const configTab = document.getElementById('tab-config');
  const chatTab = document.getElementById('tab-chat');
  if (configTab) {
    configTab.addEventListener('click', () => setTab('config'));
  }
  if (chatTab) {
    chatTab.addEventListener('click', async () => {
      if (chatTab.disabled) {
        return;
      }
      await syncServerUrl();
      refreshChatPane();
      if (serverUrl && uiAvailable) {
        setTab('chat');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setStatus('Server Status: Idle');
  initTabs();
  refreshChatPane();

  const browseBtn = document.getElementById('browse-btn');
  if (browseBtn) {
    browseBtn.addEventListener('click', async () => {
      const api = bridge();
      if (!api) {
        setStatus('Error: application bridge unavailable.');
        return;
      }
      try {
        const path = await api.browse_for_model();
        if (path) {
          document.getElementById('model-path').value = path;
          setStatus('Server Status: Idle');
        }
      } catch (err) {
        setStatus('Error browsing for model.');
      }
    });
  }

  const launchBtn = document.getElementById('launch-btn');
  if (launchBtn) {
    launchBtn.addEventListener('click', async () => {
      const api = bridge();
      if (!api) {
        setStatus('Error: application bridge unavailable.');
        return;
      }
      const config = collectConfig();
      if (!config.model_path) {
        setStatus('Error: Model path not set. Use Browse to select a .gguf file.');
        return;
      }
      setStatus('Launching server...');
      try {
        const result = await api.launch_engine(JSON.stringify(config));
        if (result && typeof result === 'object') {
          setStatus(result.message || (result.ok ? 'Server launched' : 'Launch failed'));
          if (result.ok && result.url) {
            serverUrl = result.url;
            uiAvailable = result.ui_available !== false;
          } else if (!result.ok) {
            serverUrl = '';
            uiAvailable = false;
          }
        } else {
          setStatus('Server launched');
          await syncServerUrl();
          uiAvailable = true;
        }
        refreshChatPane();
        if (AUTO_SWITCH_TO_CHAT && serverUrl && uiAvailable) {
          setTab('chat');
        }
      } catch (err) {
        setStatus('Error communicating with backend.');
      }
    });
  }

  const stopBtn = document.getElementById('stop-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      const api = bridge();
      if (!api) {
        setStatus('Error: application bridge unavailable.');
        return;
      }
      try {
        const result = await api.stop_engine();
        if (result && typeof result === 'object') {
          setStatus(result.message || 'Server stopped');
        } else {
          setStatus('Server stopped');
        }
        serverUrl = '';
        uiAvailable = false;
        refreshChatPane();
        setTab('config');
      } catch (err) {
        setStatus('Error stopping server.');
      }
    });
  }

  const bestConfigBtn = document.getElementById('best-config-btn');
  if (bestConfigBtn) {
    bestConfigBtn.addEventListener('click', async () => {
      const api = bridge();
      if (!api) {
        setStatus('Error: application bridge unavailable.');
        return;
      }
      const config = collectConfig();
      if (!config.model_path) {
        setStatus('Error: Model path not set. Use Browse to select a .gguf file.');
        return;
      }
      setStatus('Opening Google AI Mode with suggested settings...');
      try {
        const result = await api.find_best_config(JSON.stringify(config));
        if (result && typeof result === 'object') {
          setStatus(result.message || 'Opened Google AI Mode with suggested settings.');
        } else {
          setStatus('Opened Google AI Mode with suggested settings.');
        }
      } catch (err) {
        setStatus('Error opening Google AI Mode.');
      }
    });
  }
});
