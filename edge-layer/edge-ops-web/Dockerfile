# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build the app definition
# Note: We don't bake VITE args here because Nginx runtime config strategy 
# or relative paths are typically better. 
# However, if we need build-time env vars, they would be ARG here.
# For now, we rely on the implementation using relative paths via Nginx proxy.
RUN npm run build

# Stage 2: Serve
FROM node:18-alpine

WORKDIR /app

# Install production server dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built assets and server script
COPY --from=builder /app/dist ./dist
COPY server.js .

# Expose port 80
EXPOSE 80

CMD ["node", "server.js"]
