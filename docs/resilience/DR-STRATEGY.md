# Disaster Recovery Strategy

## 1. Objectives
- **RTO (Recovery Time Objective)**: < 4 hours
- **RPO (Recovery Point Objective)**: < 1 hour

## 2. Backup Strategy
### Database (PostgreSQL)
- **Frequency**: Daily full backup, Hourly WAL archive.
- **Retention**: 
  - Daily: 30 days
  - Monthly: 1 year
- **Storage**: S3 Bucket (Cross-Region Replication enabled)

### Secrets (Vault)
- **Snapshot frequency**: Every 6 hours.
- **Storage**: Encrypted S3 Bucket.

## 3. Failover Scenarios
### Scenario A: Cloud Region Failure
1. **Trigger**: > 50% service unavailability for > 30 mins.
2. **Action**: 
   - Spin up infrastructure in Secondary Region (Terraform).
   - Restore Database from latest S3 Cross-Region backup.
   - Update DNS records (Route53) to point to new Load Balancer.
3. **Verification**: Run `health-check` suite.

### Scenario B: Data Corruption
1. **Trigger**: Detection of invalid/corrupted data.
2. **Action**:
   - Stop write access (Maintenance Mode).
   - Identify Point-in-Time (PITR) before corruption.
   - Restore DB instance from PITR.
   - Replay logs carefully if needed.

## 4. Testing
- DR Drills must be conducted **Quartely**.
- Last Test Date: [PENDING]
