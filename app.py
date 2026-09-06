import os
import sys
import json
import webview


class SimpleAPI:
    """Backend hooks exposed to the frontend via the PyWebView JS bridge."""
    def __init__(self):
        self._window = None

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
        """Validate launch config. Full ServerManager wiring lands in Phase 3."""
        try:
            config = json.loads(config_payload_json)
            print(f"[SimpleCPP] Launch requested: {config}")

            model_path = config.get("model_path", "")
            if not model_path:
                return {"ok": False, "message": "Error: Model path not set."}

            # TODO (Phase 3): construct ServerManager and call launch(config).
            return {"ok": False, "message": "Server manager not implemented yet (Phase 3)."}

        except Exception as e:
            print(f"[SimpleCPP ERROR] Configuration failure: {str(e)}")
            return {"ok": False, "message": f"Invalid configuration: {str(e)}"}

    def stop_engine(self):
        """Stop the server. Full implementation lands in Phase 3."""
        # TODO (Phase 3): call ServerManager.shutdown().
        return {"ok": False, "message": "Server not running (Phase 3)."}


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
        resizable=False,
        background_color='#ffffff'
    )
    
    api.set_window(window)
    webview.start(gui='edgechromium')


if __name__ == '__main__':
    main()
