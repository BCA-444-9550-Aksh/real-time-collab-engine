<div align="center">

# ⚡ Real-Time Collaborative Editing Engine

**A production-grade, Google Docs-style collaborative document editor**  
built with Node.js · React · Socket.IO · MongoDB · Redis · CRDT

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io)](https://socket.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker (Full Stack)](#docker-full-stack)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This project is a **full-stack, real-time collaborative document editor** — think Google Docs, but self-hosted and open-source. Multiple users can edit the same document simultaneously, see each other's cursors and presence, and chat in-document — all with sub-100 ms latency thanks to CRDT-based conflict resolution and Redis-backed WebSocket scaling.

The codebase is split into two packages:

| Package | Path | Purpose |
|---|---|---|
| **Backend (API + WebSocket)** | `/` | Express REST API + Socket.IO server |
| **Frontend (React SPA)** | `/client` | React 19 + Vite + TipTap editor UI |

---

## Features

### 🔄 Real-Time Collaboration
- **CRDT-based conflict resolution** — positional tombstone merge handles concurrent edits from any number of clients without conflicts
- **Live cursor tracking** — every connected user's caret position is broadcast in real time with a unique colour
- **Presence system** — see who is online in each document with avatars and activity state

### 📝 Rich Document Editing
- **TipTap editor** with full formatting toolbar (bold, italic, underline, headings H1–H3, bullet & ordered lists, undo/redo)
- **Event-sourced operation log** — every keystroke is an append-only `Operation` record; content is rebuilt from snapshot + ops replay
- **Version history & rollback** — periodic snapshots every N operations (configurable); full point-in-time restore

### 💬 In-Document Chat
- Persistent room-scoped messages stored in MongoDB
- Cursor-based pagination for chat history
- Real-time delivery via Socket.IO room events

### 🔐 Security & Auth
- **JWT RBAC** — access + refresh token pair; global roles (`admin | editor | viewer`) plus per-document collaborator roles
- Helmet, CORS, mongo-sanitize, and express-rate-limit hardening out of the box
- Socket.IO middleware validates JWT on every WebSocket handshake

### 📡 Scalability
- **Redis Adapter** for Socket.IO — events propagate correctly across multiple Node.js instances
- **Redis Streams** — durable, ordered operation log for cross-node event replay
- Horizontal scaling ready: stateless HTTP server + shared Redis state

### 🛠 Developer Experience
- Full TypeScript (strict mode) across backend and frontend
- Swagger UI at `/api/docs`
- Winston structured logging
- Docker Compose one-command local setup

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser Client                     │
│         React 19 · Vite · TipTap · Zustand · Tailwind   │
└──────────┬──────────────────────────┬───────────────────┘
           │ HTTPS REST               │ WebSocket (Socket.IO)
           ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│               Node.js 20 + Express 4 Server              │
│   Auth · Documents · Collaborators · Chat · Versions     │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │              Socket.IO Server                    │   │
│   │  edit · cursor · presence · chat handlers        │   │
│   └───────────┬──────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────┘
                │ Redis Adapter (pub/sub)
      ┌─────────┼──────────────────┐
      ▼         ▼                  ▼
  MongoDB 7   Redis 7         Redis Streams
 (documents, (cache · pub-sub  (durable
  users, ops,  · presence ·    operation
  messages)    cursors)        log)
```

### Data Flow for a Document Edit

```
User types keystroke
  → TipTap emits operation (insert/delete/replace)
    → Socket.IO sends  edit:operation  to server
      → CRDT service merges op against server state
        → Operation saved to MongoDB
          → Op published to Redis Stream
            → Broadcast to all room members via  edit:applied
              → Each client's TipTap applies the remote op
```

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript 5 |
| HTTP Framework | Express 4 |
| Real-Time | Socket.IO 4 + `@socket.io/redis-adapter` |
| Database | MongoDB 7 (Mongoose 8) |
| Cache / Pub-Sub | Redis 7 (ioredis) |
| Event Streaming | Redis Streams |
| Auth | JWT (access 15 m + refresh 7 d) + bcryptjs |
| Validation | Zod |
| API Docs | Swagger UI (`/api/docs`) |
| Logging | Winston |
| Containerisation | Docker + Docker Compose |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build Tool | Vite 8 |
| Editor | TipTap 3 (ProseMirror-based) |
| State Management | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| WebSocket Client | Socket.IO-client 4 |
| HTTP Client | Axios |
| Routing | React Router DOM 7 |

---

## Project Structure

```
real-time-collab-eng/
│
├── src/                          # Backend source
│   ├── app.ts                    # Express app factory (middleware chain)
│   ├── index.ts                  # Entry point — boot + graceful shutdown
│   ├── config/
│   │   ├── db.ts                 # Mongoose connection
│   │   ├── env.ts                # Zod-validated environment config
│   │   ├── logger.ts             # Winston logger
│   │   ├── redis.ts              # ioredis client (pub + sub instances)
│   │   └── swagger.ts            # OpenAPI / Swagger setup
│   ├── models/
│   │   ├── User.ts               # JWT auth, global role
│   │   ├── Document.ts           # Doc metadata + latest snapshot
│   │   ├── Collaborator.ts       # Per-doc RBAC join table
│   │   ├── Operation.ts          # Immutable op log (CRDT source of truth)
│   │   ├── Version.ts            # Periodic content snapshots
│   │   └── Message.ts            # In-document chat messages
│   ├── middleware/
│   │   ├── auth.ts               # JWT access token guard
│   │   ├── rbac.ts               # Role-based access control
│   │   ├── validate.ts           # Zod request validation wrapper
│   │   ├── rateLimiter.ts        # Per-route rate limits
│   │   └── errorHandler.ts       # Centralised error → JSON response
│   ├── validators/               # Zod schemas for every request body
│   ├── services/
│   │   ├── auth.service.ts       # Register, login, token refresh
│   │   ├── document.service.ts   # CRUD + op-replay content rebuild
│   │   ├── crdt.service.ts       # Insert / delete / replace merge logic
│   │   ├── operation.service.ts  # Op persistence + Redis Stream publish
│   │   ├── presence.service.ts   # Redis hash-backed online status
│   │   └── stream.service.ts     # Redis Streams consumer group reader
│   ├── controllers/              # Thin route handlers, delegate to services
│   ├── routes/                   # Express routers (auth, docs, collabs, chat, versions)
│   ├── socket/
│   │   ├── index.ts              # Socket.IO init + Redis adapter attach
│   │   ├── middleware/
│   │   │   └── socketAuth.ts     # WS JWT validation
│   │   └── handlers/
│   │       ├── edit.handler.ts   # edit:operation → CRDT merge → broadcast
│   │       ├── cursor.handler.ts # cursor:move → broadcast to room
│   │       ├── presence.handler.ts # join/leave room, online roster
│   │       └── chat.handler.ts   # message:send → persist → broadcast
│   ├── types/
│   │   └── index.ts              # Shared TS interfaces (User, Doc, Op, …)
│   └── utils/
│       ├── apiResponse.ts        # Typed success/error response helpers
│       ├── asyncHandler.ts       # Express async error wrapper
│       └── diff.ts               # String diff utilities for CRDT
│
├── client/                       # Frontend source (Vite SPA)
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx              # React root mount
│       ├── App.tsx               # Router + auth guard
│       ├── index.css             # Tailwind base + custom tokens
│       ├── pages/
│       │   ├── AuthPage.tsx      # Login / register
│       │   ├── DashboardPage.tsx # Document list + create
│       │   ├── EditorPage.tsx    # Main collaborative editor
│       │   └── NotFoundPage.tsx
│       ├── components/
│       │   ├── EditorToolbar.tsx # Formatting controls
│       │   ├── PresenceStrip.tsx # Live user avatar rail
│       │   ├── ChatSidebar.tsx   # Real-time in-doc chat
│       │   └── ShareModal.tsx    # Collaborator management
│       ├── hooks/
│       │   └── useSocketRoom.ts  # Socket.IO room lifecycle hook
│       ├── services/
│       │   ├── api.ts            # Axios instance + interceptors
│       │   └── socket.ts         # Socket.IO client singleton
│       └── store/
│           ├── authStore.ts      # Auth state + JWT management
│           ├── documentStore.ts  # Document list & active doc
│           ├── collaborationStore.ts # Cursors, presence, applied ops
│           └── chatStore.ts      # Chat messages per document
│
├── Dockerfile                    # Multi-stage Node.js image
├── docker-compose.yml            # MongoDB + Redis + App services
├── .env.example                  # All required env vars with comments
├── tsconfig.json                 # Backend TS config
└── package.json                  # Backend scripts + dependencies
```

---

## Getting Started

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 20 |
| npm | 9 |
| Docker + Docker Compose | Latest stable |
| Git | Any |

---

### Local Development

Run MongoDB and Redis in Docker, then start each package in watch mode:

```bash
# 1. Clone the repository
git clone https://github.com/Gamerking177/real-time-collab-eng.git
cd real-time-collab-eng

# 2. Install backend dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Open .env and fill in your JWT secrets (everything else has sane defaults)

# 4. Start MongoDB + Redis via Docker
docker compose up -d mongo redis

# 5. Start backend dev server (hot-reload on src/ changes)
npm run dev
# → API:      http://localhost:4000
# → Swagger:  http://localhost:4000/api/docs

# 6. In a new terminal — install and start frontend
cd client
npm install
npm run dev
# → App:      http://localhost:5173
```

> **Tip:** The Vite dev server proxies `/api` and `/socket.io` to `localhost:4000` automatically — no manual CORS setup needed for local development.

---

### Docker (Full Stack)

Run the complete stack (backend + MongoDB + Redis) in containers:

```bash
# Build and start all services
docker compose up --build

# Or run detached
docker compose up --build -d

# View logs
docker compose logs -f app

# Tear down (keeps volumes)
docker compose down

# Tear down + wipe data volumes
docker compose down -v
```

| Service | URL |
|---|---|
| Backend API | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api/docs |
| MongoDB (dev only) | localhost:27017 |
| Redis (dev only) | localhost:6379 |

> The frontend is not included in Docker Compose by default — run it locally with `cd client && npm run dev` while the backend stack runs in Docker.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the marked values. All variables with defaults are optional in development.

```bash
# ── Server ───────────────────────────────────────────────
PORT=4000
NODE_ENV=development

# ── MongoDB ──────────────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/collab_engine

# ── Redis ────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                   # required in production

# ── JWT  ★ Change these in production ★ ─────────────────
JWT_ACCESS_SECRET=change_me_min_32_chars
JWT_REFRESH_SECRET=change_me_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── CORS ─────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# ── Rate Limiting ────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000       # 15 min
RATE_LIMIT_MAX_AUTH=20
RATE_LIMIT_MAX_API=500

# ── Snapshot Strategy ────────────────────────────────────
SNAPSHOT_INTERVAL=50              # snapshot every N ops

# ── Redis Streams ────────────────────────────────────────
STREAM_NAME=collab:ops
STREAM_GROUP=collab-consumers
STREAM_BATCH_SIZE=100
```

---

## API Reference

Interactive documentation is available at **[http://localhost:4000/api/docs](http://localhost:4000/api/docs)** (Swagger UI) when the server is running.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | ✗ | Create a new user account |
| `POST` | `/login` | ✗ | Login, receive access + refresh tokens |
| `POST` | `/refresh` | ✗ | Exchange refresh token for new access token |
| `POST` | `/logout` | ✓ | Invalidate refresh token |

### Documents — `/api/documents`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✓ | List documents accessible to the caller |
| `POST` | `/` | ✓ | Create a new document |
| `GET` | `/:id` | ✓ | Get document metadata + current content |
| `PATCH` | `/:id` | ✓ editor+ | Update document title |
| `DELETE` | `/:id` | ✓ admin | Delete a document |

### Collaborators — `/api/documents/:id/collaborators`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✓ | List all collaborators and roles |
| `POST` | `/` | ✓ admin | Invite a user to the document |
| `PATCH` | `/:userId` | ✓ admin | Update a collaborator's role |
| `DELETE` | `/:userId` | ✓ admin | Remove a collaborator |

### Versions — `/api/documents/:id/versions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✓ | List version snapshots |
| `POST` | `/:versionId/restore` | ✓ editor+ | Restore to a snapshot |

### Chat — `/api/documents/:id/messages`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✓ | Fetch paginated message history |

---

## WebSocket Events

Connect to the Socket.IO server with a valid JWT in the `auth` handshake:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: '<ACCESS_TOKEN>' }
});
```

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `room:join` | `{ documentId }` | Join a document collaboration room |
| `room:leave` | `{ documentId }` | Leave the room |
| `edit:operation` | `{ documentId, op: Operation }` | Submit a CRDT operation (insert/delete/replace) |
| `cursor:move` | `{ documentId, position, color }` | Broadcast cursor position |
| `message:send` | `{ documentId, content }` | Send a chat message |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `edit:applied` | `{ op: Operation, authorId }` | Confirmed operation broadcast to room |
| `cursor:updated` | `{ userId, position, color, name }` | Another user's cursor moved |
| `presence:update` | `{ users: PresenceUser[] }` | Room member roster changed |
| `message:received` | `{ message: Message }` | New chat message in the room |
| `error` | `{ message, code }` | Server-side error |

### Operation Shape

```ts
type Operation = {
  type: 'insert' | 'delete' | 'replace';
  position: number;    // character offset
  content?: string;    // for insert / replace
  length?: number;     // for delete / replace
  version: number;     // document vector clock
};
```

---

## Available Scripts

### Backend (root)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | ESLint check on `src/` |
| `npm run lint:fix` | ESLint auto-fix |

### Frontend (`/client`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Type-check + production bundle → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint check |

---

## Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feat/my-feature`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) — `feat(scope): description`
4. Push and open a Pull Request against `main`

Please keep PRs focused — one feature or fix per PR makes reviews faster.

---

## License

[MIT](LICENSE) © 2024 Gamerking177
