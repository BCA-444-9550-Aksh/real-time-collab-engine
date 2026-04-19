# Real-Time Collaborative Editing Engine

> Production-grade backend for a Google Docs-style collaborative document editing platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript 5 |
| HTTP Framework | Express 4 |
| Real-Time | Socket.IO 4 + `@socket.io/redis-adapter` |
| Database | MongoDB 7 (Mongoose 8) |
| Cache / Pub-Sub | Redis 7 (ioredis) |
| Event Streaming | Redis Streams |
| Auth | JWT (access + refresh tokens) + bcryptjs |
| Validation | Zod |
| API Docs | Swagger UI (`/api/docs`) |
| Logging | Winston |
| Containerisation | Docker + Docker Compose |

## Architecture

```
Client (Browser / App)
  │
  ├── REST (HTTPS) ──► Express HTTP Server (stateless)
  │                         │
  └── WebSocket ──────► Socket.IO Server (cluster via Redis Adapter)
                             │
            ┌────────────────┼──────────────────┐
            ▼                ▼                  ▼
         MongoDB           Redis            Redis Streams
    (persistent store)  (cache/pub-sub)  (durable op log)
```

## Features

- **CRDT-based conflict resolution** — positional tombstone merge for concurrent text edits
- **JWT RBAC** — global roles (`admin | editor | viewer`) + per-document collaborator roles
- **Event-sourced operation log** — every edit is an append-only `Operation` document; content is reconstructed from snapshot + ops
- **Horizontal scalability** — Redis Adapter ensures Socket.IO events propagate across all nodes
- **Presence & cursors** — real-time user presence and cursor positions via Redis hashes
- **Version history & rollback** — periodic snapshots + full op replay
- **In-document chat** — persistent messages with cursor-based pagination
- **Rate limiting** — per-IP limits on auth (20/15 min) and API (500/15 min) routes
- **Graceful shutdown** — SIGTERM/SIGINT handling with in-flight request draining

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Docker & Docker Compose

### Local Setup

```bash
# 1. Clone
git clone https://github.com/Gamerking177/real-time-collab-eng.git
cd real-time-collab-eng

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your secrets

# 4. Start MongoDB + Redis
docker compose up -d

# 5. Start dev server
npm run dev
```

The server starts on **http://localhost:4000**.  
Swagger UI is available at **http://localhost:4000/api/docs**.

## Project Structure

```
src/
├── app.ts                  # Express app factory
├── index.ts                # Entry point — boot sequence + graceful shutdown
├── config/                 # DB, Redis, env validation, logger, Swagger
├── models/                 # Mongoose schemas (User, Document, Collaborator, Operation, Version, Message)
├── middleware/             # Auth, RBAC, validation, rate limiting, error handler
├── validators/             # Zod schemas for all request bodies
├── services/               # Business logic (auth, document, CRDT, operation, presence, stream)
├── controllers/            # Route handlers (auth, document, collaborator, version, chat)
├── routes/                 # Express routers
├── socket/
│   ├── index.ts            # Socket.IO server + Redis adapter
│   ├── middleware/         # Socket JWT auth
│   └── handlers/           # edit, cursor, presence, chat events
├── types/                  # Shared TypeScript interfaces
└── utils/                  # apiResponse, asyncHandler, diff utilities
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |

## Environment Variables

See [`.env.example`](.env.example) for the full list with descriptions.

## License

MIT
