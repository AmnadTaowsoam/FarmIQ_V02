## Stage 0: Build Stage ##
FROM node:20-alpine AS builder

# Accept build argument for app name
ARG APP_NAME=admin-web

WORKDIR /app

# Configure npm to accept self-signed certificates
RUN npm config set strict-ssl false

# Copy packages directory first (for workspace dependencies)
COPY packages/ /usr/src/packages/

# Build the packages first
WORKDIR /usr/src/packages/farmiq-api-client
RUN for i in 1 2 3 4 5; do \
      npm ci --include=dev && break; \
      if [ "$i" -eq 5 ]; then exit 1; fi; \
      sleep $((i * 5)); \
    done && (test -x ./node_modules/.bin/tsc || npm install --include=dev typescript@^5) && npm run build

WORKDIR /usr/src/packages/contracts
RUN for i in 1 2 3 4 5; do \
      npm install && break; \
      if [ "$i" -eq 5 ]; then exit 1; fi; \
      sleep $((i * 5)); \
    done && npm run build

# Go back to app directory
WORKDIR /app

# Copy app package.json and install dependencies
COPY apps/${APP_NAME}/package.json ./
COPY apps/${APP_NAME}/package-lock.json ./
RUN npm cache clean --force && \
    for i in 1 2 3 4 5; do \
      npm ci --include=dev && break; \
      if [ "$i" -eq 5 ]; then exit 1; fi; \
      sleep $((i * 5)); \
    done

# Copy app source code (excluding node_modules)
COPY apps/${APP_NAME}/src ./src
COPY apps/${APP_NAME}/index.html ./index.html
COPY apps/${APP_NAME}/vite.config.ts ./vite.config.ts
COPY apps/${APP_NAME}/tsconfig.json ./tsconfig.json
COPY apps/${APP_NAME}/tsconfig.node.json ./tsconfig.node.json

# Build with commit ID
ARG VITE_COMMIT_ID
ENV VITE_COMMIT_ID=$VITE_COMMIT_ID
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Use npx to run vite build
RUN npx vite build

## Stage 1: Development Stage ##
FROM node:20-alpine AS development

# Accept build argument for app name
ARG APP_NAME=admin-web

WORKDIR /app

# Configure npm to accept self-signed certificates
RUN npm config set strict-ssl false

# Copy packages directory first (for workspace dependencies)
COPY packages/ /usr/src/packages/

# Build the packages first
WORKDIR /usr/src/packages/farmiq-api-client
RUN for i in 1 2 3 4 5; do \
      npm ci --include=dev && break; \
      if [ "$i" -eq 5 ]; then exit 1; fi; \
      sleep $((i * 5)); \
    done && (test -x ./node_modules/.bin/tsc || npm install --include=dev typescript@^5) && npm run build

WORKDIR /usr/src/packages/contracts
RUN for i in 1 2 3 4 5; do \
      npm install && break; \
      if [ "$i" -eq 5 ]; then exit 1; fi; \
      sleep $((i * 5)); \
    done && npm run build

# Go back to app directory
WORKDIR /app

# Copy app package.json and install dependencies
COPY apps/${APP_NAME}/package.json ./
COPY apps/${APP_NAME}/package-lock.json ./
RUN npm cache clean --force && \
    for i in 1 2 3 4 5; do \
      npm ci --include=dev && break; \
      if [ "$i" -eq 5 ]; then exit 1; fi; \
      sleep $((i * 5)); \
    done

# Copy app source code (excluding node_modules)
COPY apps/${APP_NAME}/src ./src
COPY apps/${APP_NAME}/index.html ./index.html
COPY apps/${APP_NAME}/vite.config.ts ./vite.config.ts
COPY apps/${APP_NAME}/tsconfig.json ./tsconfig.json
COPY apps/${APP_NAME}/tsconfig.node.json ./tsconfig.node.json

# Create entrypoint script inline
RUN mkdir -p /usr/local/bin && \
    echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \
    echo 'set -e' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'echo "[Entrypoint] Starting entrypoint script..."' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'if [ -f "/app/package.json" ]; then' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  echo "[Entrypoint] package.json found, checking dependencies..."' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  MISSING_DEPS=false' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  if [ ! -d "/app/node_modules/lucide-react" ]; then MISSING_DEPS=true; fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  if [ ! -d "/app/node_modules/@tanstack/react-query" ]; then MISSING_DEPS=true; fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  if [ ! -d "/app/node_modules/date-fns" ]; then MISSING_DEPS=true; fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  if [ ! -d "/app/node_modules" ] || [ ! "$(ls -A /app/node_modules 2>/dev/null)" ] || [ "$MISSING_DEPS" = "true" ]; then' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    echo "[Entrypoint] Installing/updating dependencies..."' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    npm cache clean --force && npm install' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    echo "[Entrypoint] Dependencies installed successfully"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'echo "[Entrypoint] Executing command: $@"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'exec "$@"' >> /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Set environment for development
ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=256"

# Expose port
EXPOSE 5173

# Use entrypoint to check and install dependencies
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start development server
CMD ["npm", "run", "dev"]

## Stage 2: Production Stage ##
FROM node:20-alpine

# Accept build argument for app name
ARG APP_NAME=admin-web

WORKDIR /app

# Create non-root user if not exists
RUN adduser -D -H -u 101 -s /sbin/nologin app || true

# Copy static build artifacts
COPY --from=builder --chown=app:app /app/build /app/build

# Remove source maps for security
RUN find /app/build -type f -name "*.map" -exec rm -f {} \;

# Runtime server: serve SPA and proxy /api/* to BFF on host
RUN cat > /app/server.js <<'EOF'
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = '/app/build';
const upstreamHost = process.env.BFF_HOST || 'host.docker.internal';
const upstreamPort = Number(process.env.BFF_PORT || '5125');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function proxyApi(req, res) {
  const useHttps = req.headers['x-forwarded-proto'] === 'https';
  const transport = useHttps ? https : http;
  const options = {
    hostname: upstreamHost,
    port: upstreamPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${upstreamHost}:${upstreamPort}`,
      connection: 'close'
    }
  };

  const upstream = transport.request(options, (upRes) => {
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    upRes.pipe(res);
  });

  upstream.on('error', () => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: { code: 'BFF_UNREACHABLE', message: 'Cannot reach API gateway' } }));
  });

  req.pipe(upstream);
}

function serveStatic(req, res) {
  let u = (req.url || '/').split('?')[0];
  if (u === '/' || u === '') u = '/index.html';
  const fp = path.join(root, path.normalize(u));
  if (!fp.startsWith(root)) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  const send = (p) => {
    fs.readFile(p, (e, d) => {
      if (e) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      res.setHeader('Content-Type', mime[path.extname(p)] || 'application/octet-stream');
      res.end(d);
    });
  };

  fs.stat(fp, (e, s) => {
    if (!e && s.isFile()) return send(fp);
    return send(path.join(root, 'index.html'));
  });
}

const server = http.createServer((req, res) => {
  if ((req.url || '').startsWith('/api/')) return proxyApi(req, res);
  return serveStatic(req, res);
});

server.listen(80, '0.0.0.0');
EOF
RUN chown app:app /app/server.js

# Expose port
EXPOSE 80

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:80/ || exit 1

CMD ["node", "/app/server.js"]
