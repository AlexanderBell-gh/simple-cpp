@echo off
title SimpleCPP Production Compilation Build Pipeline
echo ===================================================
echo [SimpleCPP Build System] Initiating standalone packaging...
echo ===================================================

:: Load base operational requirements silently
pip install pywebview pyinstaller --quiet

:: Flush previous build artifacts dynamically
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

:: Package application directory including our static offline 'ui' folder assets
pyinstaller --noconsole --onefile --name="SimpleCPP" --add-data "ui;ui" launcher.py

echo ===================================================
echo [SimpleCPP Build System] Pipeline processing complete.
echo Production standalone build ready at: dist/SimpleCPP.exe
echo ===================================================
pause
