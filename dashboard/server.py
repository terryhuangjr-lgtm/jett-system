#!/usr/bin/env python3
"""
Simple HTTP server for API Usage Dashboard
Serves the dashboard on http://localhost:8000 with auto-reload support
"""

import http.server
import socketserver
import os
import sys
from datetime import datetime

PORT = 8000
DIRECTORY = "public"

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with disabled caching for better reload experience."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        """Add cache control headers."""
        # Disable caching for JSON files
        if self.path.endswith('.json'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        # Allow caching for static assets
        elif self.path.endswith(('.js', '.css', '.html')):
            self.send_header('Cache-Control', 'public, max-age=60')

        super().end_headers()

    def log_message(self, format, *args):
        """Custom log format with timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sys.stdout.write(f"[{timestamp}] {format%args}\n")


def main():
    """Start the HTTP server."""
    # Change to dashboard directory
    dashboard_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(dashboard_dir)

    # Create socket server with address reuse
    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
            print("=" * 70)
            print(f"  🚀 API Usage Dashboard Server")
            print("=" * 70)
            print(f"  📍 URL: http://localhost:{PORT}")
            print(f"  📂 Serving from: {os.path.join(dashboard_dir, DIRECTORY)}")
            print(f"  ⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("=" * 70)
            print(f"  💡 Press Ctrl+C to stop the server")
            print("=" * 70)
            print()

            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped gracefully")
        sys.exit(0)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"\n❌ Error: Port {PORT} is already in use")
            print(f"   Try: lsof -ti:{PORT} | xargs kill -9")
        else:
            print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
