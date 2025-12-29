## Stage 0: Build Stage ##
FROM node:24-slim AS builder

# Install essential build tools
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Configure npm to accept self-signed certificates
RUN npm config set strict-ssl false

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm cache clean --force && npm install

# Copy source code
COPY . .

# Build with commit ID
ARG VITE_COMMIT_ID
ENV VITE_COMMIT_ID=$VITE_COMMIT_ID
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Use npx to run vite build
RUN npx vite build

## Stage 1: Production Stage ##
FROM nginx:1.27.4-alpine

# Install curl for health check
RUN apk add --no-cache curl

# Create non-root user if not exists
RUN adduser -D -H -u 101 -s /sbin/nologin nginx || true

# Copy build files and set ownership (Vite builds to 'dist' by default)
COPY --from=builder --chown=nginx:nginx /app/build /usr/share/nginx/html

# Copy source maps to separate location for debugging (optional)
RUN mkdir -p /source-map/assets
COPY --from=builder --chown=nginx:nginx /app/build/*.map /source-map/assets/

# Copy and set ownership of nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Remove source maps for security
RUN find /usr/share/nginx/html -type f -name "*.map" -exec rm -f {} \;

# Set up permissions
RUN chmod 1777 /tmp && \
    chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
