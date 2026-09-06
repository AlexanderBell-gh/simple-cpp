// Minimal JS scaffolding for the PyWebView UI
// (future: bind form fields, send commands to a backend API)

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = 'Server Status: Idle';
  }

  // Hook up launch button
  const btn = document.querySelector('#launch-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      // Gather inputs from the form
      const nThreads = document.getElementById('n-threads')?.value?.trim() ?? '8';
      const ctxSize = document.getElementById('ctx-size')?.value?.trim() ?? '4096';
      const batchSize = document.getElementById('batch-size')?.value?.trim() ?? '512';
      const seed = document.getElementById('seed')?.value?.trim() ?? '0';
      const temperature = document.getElementById('temperature')?.value?.trim() ?? '0.7';
      const topK = document.getElementById('top-k')?.value?.trim() ?? '40';
      const topP = document.getElementById('top-p')?.value?.trim() ?? '0.9';
      const repeatPenalty = document.getElementById('repetition-penalty')?.value?.trim() ?? '1.1';
      const maxTokens = document.getElementById('max-tokens')?.value?.trim() ?? '2048';
      const modelPath = document.getElementById('model-path')?.value?.trim();
      const stopSeq = document.getElementById('stop-sequences')?.value?.trim();

      // Validate model path exists
      if (!modelPath) {
        statusEl.textContent = 'Error: Model path not set.';
        return;
      }
      fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelPath,
          args: [
            '--n-gpu-layers', '0',
            '--n-threads', nThreads,
            '--ctx-size', ctxSize,
            '--batch-size', batchSize,
            '--seed', seed,
            '-m', modelPath,
            '--port', '8080',
            '--temp', temperature,
            '--top-k', topK,
            '--top-p', topP,
            '--repeat-penalty', repeatPenalty,
            '-n', maxTokens,
          ],
          stop: stopSeq ? stopSeq.split('\n').map(s => s.trim()).filter(Boolean) : [],
        }),
      })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          statusEl.textContent = `Error: ${data.error}`;
        } else {
          statusEl.textContent = data.message || 'Server launched';
        }
      })
      .catch(() => {
        statusEl.textContent = 'Error communicating with backend.';
      });
    });
  }

  // Hook up stop button
  const stopBtn = document.querySelector('#stop-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      fetch('/api/stop')
        .then(r => r.json())
        .then(data => {
          statusEl.textContent = data.message || 'Server stopped';
        })
        .catch(() => {
          statusEl.textContent = 'Error stopping server.';
        });
    });
  }
});
