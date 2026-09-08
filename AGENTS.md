# simple-cpp — Agent Guide

## Session Start
> **Rule**: Activate the `/caveman` Skill at `full` intensity

## Tech Stack

| Layer | Stack |
|-------|-------|
| Framework | PyWebView (EdgeChromium) |
| Backend | Python 3.14+ |
| Server | llama.cpp Windows release (`llama-server.exe`) |
| Packaging | PyInstaller 6.22.2 |
| Package mgr | `uv` (no pip/npx — use `uv exec`) |

## Commands

```bash
uv sync              # install deps: pywebview, pyinstaller
uv run app.py        # local dev server
pyinstaller ...app.py   # bundle to single exe (Windows only)
```

**No test framework exists.** There are no test scripts, test configs, or test files.

## Verify before committing

CI mirrors local workflow: lint is not enforced, but PyInstaller requires the bundled binaries. Ensure `bin/llama-server.exe` and its DLLs (`ggml.dll`, `llama.dll`) are present before packaging.

```bash
uv sync && uv run app.py  # quick local check
```

## Repository structure

> **simple-cpp repo root**: `/mnt/c/Users/Development/Documents/simple-cpp`

```
app.py                 # PyWebView entry point, SimpleAPI JS bridge
ui/                   # Frontend: index.html, style.css, webview.js
server/              # llama.cpp manager
  __init__.py         # exports ServerManager
  manager.py          # launch/shutdown HTTP, always --n-gpu-layers 0
logs/                 # gitignored; runtime server.log
bin/                  # gitignored; drop-in for extracted llama.cpp release
build.bat             # Windows-only PyInstaller bundle script
pyproject.toml        # uv project config (package = false)
```

- Entry: `app.py` runs the WebView UI.
- Settings form wires to `js_api`; no direct HTTP calls from client.
- `server/manager.py` spawns `llama-server.exe` in `bin/`, polls `/health`, and logs to `logs/server.log`.
- `bin/` must be populated locally before launching; never committed.

## Key gotchas

- **CPU-only**: `--n-gpu-layers 0` removed (caused crash on CPU builds). Use `-t N` for thread count instead.
- **CLI flags**: `--temp`, `--repeat-penalty`, `-n` (not `--max-tokens`).
- **PyInstaller bundling**: use `build.bat` on Windows with `--add-data "ui;ui"` and `--add-data "bin;bin"`.
- **uv only**: npm/pip not available; use `uv exec` for one-off installs.
- **No stdin-pipe**: control is via HTTP endpoints only.

## Discovering recent changes

```bash
git log -n 5 --stat           # last 5 commits with file stats
git status                    # uncommitted changes
git diff                      # unstaged changes
git diff --cached             # staged changes
```

## External Documentation

- Planning docs: `/home/wsl/Repositories/markdowns/simpleCPP-markdowns/planning`

## Session Lifecycle Rules

### Multi-Doc Conclusion Protocol
Whenever the user says "lets finish up and update the docs", you MUST perform the following documentation updates before stopping:

1. **Update MEMORY.md:**
   * Insert a reverse-chronological entry directly under the `## Session History` header.
   * Location: `/home/wsl/Repositories/markdowns/simpleCPP-markdowns/MEMORY.md`
 
 ### **Format:**
     ### 📝 [DD-MM-YYYY] @ [GMT HH:MM 24-hr] | [Short Session Title]
     * **Changes:** [One-sentence summary of what was accomplished].
     * **Impacted Files:** `[file_1.ext]`, `[file_2.ext]`.
     * **Left Off At:** [One-sentence summary of outstanding next steps].

2. **Update CONTEXT.md:**
   * Review the current architectural state, tech stack details, or data flows.
   * Update any outdated sections to reflect the exact state of the codebase at the end of this session.
   * Location: `/home/wsl/Repositories/markdowns/simpleCPP-markdowns/CONTEXT.md`

3. **Update README.md:**
   * Review `README.md`. If the session introduced new features, configuration keys (`.env`), or changed installation/build commands, update those specific sections. Do not alter stable project descriptions unless explicitly relevant.
   * Location: `/mnt/c/Users/Development/Documents/simple-cpp/README.md`

4. **Guard AGENTS.md (Strict Rule):**
   * **DO NOT** update `AGENTS.md` unless it is completely necessary. 
   * Updates to this file are strictly reserved for critical, sweeping architectural shifts, fundamental changes to the core tech stack, or major global project rules. Do not modify it for routine features, refactors, or bug fixes - this is to be kept very lean.
   * Location: `/mnt/c/Users/Development/Documents/simple-cpp/AGENTS.md`
