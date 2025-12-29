# Stage 1: Build the application
FROM node:24-alpine AS build
 
# Set the working directory
WORKDIR /usr/src/app
 
# Copy package.json and package-lock.json
COPY package*.json ./
COPY prisma ./prisma/
 
# Install dependencies
RUN npm ci
 
# Generate the Prisma client
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
 
# Copy the rest of the application source code
COPY . .
 
# Compile TypeScript to JavaScript
RUN npm run build
 
# Stage 2: Create the production image
FROM node:24-alpine AS production
 
# Set the working directory
WORKDIR /usr/src/app
 
# Set the environment to production
ENV NODE_ENV=production
 
# Copy package.json and package-lock.json
COPY package*.json ./
 
# Install only production dependencies
RUN npm ci --only=production
 
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
 
# Start the application
CMD ["node", "dist/src/index.js"]

