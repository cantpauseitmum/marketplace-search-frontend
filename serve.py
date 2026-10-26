"""
Lekki serwer deweloperski dla frontendu MarketplaceSearch.
"""
import sys
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        requested = os.path.join(DIRECTORY, self.path.lstrip("/"))
        if not os.path.exists(requested) or self.path == "/":
            self.path = "/index.html"
        super().do_GET()

def run():
    server = HTTPServer(("0.0.0.0", PORT), SPAHandler)
    print("=" * 60)
    print(f"🌐 MarketplaceSearch Frontend uruchomiony!")
    print(f"👉 Adres w przeglądarce: http://localhost:{PORT}")
    print(f"👉 Oczekiwany backend:  http://localhost:8000")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nZamykanie serwera frontendu...")
        server.server_close()

if __name__ == "__main__":
    run()
