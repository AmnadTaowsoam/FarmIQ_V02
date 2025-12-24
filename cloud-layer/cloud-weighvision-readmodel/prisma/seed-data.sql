-- Seed data for weighvision readmodel
-- This script inserts sample weighvision sessions with related data

-- Clear existing data
TRUNCATE TABLE weighvision_event_dedupe, weighvision_inference, weighvision_media, weighvision_measurement, weighvision_session RESTART IDENTITY CASCADE;

-- Fixed IDs matching shared-seed-constants
-- Sessions will be created with IDs: 00000000-0000-4000-8000-000000400001 to 00000000-0000-4000-8000-00000040001e (30 sessions)

DO $$
DECLARE
    i INTEGER;
    session_id TEXT;
    session_db_id TEXT;
    tenant_id TEXT;
    farm_id TEXT;
    barn_id TEXT;
    batch_id TEXT;
    station_id TEXT;
    status TEXT;
    started_at TIMESTAMP;
    ended_at TIMESTAMP;
    weight_val DECIMAL(10,3);
    j INTEGER;
BEGIN
    FOR i IN 0..29 LOOP
        -- Generate session ID
        session_id := '00000000-0000-4000-8000-0000004000' || LPAD(TO_HEX(i + 1), 2, '0');
        session_db_id := 'session-db-' || i;
        
        -- Assign tenant, farm, barn, batch, station based on index
        IF i % 2 = 0 THEN
            tenant_id := '00000000-0000-4000-8000-000000000001';
        ELSE
            tenant_id := '00000000-0000-4000-8000-000000000002';
        END IF;
        
        CASE (i % 4)
            WHEN 0 THEN farm_id := '00000000-0000-4000-8000-000000000101';
            WHEN 1 THEN farm_id := '00000000-0000-4000-8000-000000000102';
            WHEN 2 THEN farm_id := '00000000-0000-4000-8000-000000000201';
            ELSE farm_id := '00000000-0000-4000-8000-000000000202';
        END CASE;
        
        CASE (i % 6)
            WHEN 0 THEN barn_id := '00000000-0000-4000-8000-000000001101';
            WHEN 1 THEN barn_id := '00000000-0000-4000-8000-000000001102';
            WHEN 2 THEN barn_id := '00000000-0000-4000-8000-000000001201';
            WHEN 3 THEN barn_id := '00000000-0000-4000-8000-000000001202';
            WHEN 4 THEN barn_id := '00000000-0000-4000-8000-000000002101';
            ELSE barn_id := '00000000-0000-4000-8000-000000002102';
        END CASE;
        
        CASE (i % 4)
            WHEN 0 THEN batch_id := '00000000-0000-4000-8000-000000010101';
            WHEN 1 THEN batch_id := '00000000-0000-4000-8000-000000010102';
            WHEN 2 THEN batch_id := '00000000-0000-4000-8000-000000010201';
            ELSE batch_id := '00000000-0000-4000-8000-000000010202';
        END CASE;
        
        CASE (i % 4)
            WHEN 0 THEN station_id := '00000000-0000-4000-8000-000000300101';
            WHEN 1 THEN station_id := '00000000-0000-4000-8000-000000300102';
            WHEN 2 THEN station_id := '00000000-0000-4000-8000-000000300201';
            ELSE station_id := '00000000-0000-4000-8000-000000300202';
        END CASE;
        
        CASE (i % 3)
            WHEN 0 THEN status := 'RUNNING';
            WHEN 1 THEN status := 'FINALIZED';
            ELSE status := 'CANCELLED';
        END CASE;
        
        started_at := NOW() - (i * INTERVAL '2 hours');
        IF status = 'FINALIZED' THEN
            ended_at := started_at + ((30 + (i % 30)) * INTERVAL '1 minute');
        ELSE
            ended_at := NULL;
        END IF;
        
        -- Insert session
        INSERT INTO weighvision_session (id, "tenantId", "farmId", "barnId", "batchId", "stationId", "sessionId", "startedAt", "endedAt", status, "createdAt", "updatedAt")
        VALUES (session_db_id, tenant_id, farm_id, barn_id, batch_id, station_id, session_id, started_at, ended_at, status, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        -- Insert measurements (5-14 per session)
        FOR j IN 0..(4 + (i % 10)) LOOP
            weight_val := 1.0 + ((i % 20) * 0.1) + (j * 0.01);
            INSERT INTO weighvision_measurement (id, "tenantId", "sessionId", "sessionDbId", ts, "weightKg", source, "metaJson", "createdAt")
            VALUES (
                'measurement-' || i || '-' || j,
                tenant_id,
                session_id,
                session_db_id,
                started_at + (j * INTERVAL '1 minute'),
                weight_val,
                CASE WHEN j % 2 = 0 THEN 'scale' ELSE 'sensor' END,
                '{"index":' || j || ',"sessionIndex":' || i || '}',
                NOW()
            );
        END LOOP;
        
        -- Insert media (2-4 per session)
        FOR j IN 0..(1 + (i % 3)) LOOP
            INSERT INTO weighvision_media (id, "tenantId", "sessionId", "sessionDbId", "objectId", path, ts, "createdAt")
            VALUES (
                'media-' || i || '-' || j,
                tenant_id,
                session_id,
                session_db_id,
                'object-' || i || '-' || j,
                's3://bucket/sessions/' || session_id || '/media-' || j || '.jpg',
                started_at + (j * INTERVAL '5 minutes'),
                NOW()
            );
        END LOOP;
        
        -- Insert inferences (1-2 per session)
        FOR j IN 0..(i % 2) LOOP
            INSERT INTO weighvision_inference (id, "tenantId", "sessionId", "sessionDbId", "modelVersion", "resultJson", ts, "createdAt")
            VALUES (
                'inference-' || i || '-' || j,
                tenant_id,
                session_id,
                session_db_id,
                'v1.0.0',
                '{"predictedWeight":' || (1.0 + (i % 20) * 0.1) || ',"confidence":' || (0.85 + (i % 15) * 0.01) || ',"index":' || j || '}',
                started_at + (j * INTERVAL '10 minutes'),
                NOW()
            );
        END LOOP;
        
        -- Insert event dedupe
        INSERT INTO weighvision_event_dedupe (id, "tenantId", "eventId", "eventType", "createdAt")
        VALUES (
            'event-session-' || LPAD(i::TEXT, 6, '0'),
            tenant_id,
            'event-session-' || LPAD(i::TEXT, 6, '0'),
            'weighvision.session.created',
            NOW()
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Verify data
SELECT 'Sessions: ' || COUNT(*) FROM weighvision_session;
SELECT 'Measurements: ' || COUNT(*) FROM weighvision_measurement;
SELECT 'Media: ' || COUNT(*) FROM weighvision_media;
SELECT 'Inferences: ' || COUNT(*) FROM weighvision_inference;

