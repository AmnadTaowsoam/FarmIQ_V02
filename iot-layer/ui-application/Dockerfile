FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/iot-layer

ENV ROLLUP_SKIP_NODEJS_NATIVE=1

COPY ui-application/package.json ui-application/package-lock.json* ui-application/
COPY ui-application/server/package.json ui-application/server/package-lock.json* ui-application/server/

RUN cd ui-application && npm install --include=optional
RUN cd ui-application/server && npm install

COPY ui-application ui-application
COPY ui-application/server ui-application/server

EXPOSE 5173 5174
CMD ["sh", "-c", "cd ui-application/server && npx prisma generate && npx prisma db push && npm run dev & API_PID=$! && echo 'Waiting for API on 5174...' && until node -e \"fetch('http://127.0.0.1:5174/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\"; do sleep 0.5; done && cd /workspace/iot-layer/ui-application && npm run dev -- --host 0.0.0.0 --port 5173 & UI_PID=$! && wait $API_PID $UI_PID"]
