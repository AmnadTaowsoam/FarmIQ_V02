\set ON_ERROR_STOP on

-- Create per-service databases (only on first initialization of the data volume).
-- This file is executed by the official postgres image via /docker-entrypoint-initdb.d.

SELECT 'CREATE DATABASE cloud_identity_access'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_identity_access')\gexec

SELECT 'CREATE DATABASE cloud_tenant_registry'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_tenant_registry')\gexec

SELECT 'CREATE DATABASE cloud_standards_service'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_standards_service')\gexec

SELECT 'CREATE DATABASE cloud_ingestion'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_ingestion')\gexec

SELECT 'CREATE DATABASE cloud_telemetry'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_telemetry')\gexec

SELECT 'CREATE DATABASE cloud_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_analytics')\gexec

SELECT 'CREATE DATABASE cloud_api_gateway_bff'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_api_gateway_bff')\gexec

SELECT 'CREATE DATABASE cloud_config_rules'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_config_rules')\gexec

SELECT 'CREATE DATABASE cloud_audit_log'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_audit_log')\gexec

SELECT 'CREATE DATABASE cloud_notification'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_notification')\gexec

SELECT 'CREATE DATABASE cloud_reporting_export'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_reporting_export')\gexec

SELECT 'CREATE DATABASE cloud_feed'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_feed')\gexec

SELECT 'CREATE DATABASE cloud_barn_records'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_barn_records')\gexec

SELECT 'CREATE DATABASE cloud_weighvision_readmodel'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_weighvision_readmodel')\gexec

SELECT 'CREATE DATABASE cloud_llm_insights'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_llm_insights')\gexec
