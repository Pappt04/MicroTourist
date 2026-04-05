import logging
import time

from flask import g, request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y/%m/%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def log_request(response):
    start = g.get("request_start_time")
    duration_ms = f"{(time.time() - start) * 1000:.2f}ms" if start else "-"
    logger.info("%s %s %d %s", request.method, request.path, response.status_code, duration_ms)
    return response


def record_start_time():
    g.request_start_time = time.time()
