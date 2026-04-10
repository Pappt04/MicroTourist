from flask import Flask, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
import markdown as md_lib
from datetime import datetime, timezone

from db import get_db
from middleware import log_request, record_start_time
from comments import comments_bp
from likes import likes_bp

app = Flask(__name__)
app.before_request(record_start_time)
app.after_request(log_request)

app.register_blueprint(comments_bp)
app.register_blueprint(likes_bp)


def serialize(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for field in ("created_at", "updated_at"):
        if isinstance(doc.get(field), datetime):
            doc[field] = doc[field].isoformat()
    return doc


def not_found(msg="not found"):
    return jsonify({"error": msg}), 404


def bad_request(msg):
    return jsonify({"error": msg}), 400


@app.route("/blogs", methods=["POST"])
def create_blog():
    data = request.get_json(silent=True)
    if not data:
        return bad_request("invalid or missing JSON body")

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    images = data.get("images", [])

    if not title:
        return bad_request("title is required")
    if not description:
        return bad_request("description is required")
    if not isinstance(images, list):
        return bad_request("images must be an array of URLs")
    if not all(isinstance(i, str) for i in images):
        return bad_request("each image must be a URL string")

    doc = {
        "title": title,
        "description": description,
        "images": images,
        "likes": [],
        "created_at": datetime.now(timezone.utc),
    }

    result = get_db().blogs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify(serialize(doc)), 201


@app.route("/blogs", methods=["GET"])
def list_blogs():
    render = request.args.get("render", "false").lower() == "true"
    cursor = get_db().blogs.find().sort("created_at", -1)
    blogs = []
    for doc in cursor:
        if "likes" not in doc:
            doc["likes"] = []
        item = serialize(doc)
        item["like_count"] = len(item["likes"])
        if render:
            item["description_html"] = md_lib.markdown(item["description"])
        blogs.append(item)
    return jsonify(blogs), 200


@app.route("/blogs/<blog_id>", methods=["GET"])
def get_blog(blog_id):
    try:
        oid = ObjectId(blog_id)
    except InvalidId:
        return bad_request("invalid blog id")

    render = request.args.get("render", "false").lower() == "true"
    doc = get_db().blogs.find_one({"_id": oid})
    if not doc:
        return not_found("blog not found")

    if "likes" not in doc:
        doc["likes"] = []
    item = serialize(doc)
    item["like_count"] = len(item["likes"])
    if render:
        item["description_html"] = md_lib.markdown(item["description"])
    return jsonify(item), 200


@app.route("/blogs/<blog_id>", methods=["PUT"])
def update_blog(blog_id):
    try:
        oid = ObjectId(blog_id)
    except InvalidId:
        return bad_request("invalid blog id")

    data = request.get_json(silent=True)
    if not data:
        return bad_request("invalid or missing JSON body")

    updates = {}
    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return bad_request("title cannot be empty")
        updates["title"] = title
    if "description" in data:
        description = (data["description"] or "").strip()
        if not description:
            return bad_request("description cannot be empty")
        updates["description"] = description
    if "images" in data:
        images = data["images"]
        if not isinstance(images, list):
            return bad_request("images must be an array of URLs")
        if not all(isinstance(i, str) for i in images):
            return bad_request("each image must be a URL string")
        updates["images"] = images

    if not updates:
        return bad_request("no valid fields provided for update")

    result = get_db().blogs.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        return not_found("blog not found")

    if "likes" not in result:
        result["likes"] = []
    item = serialize(result)
    item["like_count"] = len(item["likes"])
    return jsonify(item), 200


@app.route("/blogs/<blog_id>", methods=["DELETE"])
def delete_blog(blog_id):
    try:
        oid = ObjectId(blog_id)
    except InvalidId:
        return bad_request("invalid blog id")

    result = get_db().blogs.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return not_found("blog not found")

    get_db().comments.delete_many({"blog_id": blog_id})
    return jsonify({"message": "blog deleted"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8081, debug=False)
