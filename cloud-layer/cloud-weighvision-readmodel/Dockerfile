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

# Install dependencies deterministically (skip scripts to avoid Prisma postinstall network issues)
RUN npm ci --legacy-peer-deps --ignore-scripts

# Generate the Prisma client
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR:-https://binaries.prisma.sh}
RUN for i in 1 2 3 4 5; do \
      echo "Prisma generate attempt $i/5 (PRISMA_ENGINES_MIRROR=$PRISMA_ENGINES_MIRROR)"; \
      npx prisma generate && break; \
      if [ "$i" -eq 5 ]; then exit 1; fi; \
      sleep $((i * 5)); \
    done

# Copy the rest of the application source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Development image
FROM node:20-alpine AS development

# Set the working directory
WORKDIR /usr/src/app

# Set the environment to development
ENV NODE_ENV=development

# Copy package.json and package-lock.json
COPY package*.json ./

# Reuse deps from the build stage to avoid extra network calls
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma

# Copy source code (will be overridden by volume in docker-compose.dev.yml)
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json
COPY --from=build /usr/src/app/openapi.yaml ./openapi.yaml

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

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

# Reuse deps from build stage and prune dev deps (no network)
COPY --from=build /usr/src/app/node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts

# Copy the built application and Prisma client from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
# Copy the openapi.yaml file
COPY --from=build /usr/src/app/openapi.yaml ./openapi.yaml

# Create a non-root user
RUN adduser -D -u 1001 nodeuser

# Change ownership of the app directory
RUN chown -R nodeuser:nodeuser /usr/src/app
USER nodeuser

EXPOSE 3000

# Healthcheck to ensure the app is running
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Run database migrations before starting the application
# Note: DATABASE_URL must be provided as environment variable
CMD sh -c "npx prisma migrate deploy && node dist/src/index.js"

