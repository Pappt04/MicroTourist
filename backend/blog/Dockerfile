FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -m grpc_tools.protoc -I./proto \
    --python_out=. --grpc_python_out=. proto/blog.proto

EXPOSE 8081 50051

CMD ["gunicorn", "--bind", "0.0.0.0:8081", "--workers", "1", "--access-logfile", "-", "app:app"]
