CREATE TABLE IF NOT EXISTS cloud_dedupe (
    tenant_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, event_id)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'CloudDedupe'
    ) THEN
        INSERT INTO cloud_dedupe (tenant_id, event_id, first_seen_at)
        SELECT "tenantId", "eventId", "firstSeenAt"
        FROM "CloudDedupe"
        ON CONFLICT DO NOTHING;
        DROP TABLE "CloudDedupe";
    END IF;
END $$;
