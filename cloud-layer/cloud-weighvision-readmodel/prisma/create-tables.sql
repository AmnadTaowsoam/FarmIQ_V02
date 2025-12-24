-- Create tables for weighvision readmodel
-- Run this if migration fails due to network issues

CREATE TABLE IF NOT EXISTS "weighvision_session" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "farmId" TEXT,
    "barnId" TEXT,
    "batchId" TEXT,
    "stationId" TEXT,
    "sessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weighvision_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "weighvision_measurement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionDbId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(10,3) NOT NULL,
    "source" TEXT NOT NULL,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weighvision_measurement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "weighvision_media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionDbId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weighvision_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "weighvision_inference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionDbId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weighvision_inference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "weighvision_event_dedupe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weighvision_event_dedupe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "weighvision_weight_aggregate" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(255) NOT NULL,
    "farmId" VARCHAR(255),
    "barnId" VARCHAR(255),
    "batchId" VARCHAR(255),
    "recordDate" DATE NOT NULL,
    "avgWeightKg" DECIMAL(10, 3),
    "p10WeightKg" DECIMAL(10, 3),
    "p50WeightKg" DECIMAL(10, 3),
    "p90WeightKg" DECIMAL(10, 3),
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "qualityPassRate" DECIMAL(5, 2),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weighvision_weight_aggregate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "weighvision_weight_aggregate_unique_key" UNIQUE ("tenantId", "farmId", "barnId", "batchId", "recordDate")
);

CREATE INDEX IF NOT EXISTS "weighvision_weight_aggregate_tenant_recordDate_idx"
  ON "weighvision_weight_aggregate"("tenantId", "recordDate");
CREATE INDEX IF NOT EXISTS "weighvision_weight_aggregate_tenant_farm_barn_batch_date_idx"
  ON "weighvision_weight_aggregate"("tenantId", "farmId", "barnId", "batchId", "recordDate");

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "weighvision_session_tenantId_sessionId_key" ON "weighvision_session"("tenantId", "sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "weighvision_event_dedupe_tenantId_eventId_key" ON "weighvision_event_dedupe"("tenantId", "eventId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "weighvision_session_tenantId_barnId_startedAt_idx" ON "weighvision_session"("tenantId", "barnId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "weighvision_session_tenantId_farmId_startedAt_idx" ON "weighvision_session"("tenantId", "farmId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "weighvision_session_tenantId_stationId_startedAt_idx" ON "weighvision_session"("tenantId", "stationId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "weighvision_measurement_tenantId_sessionId_ts_idx" ON "weighvision_measurement"("tenantId", "sessionId", "ts" DESC);
CREATE INDEX IF NOT EXISTS "weighvision_measurement_tenantId_ts_idx" ON "weighvision_measurement"("tenantId", "ts" DESC);
CREATE INDEX IF NOT EXISTS "weighvision_measurement_sessionDbId_idx" ON "weighvision_measurement"("sessionDbId");
CREATE INDEX IF NOT EXISTS "weighvision_media_tenantId_sessionId_ts_idx" ON "weighvision_media"("tenantId", "sessionId", "ts" DESC);
CREATE INDEX IF NOT EXISTS "weighvision_media_tenantId_objectId_idx" ON "weighvision_media"("tenantId", "objectId");
CREATE INDEX IF NOT EXISTS "weighvision_media_sessionDbId_idx" ON "weighvision_media"("sessionDbId");
CREATE INDEX IF NOT EXISTS "weighvision_inference_tenantId_sessionId_ts_idx" ON "weighvision_inference"("tenantId", "sessionId", "ts" DESC);
CREATE INDEX IF NOT EXISTS "weighvision_inference_tenantId_modelVersion_idx" ON "weighvision_inference"("tenantId", "modelVersion");
CREATE INDEX IF NOT EXISTS "weighvision_inference_sessionDbId_idx" ON "weighvision_inference"("sessionDbId");
CREATE INDEX IF NOT EXISTS "weighvision_event_dedupe_createdAt_idx" ON "weighvision_event_dedupe"("createdAt");

-- Create foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'weighvision_measurement_sessionDbId_fkey'
    ) THEN
        ALTER TABLE "weighvision_measurement" 
        ADD CONSTRAINT "weighvision_measurement_sessionDbId_fkey" 
        FOREIGN KEY ("sessionDbId") REFERENCES "weighvision_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'weighvision_media_sessionDbId_fkey'
    ) THEN
        ALTER TABLE "weighvision_media" 
        ADD CONSTRAINT "weighvision_media_sessionDbId_fkey" 
        FOREIGN KEY ("sessionDbId") REFERENCES "weighvision_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'weighvision_inference_sessionDbId_fkey'
    ) THEN
        ALTER TABLE "weighvision_inference" 
        ADD CONSTRAINT "weighvision_inference_sessionDbId_fkey" 
        FOREIGN KEY ("sessionDbId") REFERENCES "weighvision_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

