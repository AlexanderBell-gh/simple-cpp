# simple-cpp

Minimal CPU-only llama.cpp launcher (Zero-Code Integration).

## Overview

A PyWebView desktop application that manages official `llama-server.exe` as a subprocess for local LLM inference. No modifications to llama.cpp, no `llama-cpp-python`, no FastAPI. The Python backend hosts a local HTML/CSS/JS frontend inside a desktop window and controls the server over HTTP. No GPU offloading — pure CPU inference with `--n-gpu-layers 0`.

## Status

- UI shell and PyWebView bridge exist (`app.py`, `ui/`), including a native `.gguf` file picker.
- Server manager (`server/manager.py`) is still a stub; launch wiring is TODO.
- Packaging (`build.bat`) is under repair; see planning docs for the corrected command.

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

## Project layout

- `app.py` — PyWebView entry point and `SimpleAPI` JS bridge.
- `ui/` — Frontend assets (`index.html`, `style.css`, `webview.js`).
- `server/manager.py` — Subprocess manager for `llama-server.exe` (stub, HTTP implementation pending).
- `bin/` — Local-only drop-in folder for the official release bundle (not committed).
- `build.bat` — Windows packaging script (pending fix).
