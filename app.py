import os
import sys
import json
import webview


class SimpleAPI:
    """ Exposes secure backend hooks to the browser document runtime """
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def browse_for_model(self):
        """ Invokes a secure native OS file selection window """
        if not self._window:
            return ""
            
        file_types = ('Model Files (*.gguf)', 'All Files (*.*)')
        result = self._window.create_file_dialog(
            dialog_type=webview.OPEN_DIALOG,
            file_types=file_types,
            allow_multiple=False
        )
        
        # Returns selected path string or empty sequence
        return result[0] if result else ""

    def launch_engine(self, config_payload_json):
        """ Triggered when user selects parameters and clicks 'Launch Engine' """
        try:
            config = json.loads(config_payload_json)
            print(f"[SimpleCPP] Parsing runtime context parameters: {config}")
            
            # --- RUNTIME ARCHITECTURE INTEGRATION HUB ---
            # TODO: Map configuration variables directly to your C++ backend loops
            # model_path = config.get("model")
            # gpu_layers = config.get("layers")
            # context_len = config.get("context")
            
            # Terminate launch sequence window smoothly upon deployment
            if self._window:
                self._window.destroy()
                
        except Exception as e:
            print(f"[SimpleCPP ERROR] Configuration ingestion failure: {str(e)}")


def main():
    api = SimpleAPI()
    
    # Configure production asset directories for standalone operation
    if getattr(sys, 'frozen', False):
        ui_path = os.path.join(sys._MEIPASS, 'ui', 'index.html')
    else:
        ui_path = os.path.join(os.path.dirname(__file__), 'ui', 'index.html')

    # Instantiating premium borderless style canvas frame bounds
    window = webview.create_window(
        title='SimpleCPP Configurator',
        url=ui_path,
        js_api=api,
        width=980,
        height=680,
        resizable=False,
        background_color='#0D0D11'
    )
    
    api.set_window(window)
    webview.start(gui='edgechromium')


if __name__ == '__main__':
    main()
