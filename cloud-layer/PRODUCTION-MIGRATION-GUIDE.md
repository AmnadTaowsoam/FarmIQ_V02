# Production Migration Guide: Separate Databases

## Overview
This guide explains the changes made for database separation and how to apply them to production.

## Changes Made

### 1. Database Configuration (docker-compose.dev.yml)
**Change**: Each service now uses a separate database instead of sharing one database.

**Before**:
```yaml
- DATABASE_URL=postgresql://user:pass@postgres:5432/farmiq  # All services shared this
```

**After**:
```yaml
# Each service has its own database
- DATABASE_URL=postgresql://user:pass@postgres:5432/cloud_tenant_registry
- DATABASE_URL=postgresql://user:pass@postgres:5432/cloud_feed
# ... etc
```

### 2. Database Names
Each service now uses:
- `cloud_identity_access`
- `cloud_tenant_registry`
- `cloud_ingestion`
- `cloud_telemetry`
- `cloud_api_gateway_bff`
- `cloud_config_rules`
- `cloud_audit_log`
- `cloud_notification`
- `cloud_reporting_export`
- `cloud_feed`
- `cloud_barn_records`
- `cloud_weighvision_readmodel`
- `cloud_analytics`

## Do These Changes Need to Be Applied to Production?

**YES**, but with careful planning:

### ✅ What Needs to Be Changed

1. **Environment Configuration**
   - Update `DATABASE_URL` environment variables in your production deployment configuration (Kubernetes, Docker Compose, or whatever orchestrator you use)
   - Similar to changes in `docker-compose.dev.yml`

2. **Database Infrastructure**
   - Create separate databases in production PostgreSQL
   - Use the same database names as development for consistency

3. **Migration Strategy**
   - Plan data migration from the shared database to service-specific databases
   - Test the migration process in staging environment first

### ⚠️ What Doesn't Need to Change

1. **Prisma Schema Files**
   - ❌ NO changes needed - schemas already use `env("DATABASE_URL")`
   - ✅ They will automatically use the new database URLs from environment variables

2. **Application Code**
   - ❌ NO changes needed - services read `DATABASE_URL` from environment
   - ✅ Code is already environment-agnostic

## Production Migration Steps

### Phase 1: Preparation

1. **Create Production Databases**
   ```sql
   CREATE DATABASE cloud_identity_access;
   CREATE DATABASE cloud_tenant_registry;
   CREATE DATABASE cloud_ingestion;
   CREATE DATABASE cloud_telemetry;
   CREATE DATABASE cloud_api_gateway_bff;
   CREATE DATABASE cloud_config_rules;
   CREATE DATABASE cloud_audit_log;
   CREATE DATABASE cloud_notification;
   CREATE DATABASE cloud_reporting_export;
   CREATE DATABASE cloud_feed;
   CREATE DATABASE cloud_barn_records;
   CREATE DATABASE cloud_weighvision_readmodel;
   CREATE DATABASE cloud_analytics;
   ```

2. **Backup Current Production Database**
   ```bash
   pg_dump -U farmiq -d farmiq > backup_before_migration.sql
   ```

### Phase 2: Data Migration

**Option A: Fresh Start (if acceptable)**
- If you can accept data loss or can restore from backups:
  - Update environment variables to point to new databases
  - Run `prisma db push` for each service
  - Seed data if needed
  - Restart services

**Option B: Migrate Existing Data**
- If you need to preserve existing data:
  - Write migration scripts to extract data from shared database
  - Map tables to appropriate service databases
  - Import data into new databases
  - Verify data integrity

### Phase 3: Update Configuration

1. **Update Environment Variables**
   - Update `DATABASE_URL` in Kubernetes secrets/configmaps
   - Or update in your deployment tool (Helm, Terraform, etc.)

2. **Update Infrastructure as Code**
   - If using Terraform/Pulumi, update database resource definitions
   - Update docker-compose files if used in production

### Phase 4: Deployment

1. **Push Schemas**
   ```bash
   # For each service
   kubectl exec -it <pod-name> -- npx prisma db push
   ```

2. **Verify Connections**
   - Check service logs to ensure they connect to correct databases
   - Verify no connection errors

3. **Monitor**
   - Monitor application logs for database errors
   - Check database connections and query performance
   - Verify data integrity

### Phase 5: Rollback Plan

If issues occur:
1. Revert environment variables to original shared database
2. Restart services
3. Restore from backup if needed

## Testing Strategy

### Before Production Deployment

1. **Staging Environment**
   - Apply changes to staging first
   - Run full test suite
   - Verify all services work correctly

2. **Load Testing**
   - Test with production-like load
   - Verify database connections and performance

3. **Data Integrity Checks**
   - Verify all data migrated correctly
   - Check foreign key relationships if applicable

## Benefits in Production

1. **Better Isolation**
   - One service's database issues don't affect others
   - Easier to scale individual services

2. **Improved Security**
   - Services only have access to their own data
   - Better access control per service

3. **Easier Maintenance**
   - Schema changes don't conflict
   - Database backups per service
   - Easier to restore individual services

4. **Performance**
   - Independent indexing strategies
   - No cross-service table locks

## Notes

- **Downtime**: Plan for minimal downtime during migration
- **Data Consistency**: Ensure referential integrity if services query across databases
- **Monitoring**: Set up monitoring for all databases
- **Backups**: Configure backups for each database separately

## Recommendation

**Yes, apply these changes to production**, but:
1. Test thoroughly in staging first
2. Plan the migration carefully
3. Have a rollback plan ready
4. Schedule during low-traffic periods
5. Communicate with the team about the migration

The benefits of database separation (no schema conflicts, better isolation, easier maintenance) make it worthwhile for production.

