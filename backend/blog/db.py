import os
from pymongo import MongoClient

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _client = MongoClient(uri)
    return _client


def get_db():
    db_name = os.getenv("MONGO_DB", "microtourist_blog")
    return get_client()[db_name]
