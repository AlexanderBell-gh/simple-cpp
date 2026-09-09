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

// Chat button state. Server URL comes from backend; button enables only
// when server runs and binary serves embedded llama-ui.
let serverUrl = '';
let uiAvailable = false;

function refreshOpenChatButton() {
  const btn = document.getElementById('open-chat-btn');
  const hint = document.getElementById('chat-hint');
  if (!btn || !hint) {
    return;
  }
  if (serverUrl && uiAvailable) {
    btn.disabled = false;
    hint.textContent = 'Chat UI ready.';
  } else if (serverUrl && !uiAvailable) {
    btn.disabled = true;
    hint.textContent = 'Server running, but this binary serves no embedded chat UI.';
  } else {
    btn.disabled = true;
    hint.textContent = 'Launch the server to open the chat UI.';
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

document.addEventListener('DOMContentLoaded', () => {
  setStatus('Server Status: Idle');
  refreshOpenChatButton();

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
        refreshOpenChatButton();
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
        refreshOpenChatButton();
      } catch (err) {
        setStatus('Error stopping server.');
      }
    });
  }

  const openChatBtn = document.getElementById('open-chat-btn');
  if (openChatBtn) {
    openChatBtn.addEventListener('click', async () => {
      const api = bridge();
      if (!api) {
        setStatus('Error: application bridge unavailable.');
        return;
      }
      await syncServerUrl();
      refreshOpenChatButton();
      if (!serverUrl || !uiAvailable) {
        return;
      }
      try {
        const result = await api.open_chat_ui();
        if (result && typeof result === 'object' && !result.ok) {
          setStatus(result.message || 'Could not open chat UI.');
        }
      } catch (err) {
        setStatus('Error opening chat UI.');
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
