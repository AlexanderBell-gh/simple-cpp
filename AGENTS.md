# simple-cpp — CPU-only llama.cpp launcher

## Overview

A lightweight, PyWebView UI application that manages `llama-server.exe` for local LLM inference. No GPU offloading; all settings are CPU parameters. The final product is a single Windows `.exe` built with PyInstaller that bundles both the web UI assets and the server release binaries.

Control transport: the primary UI path is the PyWebView `js_api` bridge (`SimpleAPI`), not HTTP endpoints. The backend controls `llama-server.exe` over HTTP (`GET /health`, `POST /v1/chat/completions`). Stdin-pipe control is rejected. `webview.js` uses `pywebview.api` exclusively; no `fetch('/api/*')` remains.

## Project layout

- **Root**: `/mnt/c/Users/Development/Desktop/simple-cpp`
  - `app.py` — PyWebView entry point with `SimpleAPI` JS bridge and EdgeChromium renderer. `browse_for_model` works via native file dialog. `launch_engine` validates config and returns a status dict (no window destroy); `stop_engine` stub added. Full manager wiring lands in Phase 3.
  - `ui/` — Web frontend assets (`index.html`, `style.css`, `webview.js`). Full settings form (all parameter inputs plus `port`, Browse row, Launch / Stop, `#status`) wired to `js_api`; DOM/JS IDs verified in sync.
  - `server/manager.py` — Stub backend for spawning and controlling `llama-server.exe`. All methods raise `NotImplementedError`. Full HTTP implementation lands in Phase 3.
  - `server/__init__.py` — Package init, re-exports `ServerManager`.
  - `bin/` — Gitignored drop-in folder, absent until the user extracts the official llama.cpp Windows release there (`llama-server.exe` plus runtime DLLs such as `ggml.dll` and `llama.dll`). The manager must run with `cwd=BIN_DIR` so Windows resolves those DLLs. Never committed.
  - `build.bat` — Windows batch script for PyInstaller packaging. Currently broken: it packages non-existent `launcher.py` and omits `bin/`. Must be fixed to target `app.py` with both `ui/` and `bin/`.
  - `pyproject.toml` — `uv`-managed project, `requires-python >=3.14`, dependencies `pywebview>=6.2.1` and `pyinstaller>=6.22.2`. App-only layout: `[tool.uv] package = false`, no `[build-system]`, no `[project.scripts]` entry; entry point is `app.py` run directly or frozen via PyInstaller.

- **Documentation**: `/home/wsl/Projects/markdowns/simpleCPP-markdowns/`
  - `planning/PROJECT.md` — Architecture overview, source truth, flag table, known gaps.
  - `planning/PHASE-1.md` — Project skeleton plus migration record (Complete).
  - `planning/PHASE-2.md` — PyWebView UI scaffolding, full form plus `js_api` bridge (Complete; live GUI run open).
  - `planning/PHASE-3.md` — Server manager HTTP design and packaging fix (Not started).

## --n-gpu-layers 0--

CPU-only builds should always pass `--n-gpu-layers 0` to `llama-server` in the `ServerManager`, along with the correct CLI flag names documented in `planning/PROJECT.md` (`--temp` not `--temperature`, `--repeat-penalty` not `--repetition-penalty`, `-n` not `--max-tokens`, `--reverse-prompt` per stop sequence).

## Build notes

- **Package manager**: Use `uv` (managed via `pyproject.toml`, initialized with `uv init`)
- Install dependencies:
  ```bash
  uv sync
  ```
  Or add explicitly:
  ```bash
  uv add "pywebview>=6.2.1" "pyinstaller>=6.22.2"
  ```
- Build on Windows using `build.bat` (after its Phase 3 fix) or run PyInstaller manually:
  ```cmd
  pyinstaller --onefile --name SimpleCPP --add-data "ui;ui" --add-data "bin;bin" app.py
  ```
- Run locally:
  ```bash
  uv run app.py
  ```
- Before launching: extract the official llama.cpp Windows release ZIP into `bin/` so `bin/llama-server.exe` is ready. The folder stays local-only and is never committed. Keep the upstream llama.cpp `LICENSE` in the bundle; redistribution requires it.

## Known gaps (see planning docs for detail)

1. `server/manager.py` is stub only (`Path` import and package re-export done) — Phase 3.
2. `SimpleAPI.launch_engine` / `stop_engine` return stub dicts; not wired to `ServerManager` — Phase 3.
3. `build.bat` targets missing `launcher.py` and omits `bin/` — Phase 3.
4. `src/` removed as dead code; `pyproject.toml` is app-only (`package = false`, no script entry).
5. Live window test needs Windows host plus WebView2 — Phase 3 entry check.
