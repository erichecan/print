#!/usr/bin/env python3
"""
One-time Shopify OAuth token grabber.
Run once to get a fresh access token and save it to .env.

Usage:
    python get_token.py
"""

import http.server
import threading
import webbrowser
import urllib.parse
import secrets
import re
import sys
import os
import requests

CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET", "")
SHOP = os.environ.get("SHOPIFY_SHOP_DOMAIN", "printngoplus.myshopify.com")
REDIRECT_URI = "http://localhost:3000/callback"
SCOPES = "write_files,read_files"
PORT = 3000

_state = secrets.token_hex(16)
_result: dict = {}


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self._respond(404, b"Not found")
            return

        params = urllib.parse.parse_qs(parsed.query)
        received_state = params.get("state", [None])[0]
        code = params.get("code", [None])[0]
        error = params.get("error", [None])[0]

        if error:
            _result["error"] = error
            self._respond(400, f"<h2>Error: {error}</h2>".encode())
        elif received_state != _state:
            _result["error"] = "state_mismatch"
            self._respond(400, b"<h2>State mismatch. Please retry.</h2>")
        else:
            _result["code"] = code
            self._respond(200, b"<h2>Authorization successful! You can close this tab.</h2>")

        threading.Thread(target=self.server.shutdown, daemon=True).start()

    def _respond(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


def update_env(token: str):
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        content = open(env_path).read()
        if "SHOPIFY_ADMIN_API_TOKEN" in content:
            content = re.sub(r"SHOPIFY_ADMIN_API_TOKEN=.*", f"SHOPIFY_ADMIN_API_TOKEN={token}", content)
        else:
            content = content.rstrip("\n") + f"\nSHOPIFY_ADMIN_API_TOKEN={token}\n"
        open(env_path, "w").write(content)
    else:
        open(env_path, "w").write(f"SHOPIFY_ADMIN_API_TOKEN={token}\nSHOPIFY_SHOP_DOMAIN={SHOP}\n")


def main():
    auth_url = (
        f"https://{SHOP}/admin/oauth/authorize"
        f"?client_id={CLIENT_ID}"
        f"&scope={urllib.parse.quote(SCOPES)}"
        f"&redirect_uri={urllib.parse.quote(REDIRECT_URI, safe='')}"
        f"&state={_state}"
    )

    server = http.server.HTTPServer(("localhost", PORT), CallbackHandler)
    print(f"Listening on http://localhost:{PORT} ...")
    print(f"\n🔗 授权 URL（若浏览器未自动打开，请手动复制到浏览器）:\n{auth_url}\n")
    webbrowser.open(auth_url)

    server.serve_forever()

    if "error" in _result:
        print(f"ERROR: {_result['error']}")
        sys.exit(1)

    code = _result.get("code")
    if not code:
        print("ERROR: No authorization code received.")
        sys.exit(1)

    print("Exchanging authorization code for access token...")
    resp = requests.post(
        f"https://{SHOP}/admin/oauth/access_token",
        json={"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET, "code": code},
        timeout=15,
    )

    if resp.status_code != 200:
        print(f"ERROR: Token exchange failed ({resp.status_code}): {resp.text}")
        sys.exit(1)

    data = resp.json()
    token = data.get("access_token")
    if not token:
        print(f"ERROR: No access_token in response: {data}")
        sys.exit(1)

    update_env(token)
    print(f"\nSHOPIFY_ADMIN_API_TOKEN={token}")
    print("\nToken saved to .env")


if __name__ == "__main__":
    main()
