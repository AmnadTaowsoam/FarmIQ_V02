#!/bin/bash
# Script to create separate databases for each service
# Run this after starting PostgreSQL container

set -e

POSTGRES_USER="${POSTGRES_USER:-farmiq}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-farmiq_dev}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# List of databases to create
DATABASES=(
  "cloud_identity_access"
  "cloud_tenant_registry"
  "cloud_standards_service"
  "cloud_ingestion"
  "cloud_telemetry"
  "cloud_api_gateway_bff"
  "cloud_config_rules"
  "cloud_audit_log"
  "cloud_notification"
  "cloud_reporting_export"
  "cloud_feed"
  "cloud_barn_records"
  "cloud_weighvision_readmodel"
  "cloud_analytics"
  "cloud_advanced_analytics"
  "cloud_data_pipeline"
  "cloud_billing"
  "cloud_llm_insights"
  "cloud_fleet_management"
)

echo "Creating databases for each service..."

for DB in "${DATABASES[@]}"; do
  echo "Creating database: $DB"
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1 || \
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $DB;"
done

echo "All databases created successfully!"

