# Offline-friendly runtime image (uses checked-in `node_modules/` + prebuilt `dist/`)
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY node_modules ./node_modules
COPY dist ./dist
COPY server.js .

EXPOSE 80

CMD ["node", "server.js"]
