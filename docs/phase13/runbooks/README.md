# FarmIQ Operations Runbooks

**Version**: 1.0.0
**Last Updated**: 2025-01-26
**Audience**: DevOps, SRE, Operations Team

---

## Table of Contents

- [Overview](#overview)
- [Deployment Runbook](#deployment-runbook)
- [Incident Response Playbook](#incident-response-playbook)
- [Database Operations Runbook](#database-operations-runbook)
- [Backup & Recovery Runbook](#backup--recovery-runbook)
- [Scaling Procedures](#scaling-procedures)
- [Monitoring & Alerting Guide](#monitoring--alerting-guide)
- [On-Call Handbook](#on-call-handbook)

---

## Overview

### Runbook Purpose

Runbooks provide step-by-step procedures for common operational tasks, ensuring consistency and reducing human error during critical operations.

### Runbook Structure

Each runbook follows this structure:

```markdown
# Runbook: [Name]

## Overview
- Purpose
- Audience
- Last Updated

## Prerequisites
- Required access
- Tools needed

## Procedure
Step-by-step instructions

## Verification
Checklist to confirm success

## Rollback
Steps if procedure fails

## References
Related documentation
```

### Emergency Contacts

| Role | Contact |
|------|---------|
| **On-Call SRE** | +66 81-XXX-XXXX |
| **DevOps Lead** | +66 89-XXX-XXXX |
| **Engineering Lead** | +66 95-XXX-XXXX |
| **CTO** | +66 92-XXX-XXXX |

---

## Deployment Runbook

### Overview

- **Purpose**: Guide for deploying FarmIQ services to production
- **Audience**: DevOps, SRE
- **Last Updated**: 2025-01-26

### Prerequisites

- Access to Kubernetes cluster (kubectl configured)
- Access to container registry (Docker Hub/AWS ECR)
- Access to CI/CD pipeline (GitHub Actions)
- Monitoring dashboard access

### Procedure

#### 1. Pre-Deployment Checks

```bash
# Check cluster health
kubectl get nodes

# Check current deployments
kubectl get deployments -n farmiq

# Check resource usage
kubectl top nodes
kubectl top pods -n farmiq
```

#### 2. Build and Push Images

```bash
# Trigger CI/CD pipeline
gh workflow run deploy.yml -f environment=production

# Or build manually
docker build -t farmiq/api-gateway:latest .
docker push farmiq/api-gateway:latest
```

#### 3. Deploy Services

```bash
# Deploy using Helm
helm upgrade --install farmiq ./helm/farmiq \
  --namespace farmiq \
  --values values-production.yaml \
  --wait

# Or using kubectl
kubectl apply -f k8s/production/
```

#### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n farmiq

# Check service status
kubectl get svc -n farmiq

# Check logs
kubectl logs -f deployment/api-gateway -n farmiq
```

#### 5. Smoke Tests

```bash
# Run smoke tests
./scripts/smoke-test.sh

# Or using curl
curl https://api.farmiq.example.com/health
```

### Verification

- [ ] All pods are running
- [ ] All services are accessible
- [ ] Health checks passing
- [ ] Smoke tests successful
- [ ] No errors in logs

### Rollback

If deployment fails:

```bash
# Rollback Helm release
helm rollback farmiq -n farmiq

# Or rollback to previous kubectl apply
kubectl rollout undo deployment/api-gateway -n farmiq
```

---

## Incident Response Playbook

### Overview

- **Purpose**: Guide for responding to production incidents
- **Audience**: On-Call SRE, DevOps
- **Last Updated**: 2025-01-26

### Incident Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **P1** | System down, critical impact | 15 minutes |
| **P2** | Major functionality impaired | 1 hour |
| **P3** | Minor functionality impaired | 4 hours |
| **P4** | Cosmetic or documentation | 24 hours |

### Procedure

#### 1. Incident Detection

- Alert received from monitoring system
- User report via support channel
- Automated detection via health checks

#### 2. Initial Assessment

```bash
# Check system status
kubectl get pods -n farmiq
kubectl get events -n farmiq --sort-by='.lastTimestamp'

# Check logs
kubectl logs -f deployment/api-gateway -n farmiq --tail=100

# Check metrics
kubectl top pods -n farmiq
```

#### 3. Declare Incident

1. Create incident in incident management system
2. Notify on-call team
3. Create Slack channel: `#incident-YYYYMMDD-XXX`
4. Set severity level

#### 4. Triage

- Identify affected services
- Determine root cause
- Assess impact scope
- Estimate resolution time

#### 5. Mitigation

Apply temporary fix to restore service:

```bash
# Restart affected pods
kubectl rollout restart deployment/api-gateway -n farmiq

# Scale up resources
kubectl scale deployment api-gateway --replicas=5 -n farmiq

# Rollback recent changes
helm rollback farmiq -n farmiq
```

#### 6. Resolution

- Apply permanent fix
- Verify service restored
- Monitor for recurrence

#### 7. Post-Incident

- Write incident report
- Schedule post-mortem
- Update runbooks
- Track action items

### Verification

- [ ] Service fully operational
- [ ] All health checks passing
- [ ] No errors in logs
- [ ] Monitoring metrics normal

### References

- [Incident Management Policy](../compliance/incident-policy.md)
- [Monitoring Dashboard](https://grafana.farmiq.example.com)
- [Alert Rules](../monitoring/alert-rules.md)

---

## Database Operations Runbook

### Overview

- **Purpose**: Guide for database maintenance operations
- **Audience**: DevOps, DBA
- **Last Updated**: 2025-01-26

### Prerequisites

- Database admin credentials
- Access to Kubernetes cluster
- Backup access

### Procedure

#### Database Failover

##### 1. Verify Primary is Down

```bash
# Check primary status
kubectl exec -it postgres-0 -n farmiq -- pg_isready

# Check replica lag
kubectl exec -it postgres-1 -n farmiq -- psql -c "SELECT * FROM pg_stat_replication;"
```

##### 2. Promote Replica to Primary

```bash
# Promote replica
kubectl exec -it postgres-1 -n farmiq -- pg_ctl promote -D /var/lib/postgresql/data

# Update Kubernetes service
kubectl patch svc postgres -n farmiq -p '{"spec":{"selector":{"role":"primary"}}}'
```

##### 3. Update Connection Strings

Update application configuration:

```yaml
# values-production.yaml
database:
  host: postgres-1.postgres.farmiq.svc.cluster.local
```

Deploy updated configuration:

```bash
helm upgrade farmiq ./helm/farmiq -n farmiq --values values-production.yaml
```

##### 4. Verify Connectivity

```bash
# Test connection from application
kubectl exec -it api-gateway-xxx -n farmiq -- psql -h postgres -U farmiq -d farmiq

# Check application logs
kubectl logs -f deployment/api-gateway -n farmiq
```

#### Database Backup

```bash
# Create backup
kubectl exec -it postgres-0 -n farmiq -- pg_dump -U farmiq farmiq > backup.sql

# Or use pgbackrest
kubectl exec -it pgbackrest-xxx -n farmiq -- pgbackrest --stanza=farmiq backup
```

#### Database Restore

```bash
# Restore from backup
kubectl exec -it postgres-0 -n farmiq -- psql -U farmiq farmiq < backup.sql

# Or use pgbackrest
kubectl exec -it pgbackrest-xxx -n farmiq -- pgbackrest --stanza=farmiq restore
```

### Verification

- [ ] Database accessible
- [ ] Applications connected
- [ ] No data loss
- [ ] Replication working
- [ ] Monitoring shows healthy

### Rollback

If failover fails:

```bash
# Promote original primary back
kubectl exec -it postgres-0 -n farmiq -- pg_ctl promote -D /var/lib/postgresql/data

# Update service selector
kubectl patch svc postgres -n farmiq -p '{"spec":{"selector":{"role":"primary"}}}'
```

---

## Backup & Recovery Runbook

### Overview

- **Purpose**: Guide for backup and recovery operations
- **Audience**: DevOps, SRE
- **Last Updated**: 2025-01-26

### Backup Strategy

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| **Database** | Daily | 30 days | S3 |
| **Application Config** | Per deploy | 90 days | Git |
| **Logs** | Continuous | 30 days | S3 |
| **User Data** | Daily | 7 years | S3 |

### Procedure

#### Creating Backups

##### Database Backup

```bash
# Automated (via cronjob)
kubectl create job backup-$(date +%Y%m%d) --from=cronjob/db-backup -n farmiq

# Manual
kubectl exec -it postgres-0 -n farmiq -- pg_dump -U farmiq farmiq | gzip > backup.sql.gz
aws s3 cp backup.sql.gz s3://farmiq-backups/database/
```

##### Configuration Backup

```bash
# Backup Kubernetes configs
kubectl get all -n farmiq -o yaml > farmiq-k8s-backup.yaml

# Backup Helm values
helm get values farmiq -n farmiq > farmiq-helm-values.yaml
```

#### Restoring from Backup

##### Database Restore

```bash
# Download backup
aws s3 cp s3://farmiq-backups/database/backup.sql.gz .

# Restore
gunzip -c backup.sql.gz | kubectl exec -i postgres-0 -n farmiq -- psql -U farmiq farmiq
```

##### Configuration Restore

```bash
# Restore Kubernetes configs
kubectl apply -f farmiq-k8s-backup.yaml

# Restore Helm values
helm upgrade farmiq ./helm/farmiq -n farmiq --values farmiq-helm-values.yaml
```

### Verification

- [ ] Backup completed successfully
- [ ] Backup file exists in S3
- [ ] Backup size is reasonable
- [ ] Restore tested (if applicable)

### References

- [Backup Policy](../compliance/backup-policy.md)
- [S3 Configuration](../infrastructure/s3-config.md)

---

## Scaling Procedures

### Overview

- **Purpose**: Guide for scaling FarmIQ services
- **Audience**: DevOps, SRE
- **Last Updated**: 2025-01-26

### Scaling Strategies

#### Horizontal Scaling

Scale by adding more instances:

```bash
# Scale deployment
kubectl scale deployment api-gateway --replicas=5 -n farmiq

# Use HPA for auto-scaling
kubectl autoscale deployment api-gateway --cpu-percent=70 --min=3 --max=10 -n farmiq
```

#### Vertical Scaling

Scale by increasing resources:

```yaml
# values-production.yaml
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```

### Procedure

#### 1. Monitor Resource Usage

```bash
# Check pod resource usage
kubectl top pods -n farmiq

# Check node resource usage
kubectl top nodes

# Check HPA status
kubectl get hpa -n farmiq
```

#### 2. Identify Bottleneck

- High CPU: Scale horizontally or increase CPU limits
- High Memory: Scale horizontally or increase memory limits
- High Disk: Scale storage or clean up logs
- Network I/O: Scale horizontally or optimize queries

#### 3. Apply Scaling

```bash
# Horizontal scaling
kubectl scale deployment api-gateway --replicas=10 -n farmiq

# Vertical scaling (edit deployment)
kubectl edit deployment api-gateway -n farmiq

# Auto-scaling
kubectl apply -f k8s/hpa.yaml
```

#### 4. Verify Scaling

```bash
# Check pod count
kubectl get pods -n farmiq

# Check resource allocation
kubectl describe pod api-gateway-xxx -n farmiq

# Monitor performance
kubectl top pods -n farmiq
```

### Verification

- [ ] New pods running
- [ ] Resource usage improved
- [ ] No performance degradation
- [ ] All health checks passing

---

## Monitoring & Alerting Guide

### Overview

- **Purpose**: Guide for monitoring and alerting configuration
- **Audience**: DevOps, SRE
- **Last Updated**: 2025-01-26

### Monitoring Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Metrics** | Prometheus | Time-series metrics |
| **Visualization** | Grafana | Dashboards |
| **Logging** | ELK Stack | Log aggregation |
| **Tracing** | Jaeger | Distributed tracing |

### Key Metrics

#### Application Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_request_duration_seconds` | Request latency | > 1s (P95) |
| `http_requests_total` | Request count | N/A |
| `http_requests_errors_total` | Error count | > 1% |
| `active_connections` | Active connections | > 80% of max |

#### Infrastructure Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `cpu_usage_percent` | CPU usage | > 80% |
| `memory_usage_percent` | Memory usage | > 85% |
| `disk_usage_percent` | Disk usage | > 80% |
| `pod_restart_count` | Pod restarts | > 3/hour |

#### Database Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `pg_stat_database_deadlocks` | Deadlocks | > 0 |
| `pg_stat_replication_lag` | Replication lag | > 30s |
| `pg_stat_activity_count` | Active connections | > 80% of max |

### Alert Rules

Configure alerts in Prometheus:

```yaml
# alerts.yaml
groups:
  - name: farmiq
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value }} errors/sec

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database is down
```

### Dashboards

Access dashboards at [https://grafana.farmiq.example.com](https://grafana.farmiq.example.com):

- **Overview**: System-wide health
- **API Gateway**: API performance
- **Core Services**: Business logic metrics
- **Database**: Database health
- **Infrastructure**: Node and pod metrics

---

## On-Call Handbook

### Overview

- **Purpose**: Guide for on-call engineers
- **Audience**: On-Call SRE, DevOps
- **Last Updated**: 2025-01-26

### On-Call Responsibilities

1. **Monitor Alerts**: Respond to alerts within SLA
2. **Incident Response**: Follow incident response playbook
3. **Communication**: Keep stakeholders informed
4. **Documentation**: Update runbooks and incident reports

### On-Call Schedule

- **Rotation**: Weekly rotation
- **Handoff**: Monday 9:00 AM
- **Primary**: Primary on-call engineer
- **Secondary**: Backup engineer

### Handoff Procedure

1. Review active incidents
2. Review pending changes
3. Review known issues
4. Update on-call status

### Escalation Path

```
Level 1: On-Call Engineer (15 min response)
    ↓ (if unresolved)
Level 2: DevOps Lead (30 min response)
    ↓ (if unresolved)
Level 3: Engineering Lead (1 hour response)
    ↓ (if unresolved)
Level 4: CTO (2 hours response)
```

### During On-Call

#### Before Shift

- [ ] Review previous shift notes
- [ ] Check monitoring dashboards
- [ ] Verify contact information
- [ ] Ensure laptop and phone charged

#### During Shift

- [ ] Monitor alerts continuously
- [ ] Respond to alerts within SLA
- [ ] Document all actions
- [ ] Communicate with stakeholders

#### After Shift

- [ ] Complete shift handoff notes
- [ ] Update incident reports
- [ ] Close resolved tickets
- [ ] Update runbooks if needed

### Tools

| Tool | Purpose | Link |
|------|---------|------|
| **PagerDuty** | Alert routing | [pagerduty.com](https://pagerduty.com) |
| **Slack** | Communication | [slack.com](https://slack.com) |
| **Grafana** | Monitoring | [grafana.farmiq.example.com](https://grafana.farmiq.example.com) |
| **Kubernetes** | Cluster management | kubectl |
| **AWS Console** | Cloud resources | [console.aws.amazon.com](https://console.aws.amazon.com) |

---

## Support

For operations support:

- **Email**: ops@farmiq.example.com
- **Slack**: #ops channel
- **Emergency**: +66 81-XXX-XXXX

---

**© 2025 FarmIQ. All rights reserved.**
