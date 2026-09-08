# simple-cpp

Minimal CPU-only llama.cpp launcher (Zero-Code Integration).

## Overview

A PyWebView desktop application that manages official `llama-server.exe` as a subprocess for local LLM inference. No modifications to llama.cpp, no `llama-cpp-python`, no FastAPI. The Python backend hosts a local HTML/CSS/JS frontend inside a desktop window and controls the server over HTTP. Pure CPU inference — the server runs with native CPU defaults.

## Status

- Phase 1 complete: skeleton plus CustomTkinter-to-PyWebView migration record.
- Phase 2 complete: full settings form (`ui/index.html`), dark-only orange theme (`ui/style.css`), `js_api`-only bridge (`ui/webview.js`), `SimpleAPI` with file picker, status-dict `launch_engine` / `stop_engine` stubs, and `find_best_config` (Google AI Mode, `app.py`). Live window test needs a Windows host and moves with Phase 3.
- Phase 3 complete: `ServerManager` HTTP implementation (`server/manager.py`, health poll with 120s timeout, `logs/server.log`), `SimpleAPI` wiring (`launch_engine` validates model file then delegates; `stop_engine` shuts down), fixed `build.bat` (`app.py`, `--noconsole`, `ui/` + `bin/`). Live Windows run verified.
- UI refresh: dark-only llama-ui design-token theme (`ui/style.css`, token source pinned in `DESIGN.md`), shadcn-style buttons (default/secondary/destructive, orange removed), and a Chat tab embedding the running server's own web UI (`get_server_url` bridge, iframe cleared on stop). Live Windows check open.


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

Pick a `.gguf` model in the UI, tune the CPU parameters, then Launch. The backend spawns `llama-server.exe` and blocks until `/health` reports ready.

## Build

Standalone Windows build via `build.bat`, or manually:

```cmd
pyinstaller --noconsole --clean --onefile --name SimpleCPP --add-data "ui;ui" --add-data "bin;bin" app.py
```

Output: `dist/SimpleCPP.exe`, bundling the `ui/` assets and your local `bin/` release files.

## Credits

Inference is powered by [llama.cpp](https://github.com/ggerganov/llama.cpp) (Georgi Gerganov and contributors, MIT licensed). This project ships no inference code of its own: it wraps the official unmodified `llama-server` Windows binary in a CPU-focused settings UI, in the spirit of tools like KoboldCpp (a separate project by LostRuins, no affiliation).

License duty: the `bin/` bundle redistributes llama.cpp binaries, so packaged builds must include llama.cpp's own `LICENSE` file next to them. Keep the upstream license text when copying a release ZIP into `bin/` and when bundling via PyInstaller.

## Project layout

- `app.py` — PyWebView entry point and `SimpleAPI` JS bridge (`browse_for_model`, `launch_engine`, `stop_engine`, `get_server_url`, `find_best_config`).
- `ui/` — Configurator + Chat tabs (`index.html`), dark-only llama-ui token theme (`style.css`), `js_api` bridge and tab/iframe logic (`webview.js`). The Chat tab embeds the server's own llama-ui at its root URL once launched.
- `server/manager.py` — Subprocess manager for `llama-server.exe` (HTTP health poll, `logs/server.log`, graceful shutdown).
- `bin/` — Local-only drop-in folder for the official release bundle (not committed).
- `build.bat` — Windows packaging script.
