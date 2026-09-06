# simple-cpp — CPU-only llama.cpp launcher

## Overview

A lightweight, PyWebView UI application that manages `llama-server.exe` for local LLM inference. No GPU offloading; all settings are CPU parameters. The final product is a single Windows `.exe` built with PyInstaller that bundles both the web UI assets and the server release binaries.

Control transport: the primary UI path is the PyWebView `js_api` bridge (`SimpleAPI`), not HTTP endpoints. The backend controls `llama-server.exe` over HTTP (`GET /health`, `POST /v1/chat/completions`). Stdin-pipe control is rejected. The legacy `fetch('/api/launch')` and `fetch('/api/stop')` calls in `webview.js` have no backend and must be replaced with `js_api` calls.

## Project layout

- **Root**: `/mnt/c/Users/Development/Desktop/simple-cpp`
  - `app.py` — PyWebView entry point with `SimpleAPI` JS bridge and EdgeChromium renderer. `browse_for_model` works via native file dialog. `launch_engine` is still a TODO stub: it parses JSON and destroys the window instead of calling the server manager.
  - `ui/` — Web frontend assets (`index.html`, `style.css`, `webview.js`). Shell page plus styles plus JS scaffolding exist, but `index.html` has no form controls matching the IDs `webview.js` queries.
  - `server/manager.py` — Stub backend for spawning and controlling `llama-server.exe`. All methods raise `NotImplementedError`. Currently missing the `Path` import, so construction raises `NameError`. Full HTTP implementation lands in Phase 3.
  - `server/__init__.py` — Package init. Does not yet re-export `ServerManager`.
  - `bin/` — Gitignored drop-in folder, absent until the user extracts the official llama.cpp Windows release there (`llama-server.exe` plus runtime DLLs such as `ggml.dll` and `llama.dll`). The manager must run with `cwd=BIN_DIR` so Windows resolves those DLLs. Never committed.
  - `build.bat` — Windows batch script for PyInstaller packaging. Currently broken: it packages non-existent `launcher.py` and omits `bin/`. Must be fixed to target `app.py` with both `ui/` and `bin/`.
  - `pyproject.toml` — `uv`-managed project, `requires-python >=3.14`, dependencies `pywebview>=6.2.1` and `pyinstaller>=6.22.2`. App-only layout: `[tool.uv] package = false`, no `[build-system]`, no `[project.scripts]` entry; entry point is `app.py` run directly or frozen via PyInstaller.

- **Documentation**: `/home/wsl/Projects/markdowns/simpleCPP-markdowns/`
  - `planning/PROJECT.md` — Architecture overview, source truth, flag table, known gaps.
  - `planning/PHASE-1.md` — Project skeleton plus migration record (Complete).
  - `planning/PHASE-2.md` — PyWebView UI scaffolding correction (Partial).
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
- Before launching: extract the official llama.cpp Windows release ZIP into `bin/` so `bin/llama-server.exe` is ready. The folder stays local-only and is never committed.

## Known gaps (see planning docs for detail)

1. `server/manager.py` is stub only (`Path` import and package re-export done).
2. `ui/index.html` missing form controls referenced by `webview.js`.
3. No backend for `fetch('/api/launch')` / `fetch('/api/stop')`; use `js_api` instead.
4. `SimpleAPI.launch_engine` not wired to `ServerManager`.
5. `build.bat` targets missing `launcher.py` and omits `bin/`.
6. `src/` removed as dead code; `pyproject.toml` is app-only (`package = false`, no script entry).
