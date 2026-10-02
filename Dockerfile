# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install native dependencies required for better-sqlite3 compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Build frontend and compile backend TypeScript
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3 and healthcheck
RUN apk add --no-cache curl python3 make g++

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/minhashoras.db
ENV BACKUP_DIR=/backups

COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/server/src/db/migrations /app/server/dist/db/migrations

# Setup data and backup persistence directories
RUN mkdir -p /data /backups && chown -R node:node /data /backups /app

USER node

EXPOSE 3000

VOLUME ["/data", "/backups"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/server/index.js"]
