\set ON_ERROR_STOP on

-- Create per-service databases (safe to run repeatedly).
-- Uses psql \gexec to execute CREATE DATABASE only when missing.

-- cloud_identity_access
SELECT 'CREATE DATABASE "cloud_identity_access"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_identity_access')\gexec

-- cloud_tenant_registry
SELECT 'CREATE DATABASE "cloud_tenant_registry"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_tenant_registry')\gexec

-- cloud_standards_service
SELECT 'CREATE DATABASE "cloud_standards_service"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_standards_service')\gexec

-- cloud_ingestion
SELECT 'CREATE DATABASE "cloud_ingestion"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_ingestion')\gexec

-- cloud_telemetry
SELECT 'CREATE DATABASE "cloud_telemetry"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_telemetry')\gexec

-- cloud_analytics
SELECT 'CREATE DATABASE "cloud_analytics"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_analytics')\gexec

-- cloud_api_gateway_bff
SELECT 'CREATE DATABASE "cloud_api_gateway_bff"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_api_gateway_bff')\gexec

-- cloud_config_rules
SELECT 'CREATE DATABASE "cloud_config_rules"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_config_rules')\gexec

-- cloud_audit_log
SELECT 'CREATE DATABASE "cloud_audit_log"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_audit_log')\gexec

-- cloud_notification
SELECT 'CREATE DATABASE "cloud_notification"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_notification')\gexec

-- cloud_reporting_export
SELECT 'CREATE DATABASE "cloud_reporting_export"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_reporting_export')\gexec

-- cloud_feed
SELECT 'CREATE DATABASE "cloud_feed"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_feed')\gexec

-- cloud_barn_records
SELECT 'CREATE DATABASE "cloud_barn_records"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_barn_records')\gexec

-- cloud_weighvision_readmodel
SELECT 'CREATE DATABASE "cloud_weighvision_readmodel"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_weighvision_readmodel')\gexec

-- cloud_llm_insights
SELECT 'CREATE DATABASE "cloud_llm_insights"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_llm_insights')\gexec

-- cloud_advanced_analytics
SELECT 'CREATE DATABASE "cloud_advanced_analytics"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_advanced_analytics')\gexec

-- cloud_data_pipeline
SELECT 'CREATE DATABASE "cloud_data_pipeline"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_data_pipeline')\gexec

-- cloud_fleet_management
SELECT 'CREATE DATABASE "cloud_fleet_management"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_fleet_management')\gexec

-- cloud_billing
SELECT 'CREATE DATABASE "cloud_billing"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_billing')\gexec

-- cloud_mlflow
SELECT 'CREATE DATABASE "cloud_mlflow"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_mlflow')\gexec

-- cloud_feature_store
SELECT 'CREATE DATABASE "cloud_feature_store"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_feature_store')\gexec

-- cloud_drift_detection
SELECT 'CREATE DATABASE "cloud_drift_detection"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_drift_detection')\gexec

-- cloud_ml_model
SELECT 'CREATE DATABASE "cloud_ml_model"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_ml_model')\gexec

