# Stage 1: Builder - Install dependencies and prepare build
FROM node:25.2.1-alpine AS builder

# Install additional tools needed for React Native build
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    make \
    g++ \
    ca-certificates

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy project files
COPY . .

# Run the prebuilt download script
RUN node scripts/download-prebuilt.js

# Stage 2: Runtime - Minimal image for running the dev server
FROM node:25.2.1-alpine

RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    make \
    g++ \
    ca-certificates

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app . ./

# Environment variables
ENV NODE_ENV=development
ENV NODE_BINARY=/usr/local/bin/node
ENV PATH="/app/node_modules/.bin:$PATH"

# Expose ports
# 8081: Metro bundler (React Native)
# 8082: Dev server
# 19000: Expo dev client
EXPOSE 8081 8082 19000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8082', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Default command - start Metro bundler
CMD ["npm", "start"]
