FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/iot-layer/ui-application/server

COPY ui-application/server/package.json ui-application/server/package-lock.json* ./
RUN npm install

COPY ui-application/server /workspace/iot-layer/ui-application/server

EXPOSE 5174
CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npm run dev"]
