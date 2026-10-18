#!/usr/bin/env python3
"""HTTP estático sem cache — o preview não deve reter HTML/CSS/JS antigos."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
from pathlib import PurePosixPath
import argparse
import json
from pathlib import Path

class NoCacheHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        parts = PurePosixPath(unquote(urlsplit(self.path).path)).parts
        if any(part.startswith('.') or part in {'node_modules', 'video-vezz'} for part in parts if part != '/'):
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }

    def end_headers(self):
        for item in json.loads(Path(__file__).with_name('vercel.json').read_text(encoding='utf-8'))['headers'][0]['headers']:
            self.send_header(item['key'], item['value'])
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    ThreadingHTTPServer((args.host, args.port), NoCacheHandler).serve_forever()
