# MicroTourist

A microservices-based tourist platform built with React, Go, and .NET.

**Team:** Papp Tamás · Sofija Mihajlović · Dragana Kanazir · Stefan Paunović (SOA 2026)

---

## Architecture

```
MicroTourist/
├── frontend/               # React + TypeScript (Vite)
├── backend/
│   ├── stakeholders/       # Go — user registration, profiles, auth
│   ├── blog/               # Go — blog posts, comments, likes
│   ├── followers/          # Go + Neo4j — follow graph
│   ├── tours/              # .NET — tour management, execution
│   └── api-gateway/        # Request routing (KrakenD / Kong / Go)
├── common/
│   └── protos/             # Shared Protocol Buffer definitions
└── docker-compose.yml      # Orchestrates all services
```

Services communicate via **REST** (external) and **gRPC / Protocol Buffers** (internal).

---

## User Roles

| Role | Description |
|---|---|
| Administrator | Inserted directly into DB; can view and block all accounts |
| Tour Guide (Vodič) | Creates and publishes tours |
| Tourist (Turista) | Browses, purchases, and executes tours |

---

## Getting Started

### Frontend

```bash
cd frontend/microtourist
npm install
npm run dev        # http://localhost:5173
```

### Backend (Go services)

```bash
cd backend/stakeholders   # or blog, followers
go run ./...
```

### All services

```bash
docker compose up --build
```

---

## Feature Roadmap

### Checkpoint 1 — Users & Blog
- [ ] Registration with role selection (Guide or Tourist)
- [ ] Admin: view all accounts, block users
- [ ] User profiles (name, photo, bio, quote)
- [ ] Blog posts with Markdown support, images
- [ ] Comments (author, timestamp, last-edited)
- [ ] Likes (one per user, removable; count displayed)

### Checkpoint 2 — Tours & Social
- [ ] Follow/unfollow users (required before commenting)
- [ ] Tour creation: name, description, difficulty, tags (starts as `draft`, price = 0)
- [ ] Waypoints: lat/lng, name, description, image (picked on map)
- [ ] Tour reviews: rating 1–5, comment, visit date, images
- [ ] Map rendering of tours with waypoints
- [ ] Position simulator (click map to set current location)

### Checkpoint 3 — Purchase & Execution
- [ ] Tour lifecycle: `draft` → `published` → `archived` (re-activatable)
  - Publish requires: basic info + ≥2 waypoints + ≥1 transport time
  - Transport types: walking, bicycle, car
- [ ] Shopping cart (ShoppingCart → OrderItem → TourPurchaseToken)
- [ ] Tourists see limited tour info until purchased (first waypoint only)
- [ ] TourExecution sessions: start, complete, abandon
  - Every 10s: check position vs. waypoints, mark completed + timestamp
  - Track `lastActivity` on session
- [ ] Archived tours can be executed but not purchased

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Stakeholders / Blog / Followers | Go |
| Tours | .NET |
| Follower graph | Neo4j |
| Tour / user data | PostgreSQL, MongoDB |
| Inter-service messaging | gRPC + Protocol Buffers |
| API Gateway | KrakenD / Kong / Go |
| Orchestration | Docker Compose |
