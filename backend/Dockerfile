# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install tini for proper PID 1 signal handling (forwards SIGTERM to node)
RUN apk add --no-cache tini

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Non-root user for security (create BEFORE copying files so --chown works)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled output from builder — owned by appuser, not root
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

# tini as PID 1 ensures SIGTERM is forwarded and zombie processes are reaped
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]