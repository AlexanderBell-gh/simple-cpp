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

document.addEventListener('DOMContentLoaded', () => {
  setStatus('Server Status: Idle');

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
        } else {
          setStatus('Server launched');
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
