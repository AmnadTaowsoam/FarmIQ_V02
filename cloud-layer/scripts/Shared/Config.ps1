# FarmIQ Cloud Layer - Shared Configuration Module
# This module centralizes all configuration values used across scripts

# Script directory paths
$Script:ScriptDir = Split-Path -Parent $PSScriptRoot
$Script:CloudLayerDir = Split-Path -Parent $Script:ScriptDir

# Docker Compose files
$Script:DockerComposeDev = "docker-compose.dev.yml"
$Script:DockerComposeProd = "docker-compose.yml"
$Script:DockerComposePrisma = "docker-compose.prisma.yml"

# PostgreSQL configuration
$Script:PostgresUser = "farmiq"
$Script:PostgresPassword = "farmiq_dev"
$Script:PostgresHost = "postgres"
$Script:PostgresPort = 5432

# RabbitMQ configuration
$Script:RabbitMQContainer = "farmiq-cloud-rabbitmq"
$Script:RabbitMQUser = "farmiq"
$Script:RabbitMQPass = "farmiq_dev"
$Script:RabbitMQVHost = "/"

# Vault configuration
$Script:VaultAddr = "http://127.0.0.1:8200"
$Script:VaultToken = "root"

# API endpoints
$Script:BFFBaseUrl = "http://localhost:5125"
$Script:TenantRegistryUrl = "http://localhost:5121"

# Default test IDs
$Script:DefaultTenantId = "00000000-0000-4000-8000-000000000001"
$Script:DefaultFarmId = "00000000-0000-4000-8000-000000000102"
$Script:DefaultBarnId = "00000000-0000-4000-8000-000000001202"
$Script:DefaultBatchId = "00000000-0000-4000-8000-000000010202"

# List of all databases
$Script:AllDatabases = @(
    "cloud_identity_access",
    "cloud_tenant_registry",
    "cloud_standards_service",
    "cloud_ingestion",
    "cloud_telemetry",
    "cloud_api_gateway_bff",
    "cloud_config_rules",
    "cloud_audit_log",
    "cloud_notification",
    "cloud_reporting_export",
    "cloud_feed",
    "cloud_barn_records",
    "cloud_weighvision_readmodel",
    "cloud_analytics",
    "cloud_advanced_analytics",
    "cloud_data_pipeline",
    "cloud_billing",
    "cloud_llm_insights",
    "cloud_fleet_management"
)

# Prisma services with their database names and configurations
$Script:PrismaServices = @(
    @{ Service="cloud-identity-access"; Name="cloud-identity-access"; DbName="cloud_identity_access"; MigrationsDir="cloud-identity-access/prisma/migrations"; HasSeed=$true },
    @{ Service="cloud-tenant-registry"; Name="cloud-tenant-registry"; DbName="cloud_tenant_registry"; HasSeed=$true; Priority=1 },
    @{ Service="cloud-standards-service"; Name="cloud-standards-service"; DbName="cloud_standards_service"; HasSeed=$true },
    @{ Service="cloud-ingestion"; Name="cloud-ingestion"; DbName="cloud_ingestion"; HasSeed=$true },
    @{ Service="cloud-telemetry-service"; Name="cloud-telemetry-service"; DbName="cloud_telemetry"; HasSeed=$true },
    @{ Service="cloud-api-gateway-bff"; Name="cloud-api-gateway-bff"; DbName="cloud_api_gateway_bff"; HasSeed=$true },
    @{ Service="cloud-config-rules-service"; Name="cloud-config-rules-service"; DbName="cloud_config_rules"; HasSeed=$true },
    @{ Service="cloud-audit-log-service"; Name="cloud-audit-log-service"; DbName="cloud_audit_log"; HasSeed=$true },
    @{ Service="cloud-notification-service"; Name="cloud-notification-service"; DbName="cloud_notification"; HasSeed=$true },
    @{ Service="cloud-reporting-export-service"; Name="cloud-reporting-export-service"; DbName="cloud_reporting_export"; MigrationsDir="cloud-reporting-export-service/prisma/migrations"; HasSeed=$true },
    @{ Service="cloud-feed-service"; Name="cloud-feed-service"; DbName="cloud_feed"; HasSeed=$true },
    @{ Service="cloud-barn-records-service"; Name="cloud-barn-records-service"; DbName="cloud_barn_records"; HasSeed=$true },
    @{ Service="cloud-weighvision-readmodel"; Name="cloud-weighvision-readmodel"; DbName="cloud_weighvision_readmodel"; HasSeed=$true },
    @{ Service="cloud-billing-service"; Name="cloud-billing-service"; DbName="cloud_billing"; HasSeed=$false },
    @{ Service="cloud-fleet-management"; Name="cloud-fleet-management"; DbName="cloud_fleet_management"; HasSeed=$false }
)

# Python services
$Script:PythonServices = @(
    @{ Service="cloud-analytics-service"; Name="cloud-analytics-service" },
    @{ Service="cloud-llm-insights-service"; Name="cloud-llm-insights-service" }
)

# Required BFF environment variables
$Script:RequiredBFFEnvVars = @(
    "REGISTRY_BASE_URL",
    "FEED_SERVICE_URL",
    "BARN_RECORDS_SERVICE_URL",
    "TELEMETRY_BASE_URL",
    "ANALYTICS_BASE_URL",
    "REPORTING_EXPORT_BASE_URL"
)

# Optional BFF environment variables
$Script:OptionalBFFEnvVars = @(
    "WEIGHVISION_READMODEL_BASE_URL"
)

# Export functions to get configuration values
function Get-CloudLayerDir {
    return $Script:CloudLayerDir
}

function Get-DockerComposePath {
    param([string]$ComposeFile = $Script:DockerComposeDev)
    return Join-Path $Script:CloudLayerDir $ComposeFile
}

function Get-AllDatabases {
    return $Script:AllDatabases
}

function Get-PrismaServices {
    param([switch]$SortedByPriority)
    $services = $Script:PrismaServices
    if ($SortedByPriority) {
        return $services | Sort-Object { if ($_.Priority) { $_.Priority } else { 999 } }
    }
    return $services
}

function Get-PythonServices {
    return $Script:PythonServices
}

function Get-RequiredBFFEnvVars {
    return $Script:RequiredBFFEnvVars
}
