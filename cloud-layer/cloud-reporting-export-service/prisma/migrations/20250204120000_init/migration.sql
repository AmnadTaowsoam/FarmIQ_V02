-- Create enums
DO $$ BEGIN
  CREATE TYPE "ReportJobType" AS ENUM (
    'FEED_INTAKE_EXPORT',
    'KPI_FEEDING_EXPORT',
    'TELEMETRY_EXPORT',
    'WEIGHVISION_EXPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportFormat" AS ENUM ('csv', 'json');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create table
CREATE TABLE IF NOT EXISTS "report_jobs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "job_type" "ReportJobType" NOT NULL,
  "format" "ReportFormat" NOT NULL,
  "farm_id" TEXT,
  "barn_id" TEXT,
  "batch_id" TEXT,
  "start_date" DATE,
  "end_date" DATE,
  "filters" JSONB,
  "status" "ReportJobStatus" NOT NULL DEFAULT 'queued',
  "progress_pct" INTEGER NOT NULL DEFAULT 0,
  "file_path" TEXT,
  "file_name" TEXT,
  "mime_type" TEXT,
  "size_bytes" BIGINT,
  "sha256" TEXT,
  "expires_at" TIMESTAMPTZ,
  "error_code" TEXT,
  "error_message" TEXT,
  "idempotency_key" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

-- Unique idempotency key per tenant (nulls allowed)
CREATE UNIQUE INDEX IF NOT EXISTS "report_jobs_tenant_id_idempotency_key"
  ON "report_jobs" ("tenant_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

-- Tenant + created_at desc index
CREATE INDEX IF NOT EXISTS "report_jobs_tenant_created_at_idx"
  ON "report_jobs" ("tenant_id", "created_at" DESC);
