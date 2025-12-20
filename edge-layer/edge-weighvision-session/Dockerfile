FROM node:24-alpine AS development

WORKDIR /usr/src/app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

CMD ["npm", "run", "dev"]

FROM node:24-alpine AS build

WORKDIR /usr/src/app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
RUN npm run build

FROM node:24-alpine AS production

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/openapi.yaml ./openapi.yaml
COPY --from=build /usr/src/app/prisma ./prisma

RUN apk add --no-cache curl
RUN adduser -D -u 1001 nodeuser
RUN chown -R nodeuser:nodeuser /usr/src/app
USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
CMD curl --fail http://localhost:3000/api/health || exit 1

CMD ["node", "dist/src/index.js"]
