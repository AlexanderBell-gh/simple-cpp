@echo off
title SimpleCPP Production Compilation Build Pipeline
echo ===================================================
echo [SimpleCPP Build System] Initiating standalone packaging...
echo ===================================================

:: Ensure dependencies are installed via uv (project is uv-managed)
uv sync --quiet

:: Flush previous build artifacts
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

:: Package application: app.py entry, bundle ui/ and user-supplied bin/
uv run pyinstaller --noconsole --clean --onefile --name "SimpleCPP" --add-data "ui;ui" --add-data "bin;bin" app.py

echo ===================================================
echo [SimpleCPP Build System] Pipeline processing complete.
echo Production standalone build ready at: dist/SimpleCPP.exe
echo NOTE: bin/ content comes from your local official llama.cpp release ZIP, not from git.
echo ===================================================
pause
