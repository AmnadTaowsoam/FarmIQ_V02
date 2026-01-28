# Cloud Layer Scripts - Execution Order

This folder contains helper scripts for database setup, seeding, and verification. **Run scripts in numerical order** (01, 02, 03...).

## 🏗️ Shared Modules

All scripts now use shared modules to eliminate code duplication and ensure consistency:

### `Shared/Config.ps1`
Centralized configuration module containing:
- Docker Compose file paths
- PostgreSQL, RabbitMQ, and Vault configuration
- API endpoint URLs
- Database and service lists
- Default test IDs

### `Shared/Utilities.ps1`
Common utility functions:
- `Test-Docker` - Check if Docker is running
- `Test-DockerComposeServices` - Check if services are running
- `Invoke-ContainerCommand` - Execute commands in containers
- `Invoke-PrismaMigrations` - Apply migrations via psql
- `Wait-RabbitMQReady` - Wait for RabbitMQ to be ready
- `Wait-VaultReady` - Wait for Vault to be ready
- `Test-PostgresDatabase` - Check if database exists
- `New-PostgresDatabase` - Create a database
- `Write-ComposeEvidence` - Write resolved config to evidence directory
- `Get-IsoUtcTimestamp` - Get ISO 8601 UTC timestamp
- `Test-HttpEndpoint` - Check HTTP endpoint status

## 📋 Script Execution Order

### 01. `01-create-databases.ps1` - Create Databases
**When to run:** First, before starting any services
**What it does:** Creates all required PostgreSQL databases for each service
**Usage:**
```powershell
cd cloud-layer
.\scripts\01-create-databases.ps1
```
**Note:** This is only needed if databases weren't created automatically during first `docker compose up`.

---

### 02. `02-vault-init.ps1` - Initialize Vault (Optional)
**When to run:** If you're using HashiCorp Vault for secrets management
**What it does:** Initializes Vault with required policies and secrets
**Usage:**
```powershell
.\scripts\02-vault-init.ps1
```
**Note:** Only needed if you're using Vault. Skip if not using secrets management.

---

### 03. `03-dev-up-and-seed.ps1` - Build, Start & Seed (Recommended)
**When to run:** After databases are created (01)
**What it does:**
- Builds and starts all services
- Runs Prisma migrations
- Seeds initial data
**Usage:**
```powershell
.\scripts\03-dev-up-and-seed.ps1
# Or with custom seed count:
$env:SEED_COUNT=50; .\scripts\03-dev-up-and-seed.ps1
```
**Note:** This is the **recommended** way to start the development environment.

---

### 04. `04-run-seeds.ps1` - Seed Data Only
**When to run:** If services are already running and you only need to seed data
**What it does:** Seeds initial data without rebuilding services
**Usage:**
```powershell
.\scripts\04-run-seeds.ps1
# Or with custom seed count:
$env:SEED_COUNT=50; .\scripts\04-run-seeds.ps1
```
**Note:** Use this if you've already run `03-dev-up-and-seed.ps1` and just need to re-seed.

---

### 05. `05-push-and-seed-all.ps1` - Push Prisma Schemas & Seed
**When to run:** If you need to push Prisma schemas and seed all services manually
**What it does:**
- Pushes Prisma schemas to databases
- Seeds data for all services
**Usage:**
```powershell
.\scripts\05-push-and-seed-all.ps1
# Skip schema push:
.\scripts\05-push-and-seed-all.ps1 -SkipPush
# Skip seeding:
.\scripts\05-push-and-seed-all.ps1 -SkipSeed
```
**Note:** Usually not needed if you've run `03-dev-up-and-seed.ps1`.

---

### 06. `06-verify-compose.ps1` - Verify Docker Compose Configuration
**When to run:** After services are started, to verify configuration
**What it does:** Validates Docker Compose configuration and environment variables
**Usage:**
```powershell
.\scripts\06-verify-compose.ps1
# Or with custom compose file:
.\scripts\06-verify-compose.ps1 -ComposeFile "docker-compose.yml"
```

---

### 07. `07-verify-bff-tenants-route.ps1` - Verify BFF Tenants Route
**When to run:** After services are running, to verify API endpoints
**What it does:** Tests the BFF `/api/v1/tenants` route and related endpoints
**Usage:**
```powershell
.\scripts\07-verify-bff-tenants-route.ps1
```

---

### 08. `08-verify-dashboard-pages.ps1` - Verify Dashboard Pages
**When to run:** After services are running, to verify frontend pages
**What it does:** Tests dashboard pages and API endpoints
**Usage:**
```powershell
.\scripts\08-verify-dashboard-pages.ps1
# Or with custom parameters:
.\scripts\08-verify-dashboard-pages.ps1 -BffBaseUrl "http://localhost:5125" -TenantId "your-tenant-id"
```

---

### 09. `09-fix-rabbitmq-queue.ps1` - Fix RabbitMQ Queue Issues
**When to run:** Only when you encounter RabbitMQ `PRECONDITION_FAILED` errors
**What it does:**
- Deletes problematic RabbitMQ queues
- Restarts affected services to recreate queues
**Usage:**
```powershell
.\scripts\09-fix-rabbitmq-queue.ps1
# Or with custom parameters:
.\scripts\09-fix-rabbitmq-queue.ps1 `
    -ComposeFile "docker-compose.dev.yml" `
    -QueueName "farmiq.cloud-telemetry-service.ingest.queue" `
    -RabbitMQContainer "farmiq-cloud-rabbitmq"
```
**Note:** Only run this if you're experiencing RabbitMQ queue configuration errors.

---

### 10. `10-diagnose-prisma-studio.ps1` - Diagnose Prisma Studio Issues
**When to run:** When Prisma Studio containers are exiting or not working properly
**What it does:**
- Checks Docker status
- Verifies network configuration
- Tests PostgreSQL connection
- Analyzes Prisma Studio container logs
- Provides diagnostic information and next steps
**Usage:**
```powershell
.\scripts\10-diagnose-prisma-studio.ps1
```
**Note:** Use this when troubleshooting Prisma Studio container issues. It helps identify common problems like database connection errors, schema issues, or network problems.

---

## 🚀 Quick Start Workflow

### First Time Setup:
```powershell
cd cloud-layer

# 1. Create databases
.\scripts\01-create-databases.ps1

# 2. Build, start, and seed everything (recommended)
.\scripts\03-dev-up-and-seed.ps1

# 3. Verify everything works
.\scripts\06-verify-compose.ps1
.\scripts\07-verify-bff-tenants-route.ps1
```

### Daily Development:
```powershell
cd cloud-layer

# Just start services (if already seeded)
docker compose -f docker-compose.dev.yml up -d

# Or rebuild and seed
.\scripts\03-dev-up-and-seed.ps1
```

### Troubleshooting:
```powershell
# If RabbitMQ has issues:
.\scripts\09-fix-rabbitmq-queue.ps1

# If Prisma Studio containers are failing:
.\scripts\10-diagnose-prisma-studio.ps1

# If you need to re-seed:
.\scripts\04-run-seeds.ps1
```

---

## 📝 Notes

- **Scripts 01-03** are essential for initial setup
- **Scripts 04-05** are for specific scenarios (re-seeding, manual schema push)
- **Scripts 06-08** are for verification/testing
- **Scripts 09-10** are for troubleshooting (RabbitMQ and Prisma Studio issues)
- **Shared modules** (`Shared/Config.ps1` and `Shared/Utilities.ps1`) provide centralized configuration and utilities to all scripts

---

## Related Files

- `cloud-layer/docker-compose.dev.yml` - Development Docker Compose configuration
- `cloud-layer/docker-compose.prisma.yml` - Prisma Studio Docker Compose configuration
- `cloud-layer/postgres-init/01-create-cloud-dbs.sql` - Database initialization SQL
- `cloud-layer/cloud-rabbitmq/definitions.json` - RabbitMQ queue definitions

---

## ➕ Adding a New Service

เมื่อเพิ่ม service ใหม่เข้าไปใน `cloud-layer` คุณต้องอัปเดตไฟล์หลายไฟล์

**📖 ดูรายละเอียดที่:** [`ADDING-NEW-SERVICE.md`](./ADDING-NEW-SERVICE.md)

**สรุปสิ่งที่ต้องอัปเดต:**
1. ✅ `Shared/Config.ps1` - เพิ่ม service ใน `$Script:PrismaServices`
2. ✅ `postgres-init/01-create-cloud-dbs.sql` - เพิ่ม CREATE DATABASE
3. ✅ `docker-compose.prisma.yml` - เพิ่ม Prisma Studio service (ถ้าใช้ Prisma)
4. ✅ `docker-compose.dev.yml` / `docker-compose.yml` - ตรวจสอบ DATABASE_URL และ depends_on

**หมายเหตุ:** หลังจากการ optimize แล้ว คุณไม่จำเป็นต้องอัปเดตไฟล์ script อื่นๆ เพราะทุก script ดึงข้อมูลจาก `Shared/Config.ps1` แล้ว
