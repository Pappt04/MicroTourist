from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

from db import get_db
from middleware import require_auth

comments_bp = Blueprint("comments", __name__)


def serialize(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for field in ("created_at", "updated_at"):
        if isinstance(doc.get(field), datetime):
            doc[field] = doc[field].isoformat()
    return doc


@comments_bp.route("/blogs/<blog_id>/comments", methods=["GET"])
def get_comments(blog_id):
    try:
        ObjectId(blog_id)
    except InvalidId:
        return jsonify({"error": "invalid blog id"}), 400

    docs = get_db().comments.find({"blog_id": blog_id}).sort("created_at", 1)
    return jsonify([serialize(d) for d in docs]), 200


@comments_bp.route("/blogs/<blog_id>/comments", methods=["POST"])
def post_comment(blog_id):
    user, err = require_auth()
    if err:
        return err

    try:
        oid = ObjectId(blog_id)
    except InvalidId:
        return jsonify({"error": "invalid blog id"}), 400

    if not get_db().blogs.find_one({"_id": oid}):
        return jsonify({"error": "blog not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "missing body"}), 400

    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    now = datetime.now(timezone.utc)
    doc = {
        "blog_id": blog_id,
        "author_id": user["uid"],
        "author_username": user["usr"],
        "text": text,
        "created_at": now,
        "updated_at": now,
    }

    result = get_db().comments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify(serialize(doc)), 201


@comments_bp.route("/blogs/<blog_id>/comments/<comment_id>", methods=["PUT"])
def edit_comment(blog_id, comment_id):
    user, err = require_auth()
    if err:
        return err

    try:
        coid = ObjectId(comment_id)
    except InvalidId:
        return jsonify({"error": "invalid comment id"}), 400

    comment = get_db().comments.find_one({"_id": coid, "blog_id": blog_id})
    if not comment:
        return jsonify({"error": "comment not found"}), 404
    if comment.get("author_id") != user["uid"]:
        return jsonify({"error": "forbidden"}), 403

    data = request.get_json(silent=True)
    text = (data.get("text") or "").strip() if data else ""
    if not text:
        return jsonify({"error": "text is required"}), 400

    now = datetime.now(timezone.utc)
    updated = get_db().comments.find_one_and_update(
        {"_id": coid, "blog_id": blog_id},
        {"$set": {"text": text, "updated_at": now}},
        return_document=True,
    )
    return jsonify(serialize(updated)), 200


@comments_bp.route("/blogs/<blog_id>/comments/<comment_id>", methods=["DELETE"])
def remove_comment(blog_id, comment_id):
    user, err = require_auth()
    if err:
        return err

    try:
        coid = ObjectId(comment_id)
    except InvalidId:
        return jsonify({"error": "invalid comment id"}), 400

    comment = get_db().comments.find_one({"_id": coid, "blog_id": blog_id})
    if not comment:
        return jsonify({"error": "comment not found"}), 404
    if comment.get("author_id") != user["uid"]:
        return jsonify({"error": "forbidden"}), 403

    get_db().comments.delete_one({"_id": coid})
    return jsonify({"message": "deleted"}), 200
