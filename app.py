import os
import sys
import json
import urllib.parse
import webbrowser
import webview

from server.manager import ServerManager


class SimpleAPI:
    """Backend hooks exposed to the frontend via the PyWebView JS bridge."""
    def __init__(self):
        self._window = None
        self._manager = None
        self._chat_window = None

    def set_window(self, window):
        self._window = window

    def browse_for_model(self):
        """Open a native file dialog and return the selected .gguf path."""
        if not self._window:
            return ""

        file_types = ('Model Files (*.gguf)', 'All Files (*.*)')
        result = self._window.create_file_dialog(
            dialog_type=webview.OPEN_DIALOG,
            file_types=file_types,
            allow_multiple=False
        )

        # Returns selected path string or empty string
        return result[0] if result else ""

    def launch_engine(self, config_payload_json):
        """Validate config and spawn llama-server via ServerManager. Blocks until ready or timeout."""
        try:
            config = json.loads(config_payload_json)
            print(f"[SimpleCPP] Launch requested: {config}")

            model_path = config.get("model_path", "")
            if not model_path:
                return {"ok": False, "message": "Error: Model path not set."}

            if not os.path.isfile(model_path):
                return {"ok": False, "message": f"Error: Model file not found: {model_path}"}

            self._manager = ServerManager()
            return self._manager.launch(config)

        except Exception as e:
            print(f"[SimpleCPP ERROR] Configuration failure: {str(e)}")
            return {"ok": False, "message": f"Invalid configuration: {str(e)}"}

    def stop_engine(self):
        """Stop the server via ServerManager."""
        if self._chat_window is not None:
            try:
                self._chat_window.destroy()
            except Exception:
                pass
            self._chat_window = None
        if self._manager is None:
            return {"ok": False, "message": "Server not running."}
        try:
            self._manager.shutdown()
            self._manager = None
            return {"ok": True, "message": "Server stopped."}
        except Exception as e:
            return {"ok": False, "message": f"Error stopping server: {e}"}

    def get_server_url(self):
        """Return the running server root URL for the Open Chat UI button."""
        if self._manager is None:
            return {"ok": False, "message": "Server not running."}
        return {"ok": True, "url": self._manager.base_url}

    def open_chat_ui(self):
        """Open the embedded llama-ui in a second app window."""
        if self._manager is None:
            return {"ok": False, "message": "Server not running."}
        url = self._manager.base_url
        try:
            if self._chat_window is not None:
                try:
                    self._chat_window.show()
                    self._chat_window.bring_to_front()
                    return {"ok": True, "message": "Chat window focused.", "url": url}
                except Exception:
                    self._chat_window = None
            self._chat_window = webview.create_window(
                title='SimpleCPP Chat — llama-ui',
                url=url,
                width=1024,
                height=720,
            )
            try:
                self._chat_window.show()
            except Exception:
                pass
            return {"ok": True, "message": "Chat window opened.", "url": url}
        except Exception as e:
            self._chat_window = None
            return {"ok": False, "message": f"Could not open chat UI: {e}"}

    def find_best_config(self, config_payload_json):
        """Open Google AI Mode with a prompt for suggested CPU settings."""
        try:
            config = json.loads(config_payload_json)
            model_path = config.get("model_path", "")

            model_name = os.path.basename(model_path) if model_path else "unknown model"
            size_note = ""
            if model_path and os.path.isfile(model_path):
                size_gb = os.path.getsize(model_path) / (1024 ** 3)
                size_note = f" ({size_gb:.2f} GB)"

            cpu_threads = os.cpu_count() or 8

            prompt = (
                f"Best CPU-only llama-server (llama.cpp) settings for {model_name}{size_note} "
                f"on Windows with {cpu_threads} CPU threads. "
                "Suggest --n-threads, --ctx-size, --batch-size, --temp, --top-k, --top-p, "
                "--repeat-penalty for stable CPU inference. Include --n-gpu-layers 0."
            )
            url = "https://www.google.com/search?udm=50&q=" + urllib.parse.quote_plus(prompt)
            webbrowser.open(url)
            return {"ok": True, "message": "Opened Google AI Mode with suggested settings.", "url": url}
        except Exception as e:
            print(f"[SimpleCPP ERROR] Best-config failure: {str(e)}")
            return {"ok": False, "message": f"Could not open Google AI Mode: {str(e)}"}


def main():
    api = SimpleAPI()
    
    # Resolve ui/index.html for dev runs and frozen (PyInstaller) builds
    if getattr(sys, 'frozen', False):
        ui_path = os.path.join(sys._MEIPASS, 'ui', 'index.html')
    else:
        ui_path = os.path.join(os.path.dirname(__file__), 'ui', 'index.html')

    window = webview.create_window(
        title='SimpleCPP Configurator',
        url=ui_path,
        js_api=api,
        width=980,
        height=680,
        resizable=True,
        background_color='#0d0d0d'
    )
    
    api.set_window(window)
    webview.start(gui='edgechromium')


if __name__ == '__main__':
    main()
