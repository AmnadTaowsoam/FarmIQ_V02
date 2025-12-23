# Stage 1: Build the application
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# Configure npm for better network reliability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set maxsockets 5

# Install dependencies (skip scripts to avoid Prisma postinstall network issues)
RUN npm install --legacy-peer-deps --ignore-scripts

# Generate the Prisma client
RUN npx prisma generate

# Copy the rest of the application source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Development image
FROM node:20-alpine AS development

# Install required libraries for Prisma (Alpine compatibility)
RUN apk add --no-cache libc6-compat openssl libssl3

# Set the working directory
WORKDIR /usr/src/app

# Set the environment to development
ENV NODE_ENV=development

# Copy package.json and package-lock.json
COPY package*.json ./

# Configure npm for better network reliability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set maxsockets 5

# Install all dependencies (skip scripts to avoid Prisma postinstall network issues)
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy prisma schema and generated client
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /usr/src/app/node_modules/@prisma ./node_modules/@prisma

# Copy source code (will be overridden by volume in docker-compose.dev.yml)
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json
COPY --from=build /usr/src/app/openapi.yaml ./openapi.yaml

# Install nodemon globally for hot-reload
RUN npm install -g nodemon ts-node

# Install curl for healthcheck
RUN apk add --no-cache curl

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
CMD curl --fail http://localhost:3000/api/health || exit 1

# Start the application in development mode
CMD ["npm", "run", "dev"]

# Stage 3: Production image
FROM node:20-alpine AS production

# Set the working directory
WORKDIR /usr/src/app

# Set the environment to production
ENV NODE_ENV=production

# Copy package.json and package-lock.json
COPY package*.json ./

# Configure npm for better network reliability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set maxsockets 5

# Install only production dependencies
RUN npm install --only=production --legacy-peer-deps

# Copy the built application and Prisma client from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /usr/src/app/node_modules/@prisma ./node_modules/@prisma
# Copy the openapi.yaml file
COPY --from=build /usr/src/app/openapi.yaml ./openapi.yaml

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create a non-root user
RUN adduser -D -u 1001 nodeuser

# Change ownership of the app directory
RUN chown -R nodeuser:nodeuser /usr/src/app
USER nodeuser

EXPOSE 3000

# Healthcheck to ensure the app is running
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
CMD curl --fail http://localhost:3000/api/health || exit 1

# Run database migrations before starting the application
# Note: DATABASE_URL must be provided as environment variable
CMD sh -c "npx prisma migrate deploy && node dist/src/index.js"

