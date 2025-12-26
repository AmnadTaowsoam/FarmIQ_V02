# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN apk add --no-cache openssl openssl-dev

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set maxsockets 5

RUN npm install --legacy-peer-deps --ignore-scripts
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: Development
FROM node:20-alpine AS development

WORKDIR /usr/src/app
ENV NODE_ENV=development

COPY package*.json ./

RUN apk add --no-cache openssl openssl-dev

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set maxsockets 5

RUN npm install --legacy-peer-deps --ignore-scripts

COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /usr/src/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json
COPY --from=build /usr/src/app/openapi.yaml ./openapi.yaml

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "dev"]

# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set maxsockets 5

RUN npm install --only=production --legacy-peer-deps

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /usr/src/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /usr/src/app/openapi.yaml ./openapi.yaml

RUN adduser -D -u 1001 nodeuser && chown -R nodeuser:nodeuser /usr/src/app
USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD sh -c "npx prisma migrate deploy && node dist/index.js"

