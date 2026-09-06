# simple-cpp

Minimal CPU-only llama.cpp launcher (Zero-Code Integration).

## Overview

A PyWebView desktop application that manages official `llama-server.exe` as a subprocess for local LLM inference. No modifications to llama.cpp, no `llama-cpp-python`, no FastAPI. The Python backend hosts a local HTML/CSS/JS frontend inside a desktop window and controls the server over HTTP. No GPU offloading — pure CPU inference with `--n-gpu-layers 0`.

## Status

- Phase 1 complete: skeleton plus CustomTkinter-to-PyWebView migration record.
- Phase 2 complete: full settings form (`ui/index.html`), `js_api`-only bridge (`ui/webview.js`), `SimpleAPI` with file picker plus status-dict `launch_engine` / `stop_engine` stubs (`app.py`). Live window test needs a Windows host and moves with Phase 3.
- Phase 3 open: `server/manager.py` HTTP implementation, `SimpleAPI` wiring, `build.bat` fix.

Detailed architecture, flag mapping, and honest phase checklists live in `/home/wsl/Projects/markdowns/simpleCPP-markdowns/planning/` (`PROJECT.md`, `PHASE-1.md`, `PHASE-2.md`, `PHASE-3.md`).

## Quickstart

Requirements: Python `>=3.14`, `uv`, Windows with WebView2 for the EdgeChromium renderer.

```bash
uv sync
```

Download the official llama.cpp Windows release ZIP and extract `llama-server.exe` plus its DLLs directly into `bin/`:

```text
simple-cpp/
└── bin/
    ├── llama-server.exe
    ├── ggml.dll
    ├── llama.dll
    └── ...
```

`bin/` is gitignored and stays local-only. It must be ready before launch tests because the manager runs with `cwd=BIN_DIR` so Windows resolves the runtime DLLs.

Run locally:

```bash
uv run app.py
```

Pick a `.gguf` model in the UI. Full launch control lands with Phase 3.

## Build

After the Phase 3 `build.bat` fix, the standalone Windows build is:

```cmd
pyinstaller --onefile --name SimpleCPP --add-data "ui;ui" --add-data "bin;bin" app.py
```

Output: `dist/SimpleCPP.exe`, bundling the `ui/` assets and your local `bin/` release files.

## Credits

Inference is powered by [llama.cpp](https://github.com/ggerganov/llama.cpp) (Georgi Gerganov and contributors, MIT licensed). This project ships no inference code of its own: it wraps the official unmodified `llama-server` Windows binary in a CPU-focused settings UI, in the spirit of tools like KoboldCpp (a separate project by LostRuins, no affiliation).

License duty: the `bin/` bundle redistributes llama.cpp binaries, so packaged builds must include llama.cpp's own `LICENSE` file next to them. Keep the upstream license text when copying a release ZIP into `bin/` and when bundling via PyInstaller.

## Project layout

- `app.py` — PyWebView entry point and `SimpleAPI` JS bridge (`browse_for_model`, `launch_engine`, `stop_engine`).
- `ui/` — Full settings form (`index.html`), styles (`style.css`), `js_api` bridge logic (`webview.js`).
- `server/manager.py` — Subprocess manager for `llama-server.exe` (stub, HTTP implementation pending).
- `bin/` — Local-only drop-in folder for the official release bundle (not committed).
- `build.bat` — Windows packaging script (pending fix).
