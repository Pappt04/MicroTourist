# ── proto code generation ──────────────────────────────────────────────────────
FROM golang:1.22-alpine AS proto-gen

RUN apk add --no-cache protobuf && \
    go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.34.1 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

WORKDIR /proto
COPY proto/ .
RUN mkdir -p /out && \
    protoc \
      --go_out=/out --go_opt=paths=source_relative \
      --go-grpc_out=/out --go-grpc_opt=paths=source_relative \
      stakeholders.proto

# ── build stage ───────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY . .
COPY --from=proto-gen /out/ ./pb/

RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o stakeholders .

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

WORKDIR /app
COPY --from=builder /app/stakeholders .

EXPOSE 8080 9090

ENTRYPOINT ["/app/stakeholders"]
