-- Add tenant type and region with defaults
ALTER TABLE "tenants" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "tenants" ADD COLUMN "region" TEXT NOT NULL DEFAULT 'TH';
