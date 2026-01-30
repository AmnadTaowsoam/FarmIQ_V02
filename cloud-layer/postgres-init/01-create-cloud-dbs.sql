\set ON_ERROR_STOP on

-- Create per-service databases (only on first initialization of the data volume).
-- This file is executed by the official postgres image via /docker-entrypoint-initdb.d.

-- Create cloud_identity_access database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_identity_access') THEN
    CREATE DATABASE cloud_identity_access;
  END IF;
END
$$;

-- Create cloud_tenant_registry database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_tenant_registry') THEN
    CREATE DATABASE cloud_tenant_registry;
  END IF;
END
$$;

-- Create cloud_standards_service database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_standards_service') THEN
    CREATE DATABASE cloud_standards_service;
  END IF;
END
$$;

-- Create cloud_ingestion database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_ingestion') THEN
    CREATE DATABASE cloud_ingestion;
  END IF;
END
$$;

-- Create cloud_telemetry database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_telemetry') THEN
    CREATE DATABASE cloud_telemetry;
  END IF;
END
$$;

-- Create cloud_analytics database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_analytics') THEN
    CREATE DATABASE cloud_analytics;
  END IF;
END
$$;

-- Create cloud_api_gateway_bff database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_api_gateway_bff') THEN
    CREATE DATABASE cloud_api_gateway_bff;
  END IF;
END
$$;

-- Create cloud_config_rules database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_config_rules') THEN
    CREATE DATABASE cloud_config_rules;
  END IF;
END
$$;

-- Create cloud_audit_log database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_audit_log') THEN
    CREATE DATABASE cloud_audit_log;
  END IF;
END
$$;

-- Create cloud_notification database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_notification') THEN
    CREATE DATABASE cloud_notification;
  END IF;
END
$$;

-- Create cloud_reporting_export database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_reporting_export') THEN
    CREATE DATABASE cloud_reporting_export;
  END IF;
END
$$;

-- Create cloud_feed database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_feed') THEN
    CREATE DATABASE cloud_feed;
  END IF;
END
$$;

-- Create cloud_barn_records database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_barn_records') THEN
    CREATE DATABASE cloud_barn_records;
  END IF;
END
$$;

-- Create cloud_weighvision_readmodel database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_weighvision_readmodel') THEN
    CREATE DATABASE cloud_weighvision_readmodel;
  END IF;
END
$$;

-- Create cloud_llm_insights database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_llm_insights') THEN
    CREATE DATABASE cloud_llm_insights;
  END IF;
END
$$;

-- Create cloud_advanced_analytics database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_advanced_analytics') THEN
    CREATE DATABASE cloud_advanced_analytics;
  END IF;
END
$$;

-- Create cloud_data_pipeline database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_data_pipeline') THEN
    CREATE DATABASE cloud_data_pipeline;
  END IF;
END
$$;

-- Create cloud_fleet_management database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_fleet_management') THEN
    CREATE DATABASE cloud_fleet_management;
  END IF;
END
$$;

-- Create cloud_billing database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_billing') THEN
    CREATE DATABASE cloud_billing;
  END IF;
END
$$;

-- Create cloud_mlflow database (for MLflow registry)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_mlflow') THEN
    CREATE DATABASE cloud_mlflow;
  END IF;
END
$$;

-- Create cloud_feature_store database (for Feast feature store)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_feature_store') THEN
    CREATE DATABASE cloud_feature_store;
  END IF;
END
$$;

-- Create cloud_drift_detection database (for drift detection service)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_drift_detection') THEN
    CREATE DATABASE cloud_drift_detection;
  END IF;
END
$$;

-- Create cloud_ml_model database (for ML model service)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_ml_model') THEN
    CREATE DATABASE cloud_ml_model;
  END IF;
END
$$;
