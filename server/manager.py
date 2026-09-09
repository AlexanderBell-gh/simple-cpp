"""Server manager for SimpleCPP — llama-server.exe via HTTP control."""

import json
import subprocess
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

BIN_DIR = Path(__file__).parent.parent / "bin"
LLAMA_SERVER_PATH = BIN_DIR / "llama-server.exe"
LOG_DIR = Path(__file__).parent.parent / "logs"
HEALTH_POLL_TIMEOUT = 120  # seconds
HEALTH_POLL_INTERVAL = 1.0  # seconds between checks


class ServerManager:
    """Manages llama-server.exe as a subprocess with HTTP control."""

    def __init__(self) -> None:
        self._proc: subprocess.Popen | None = None
        self._port: int = 8080
        self._log_file = None

    def _log(self, msg: str) -> None:
        line = f"[ServerManager] {msg}\n"
        print(line, end="")
        if self._log_file and not self._log_file.closed:
            self._log_file.write(line)
            self._log_file.flush()

    @property
    def base_url(self) -> str:
        """Public root URL of the managed server. The embedded llama-ui lives here."""
        return f"http://127.0.0.1:{self._port}"

    def _probe_path(self, path: str) -> tuple[bool, str]:
        """Probe one UI path. Returns (available, reason)."""
        try:
            req = urllib.request.Request(
                self.base_url + path,
                # Default UI builds gzip assets and answer 415 without this header.
                headers={"Accept-Encoding": "gzip"},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                ctype = resp.headers.get("Content-Type", "")
                ok = resp.status == 200 and "text/html" in ctype
                return ok, f"{path}: {resp.status} {ctype or 'no content-type'}"
        except urllib.error.HTTPError as e:
            return False, f"{path}: HTTP {e.code}"
        except OSError as e:
            return False, f"{path}: {type(e).__name__}: {e}"

    def _probe_ui(self) -> tuple[bool, str]:
        """Check whether this binary serves the embedded web UI.

        Returns (available, reason). The reason is logged and surfaced in
        the launch result for diagnosis.
        """
        for path in ("/", "/index.html"):
            ok, reason = self._probe_path(path)
            if ok:
                return True, reason
            last_reason = reason
        return False, last_reason

    def launch(self, cfg: dict[str, Any]) -> dict[str, Any]:
        """Spawn llama-server.exe and block until health endpoint returns 200."""
        if not LLAMA_SERVER_PATH.exists():
            return {"ok": False, "message": f"llama-server.exe not found at {LLAMA_SERVER_PATH}"}

        model_path = cfg.get("model_path", "")
        if not model_path:
            return {"ok": False, "message": "Error: model path not provided."}

        # Stop any running server before (re)launch
        if self._proc is not None and self._proc.poll() is None:
            self.shutdown()

        self._port = int(cfg.get("port", 8080))

        # Open log file
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / "server.log"
        self._log_file = open(log_path, "w", encoding="utf-8")

        args = [
            str(LLAMA_SERVER_PATH),
            "-m", str(model_path),
            "-t", str(cfg.get("n_threads", 8)),
            "--ctx-size", str(cfg.get("ctx_size", 4096)),
            "--batch-size", str(cfg.get("batch_size", 512)),
            "--port", str(self._port),
        ]

        # Optional generation flags
        seed = cfg.get("seed")
        if seed is not None:
            args += ["--seed", str(seed)]

        temp = cfg.get("temperature")
        if temp is not None:
            args += ["--temp", str(temp)]

        top_k = cfg.get("top_k")
        if top_k is not None:
            args += ["--top-k", str(top_k)]

        top_p = cfg.get("top_p")
        if top_p is not None:
            args += ["--top-p", str(top_p)]

        repetition_penalty = cfg.get("repetition_penalty")
        if repetition_penalty is not None:
            args += ["--repeat-penalty", str(repetition_penalty)]

        max_tokens = cfg.get("max_tokens")
        if max_tokens is not None:
            args += ["-n", str(max_tokens)]

        # Map stop list to repeated --reverse-prompt entries
        stop_list = cfg.get("stop", [])
        for seq in stop_list:
            args += ["--reverse-prompt", str(seq)]

        self._log(f"Launching: {' '.join(args)}")
        self._log(f"CWD: {BIN_DIR}")

        try:
            self._proc = subprocess.Popen(
                args,
                cwd=str(BIN_DIR),
                stdout=self._log_file,
                stderr=subprocess.STDOUT,
            )
        except OSError as e:
            self._log(f"Failed to spawn: {e}")
            return {"ok": False, "message": f"Failed to start llama-server: {e}"}

        # Poll /health until 200 or timeout
        health_url = f"http://127.0.0.1:{self._port}/health"
        deadline = time.monotonic() + HEALTH_POLL_TIMEOUT

        self._log(f"Polling {health_url} (timeout {HEALTH_POLL_TIMEOUT}s)...")

        while time.monotonic() < deadline:
            if self._proc.poll() is not None:
                self._log(f"Process exited early with code {self._proc.returncode}")
                return {
                    "ok": False,
                    "message": f"llama-server exited unexpectedly (code {self._proc.returncode}). Check logs/server.log.",
                }
            try:
                req = urllib.request.Request(health_url)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        self._log("Health check passed — server ready.")
                        ui_available, ui_reason = self._probe_ui()
                        self._log(f"UI probe: {ui_reason}")
                        return {
                            "ok": True,
                            "message": f"Server ready on port {self._port}.",
                            "url": self.base_url,
                            "ui_available": ui_available,
                            "ui_reason": ui_reason,
                        }
            except (urllib.error.URLError, ConnectionRefusedError, OSError):
                pass
            time.sleep(HEALTH_POLL_INTERVAL)

        # Timeout — kill the process
        self._log("Health poll timed out, shutting down.")
        self.shutdown()
        return {
            "ok": False,
            "message": f"Server did not become ready within {HEALTH_POLL_TIMEOUT}s. Check logs/server.log.",
        }

    def shutdown(self) -> None:
        """Terminate the server process gracefully, kill on timeout."""
        if self._proc is None:
            return
        if self._proc.poll() is not None:
            self._proc = None
            return
        self._log("Shutting down server...")
        self._proc.terminate()
        try:
            self._proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self._log("Terminate timed out, killing process.")
            self._proc.kill()
            try:
                self._proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._log("Kill timed out, giving up.")
        self._log("Server stopped.")
        self._proc = None

    def chat_complete(self, messages: list[dict[str, Any]]) -> str:
        """Deferred — no caller in Phase 3."""
        raise NotImplementedError("chat_complete deferred to a future chat UI phase.")
