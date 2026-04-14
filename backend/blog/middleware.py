import base64
import hashlib
import hmac
import json
import logging
import os
import time

from flask import g, jsonify, request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y/%m/%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

TOKEN_SECRET = os.getenv("TOKEN_SECRET", "change-me-in-production").encode()


def _validate_token(token: str):
    """Returns payload dict or None if invalid."""
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        encoded, sig = parts
        mac = hmac.new(TOKEN_SECRET, encoded.encode(), hashlib.sha256)
        expected = base64.urlsafe_b64encode(mac.digest()).rstrip(b"=").decode()
        if not hmac.compare_digest(sig, expected):
            return None
        data = base64.urlsafe_b64decode(encoded + "==")
        return json.loads(data)
    except Exception:
        return None


def get_current_user():
    """Returns token payload dict or None if not authenticated."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return _validate_token(auth[7:])


def require_auth():
    """Returns (payload, None) or (None, error_response)."""
    payload = get_current_user()
    if payload is None:
        return None, (jsonify({"error": "authentication required"}), 401)
    return payload, None


def log_request(response):
    start = g.get("request_start_time")
    duration_ms = f"{(time.time() - start) * 1000:.2f}ms" if start else "-"
    logger.info("%s %s %d %s", request.method, request.path, response.status_code, duration_ms)
    return response


def record_start_time():
    g.request_start_time = time.time()
