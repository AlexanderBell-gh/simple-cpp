"""Server manager stub – will be implemented in Phase 3."""

from pathlib import Path

class ServerManager:
    """Manages llama-server.exe as a subprocess with JSON-RPC control."""
    def __init__(self, model_path: Path):
        self.model_path = model_path
        self._proc = None

    def launch(self, args: list[str]) -> None:
        raise NotImplementedError("Full implementation in Phase 3")

    def apply_config(self, config: dict) -> dict:
        """Send settings to the running server via JSON-RPC."""
        raise NotImplementedError

    def chat_complete(self, messages: list[dict]) -> str:
        """Proxy call to llama-server's /v1/chat/completions endpoint."""
        raise NotImplementedError

    def shutdown(self) -> None:
        if self._proc is not None:
            self._proc.terminate()
