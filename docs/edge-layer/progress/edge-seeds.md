# Edge DB Seeds Evidence

- Date: 2025-12-31T09:05:16+07:00
- Runner: edge-layer/scripts/run-seeds.sh

```text
Edge seeds runner
EDGE_DIR=/mnt/d/FarmIQ/FarmIQ_V02/edge-layer

==> Starting postgres
time="2025-12-31T09:05:16+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:16+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
 Container farmiq-edge-postgres  Running
==> Waiting for postgres readiness
Postgres is ready
==> Ensuring required extensions
NOTICE:  extension "pgcrypto" already exists, skipping
NOTICE:  extension "uuid-ossp" already exists, skipping
CREATE EXTENSION
CREATE EXTENSION

==> edge-ingress-gateway:db:migrate
time="2025-12-31T09:05:16+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:16+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-ingress-gateway@1.0.0 db:migrate
> ts-node src/db/migrate.ts

edge-ingress-gateway DB schema ensured
OK: edge-ingress-gateway:db:migrate

==> edge-ingress-gateway:seed
time="2025-12-31T09:05:19+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:19+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-ingress-gateway@1.0.0 seed
> prisma db seed

Running seed command `ts-node prisma/seed.ts` ...
Seeded: device_allowlist=40, station_allowlist=40, ingress_dedupe=40, device_last_seen=40

🌱  The seed command has been executed.
OK: edge-ingress-gateway:seed

==> edge-telemetry-timeseries:db:migrate
time="2025-12-31T09:05:22+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:22+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-telemetry-timeseries@1.0.0 db:migrate
> ts-node src/db/migrate.ts

edge-telemetry-timeseries DB schema ensured
OK: edge-telemetry-timeseries:db:migrate

==> edge-telemetry-timeseries:seed
time="2025-12-31T09:05:24+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:24+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-telemetry-timeseries@1.0.0 seed
> prisma db seed

Running seed command `npx ts-node --project tsconfig.prisma.json --transpile-only prisma/seed.ts` ...
Starting seed (SEED_COUNT=30)...
Upserted 30 telemetry_raw records
Upserted 30 telemetry_agg records
Seed completed successfully!
Summary: 30 raw records, 30 aggregate records

🌱  The seed command has been executed.
OK: edge-telemetry-timeseries:seed

==> edge-weighvision-session:db:migrate
time="2025-12-31T09:05:27+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:27+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-weighvision-session@1.0.0 db:migrate
> ts-node src/db/migrate.ts

edge-weighvision-session DB schema ensured
OK: edge-weighvision-session:db:migrate

==> edge-weighvision-session:seed
time="2025-12-31T09:05:29+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:29+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-weighvision-session@1.0.0 seed
> prisma db seed

Running seed command `npx ts-node --project tsconfig.prisma.json --transpile-only prisma/seed.ts` ...
Starting seed (SEED_COUNT=30)...
Upserted 30 weight_sessions
Inserted 30 session_weights
Inserted 30 session_media_bindings
Seed completed successfully!
Summary: 30 sessions, 30 weights, 30 media bindings

🌱  The seed command has been executed.
OK: edge-weighvision-session:seed

==> edge-media-store:db:migrate
time="2025-12-31T09:05:31+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:31+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-media-store@1.0.0 db:migrate
> ts-node src/db/migrate.ts

edge-media-store DB schema ensured
OK: edge-media-store:db:migrate

==> edge-media-store:seed
time="2025-12-31T09:05:34+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:34+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-media-store@1.0.0 seed
> prisma db seed

Running seed command `ts-node prisma/seed.ts` ...
Upserted 60 media_objects rows

🌱  The seed command has been executed.
OK: edge-media-store:seed

==> edge-feed-intake:db:migrate
time="2025-12-31T09:05:37+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:37+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-feed-intake@1.0.0 db:migrate
> ts-node src/db/migrate.ts

edge-feed-intake DB schema ensured
OK: edge-feed-intake:db:migrate

==> edge-feed-intake:seed
time="2025-12-31T09:05:39+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:39+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-feed-intake@1.0.0 seed
> prisma db seed

Running seed command `ts-node prisma/seed.ts` ...
Starting seed (SEED_COUNT=30)...
Seed completed successfully (feed_intake_local upserts=30)

🌱  The seed command has been executed.
OK: edge-feed-intake:seed

==> edge-policy-sync:db:migrate+seed
time="2025-12-31T09:05:41+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:41+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-policy-sync@1.0.0 db:migrate
> tsx src/db/migrate.ts

{"level":"info","message":"edge-policy-sync schema ensured"}
edge-policy-sync DB schema ensured

> edge-policy-sync@1.0.0 seed
> tsx src/seed.ts

{"level":"info","message":"edge-policy-sync schema ensured"}
Upserted 30 edge_config_cache rows
Seed completed successfully!
OK: edge-policy-sync:db:migrate+seed

==> edge-sync-forwarder:db:migrate+seed
time="2025-12-31T09:05:44+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:44+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> edge-sync-forwarder@1.0.0 db:migrate
> tsx src/db/migrate.ts

edge-sync-forwarder DB schema ensured

> edge-sync-forwarder@1.0.0 seed
> tsx src/seed.ts

Seed completed successfully! (sync_outbox=30, sync_outbox_dlq=30)
OK: edge-sync-forwarder:db:migrate+seed

==> edge-vision-inference:seed
time="2025-12-31T09:05:48+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-12-31T09:05:48+07:00" level=warning msg="/mnt/d/FarmIQ/FarmIQ_V02/edge-layer/docker-compose.dev.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
Starting seed (SEED_COUNT=30)...
Inserted 30 inference_results
Seed completed successfully!
Summary: 30 inference_results
OK: edge-vision-inference:seed

====================
Seed summary
====================
SUCCESS: 13
  - edge-ingress-gateway:db:migrate
  - edge-ingress-gateway:seed
  - edge-telemetry-timeseries:db:migrate
  - edge-telemetry-timeseries:seed
  - edge-weighvision-session:db:migrate
  - edge-weighvision-session:seed
  - edge-media-store:db:migrate
  - edge-media-store:seed
  - edge-feed-intake:db:migrate
  - edge-feed-intake:seed
  - edge-policy-sync:db:migrate+seed
  - edge-sync-forwarder:db:migrate+seed
  - edge-vision-inference:seed
FAIL: 0
```
