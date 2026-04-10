from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId

from db import get_db

likes_bp = Blueprint("likes", __name__)


@likes_bp.route("/blogs/<blog_id>/like", methods=["POST"])
def like_blog(blog_id):
    try:
        oid = ObjectId(blog_id)
    except InvalidId:
        return jsonify({"error": "invalid blog id"}), 400

    data = request.get_json(silent=True)
    user_id = data.get("user_id") if data else None
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    blog = get_db().blogs.find_one({"_id": oid})
    if not blog:
        return jsonify({"error": "blog not found"}), 404

    if user_id in blog.get("likes", []):
        return jsonify({"error": "already liked"}), 409

    get_db().blogs.update_one({"_id": oid}, {"$push": {"likes": user_id}})
    blog = get_db().blogs.find_one({"_id": oid})
    likes = blog.get("likes", [])
    return jsonify({"like_count": len(likes), "likes": likes}), 200


@likes_bp.route("/blogs/<blog_id>/like", methods=["DELETE"])
def unlike_blog(blog_id):
    try:
        oid = ObjectId(blog_id)
    except InvalidId:
        return jsonify({"error": "invalid blog id"}), 400

    data = request.get_json(silent=True)
    user_id = data.get("user_id") if data else None
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    blog = get_db().blogs.find_one({"_id": oid})
    if not blog:
        return jsonify({"error": "blog not found"}), 404

    get_db().blogs.update_one({"_id": oid}, {"$pull": {"likes": user_id}})
    blog = get_db().blogs.find_one({"_id": oid})
    likes = blog.get("likes", [])
    return jsonify({"like_count": len(likes), "likes": likes}), 200
