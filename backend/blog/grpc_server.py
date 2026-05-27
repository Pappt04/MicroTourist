import logging
from concurrent import futures

import grpc
from bson import ObjectId
from bson.errors import InvalidId

import blog_pb2
import blog_pb2_grpc
from db import get_db

logger = logging.getLogger(__name__)


def _doc_to_msg(doc) -> blog_pb2.BlogMessage:
    likes = doc.get("likes", [])
    created_at = doc.get("created_at")
    return blog_pb2.BlogMessage(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        author_id=int(doc.get("author_id", 0)),
        author_username=doc.get("author_username", ""),
        images=list(doc.get("images", [])),
        like_count=len(likes),
        created_at=created_at.isoformat() if created_at else "",
    )


class BlogServicer(blog_pb2_grpc.BlogServiceServicer):
    def GetBlogs(self, request, context):
        try:
            cursor = get_db().blogs.find({}).sort("created_at", -1)
            msgs = [_doc_to_msg(doc) for doc in cursor]
            return blog_pb2.BlogListResponse(blogs=msgs)
        except Exception as e:
            logger.error("GetBlogs error: %s", e)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return blog_pb2.BlogListResponse()

    def GetBlogById(self, request, context):
        try:
            oid = ObjectId(request.id)
        except (InvalidId, Exception):
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("invalid blog id")
            return blog_pb2.BlogResponse(error="invalid blog id")

        doc = get_db().blogs.find_one({"_id": oid})
        if not doc:
            return blog_pb2.BlogResponse(error="blog not found")

        return blog_pb2.BlogResponse(blog=_doc_to_msg(doc))


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    blog_pb2_grpc.add_BlogServiceServicer_to_server(BlogServicer(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    logger.info("gRPC server listening on :50051")
    server.wait_for_termination()
