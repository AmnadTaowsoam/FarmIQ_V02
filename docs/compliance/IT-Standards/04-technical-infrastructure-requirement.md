# Technical Infrastructure Requirement Standards

> **เอกสารมาตรฐาน Technical Infrastructure สำหรับการพัฒนาแอปพลิเคชัน**  
> Version: 1.0 | Last Updated: December 2024

---

## 📋 สารบัญ (Table of Contents)

1. [Cloud & Deployment Environment](#1-cloud--deployment-environment)
2. [Scalability](#2-scalability)
3. [Database](#3-database)
4. [Environment Separation](#4-environment-separation)
5. [System Sizing](#5-system-sizing)
6. [Backup & Recovery](#6-backup--recovery)
7. [Maintenance & Configuration](#7-maintenance--configuration)
8. [Archiving & Data Management](#8-archiving--data-management)
9. [Support & Monitoring](#9-support--monitoring)
10. [Documentation](#10-documentation)

---

## 1. Cloud & Deployment Environment

### 1.1 Cloud Deployment (ข้อ 1)
| Item | Requirement |
|:-----|:------------|
| **Description** | ต้อง deploy ได้บน Betagro's cloud environments |
| **Types** | IaaS หรือ PaaS |
| **Status** | ☐ |

### 1.2 Supported Cloud Platforms
| Platform | Type | Notes |
|:---------|:-----|:------|
| Azure | IaaS/PaaS | Primary cloud provider |
| GCP | IaaS/PaaS | Alternative |
| On-premise Kubernetes | Container | Betagro managed |

### 1.3 Deployment Requirements
| Item | Requirement |
|:-----|:------------|
| **Containerization** | Docker containers |
| **Orchestration** | Kubernetes |
| **CI/CD** | Automated deployment pipelines |
| **Infrastructure as Code** | Terraform, Helm, or equivalent |

---

## 2. Scalability

### 2.1 Vertical Scaling - Scale Up (ข้อ 2)
| Resource | Requirement |
|:---------|:------------|
| **CPU** | รองรับการ scale up ได้ตามความต้องการ |
| **Memory** | รองรับการ scale up ได้ตามความต้องการ |
| **Storage** | รองรับการ scale up ได้ตามความต้องการ |

### 2.2 Horizontal Scaling - Scale Out (ข้อ 2)
| Item | Requirement |
|:-----|:------------|
| **Description** | รองรับการ scale out ระบบในอนาคต |
| **Requirements** | - Stateless application design<br>- Session management via external store<br>- Load balancer ready |
| **Status** | ☐ |

### 2.3 Scalability Design Patterns
```yaml
# Kubernetes HPA Example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 3. Database

### 3.1 Database Support (ข้อ 3)
| Item | Requirement |
|:-----|:------------|
| **Minimum Support** | RDBMS หรือ NoSQL databases |
| **Status** | ☐ |

### 3.2 Approved Databases
| Type | Database | Use Case |
|:-----|:---------|:---------|
| **RDBMS** | PostgreSQL | Primary transactional data |
| **RDBMS** | MySQL | Legacy applications |
| **NoSQL** | MongoDB | Document storage |
| **NoSQL** | Key-value store (if approved) | Caching, Session storage |
| **NoSQL** | Elasticsearch | Search, Logging |

### 3.3 Database Best Practices
| Practice | Requirement |
|:---------|:------------|
| **Primary Key** | UUID v7 สำหรับ high-volume tables |
| **Indexing** | Proper indexes for query optimization |
| **Connection Pooling** | Implement connection pooling |
| **Query Optimization** | Avoid N+1 queries, use proper JOINs |
| **Migrations** | Version-controlled database migrations |

---

## 4. Environment Separation

### 4.1 Environment Structure (ข้อ 4)
| Environment | Purpose | Isolation |
|:------------|:--------|:----------|
| **Development** | Development และ unit testing | แยกอิสระจาก environments อื่น |
| **QAS (QA/Staging)** | Quality Assurance testing | แยกอิสระจาก environments อื่น |
| **Production** | Live production system | แยกอิสระจาก environments อื่น |

### 4.2 Environment Configuration
| Aspect | Requirement |
|:-------|:------------|
| **Network** | แยก VPC/Network ต่างกัน |
| **Database** | แยก database instances |
| **Secrets** | แยก secrets management |
| **Access** | Role-based access per environment |

### 4.3 Environment Promotion Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Development │ ──► │     QAS      │ ──► │  Production  │
│              │     │  (Staging)   │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
      │                     │                     │
   Dev Team              QA Team            Operations
   Testing             UAT Testing          Monitoring
```

---

## 5. System Sizing

### 5.1 Sizing Design (ข้อ 5)
| Item | Requirement |
|:-----|:------------|
| **Description** | ออกแบบและแนะนำ system sizing ที่เหมาะสม |
| **Capability** | แต่ละ system ต้องรองรับ workload ได้ |
| **Status** | ☐ |

### 5.2 Sizing Considerations
| Factor | Considerations |
|:-------|:---------------|
| **User Load** | Expected concurrent users, Peak usage times |
| **Data Volume** | Current data size, Growth rate projection |
| **Transaction Rate** | Requests per second, Batch processing volume |
| **Storage** | Database size, File storage, Logs retention |

### 5.3 Sizing Template
| Component | Metric | Dev | QAS | Prod |
|:----------|:-------|:----|:----|:-----|
| **Web Server** | CPU | 2 vCPU | 2 vCPU | 4 vCPU |
| **Web Server** | Memory | 4 GB | 4 GB | 8 GB |
| **App Server** | CPU | 2 vCPU | 4 vCPU | 8 vCPU |
| **App Server** | Memory | 8 GB | 16 GB | 32 GB |
| **Database** | CPU | 2 vCPU | 4 vCPU | 8 vCPU |
| **Database** | Memory | 8 GB | 16 GB | 32 GB |
| **Database** | Storage | 50 GB | 100 GB | 500 GB |

---

## 6. Backup & Recovery

### 6.1 Backup Capability (ข้อ 6)
| Item | Requirement |
|:-----|:------------|
| **Full System Recovery** | รองรับการกู้คืนระบบแบบสมบูรณ์ |
| **Partial Data Recovery** | รองรับการกู้คืนข้อมูลบางส่วน |
| **Recovery Time** | กู้คืนได้ภายใน 5.4 ชั่วโมงจากเวลาที่เกิด failure |
| **Status** | ☐ |

### 6.2 Backup Strategy
| Type | Frequency | Retention | Description |
|:-----|:----------|:----------|:------------|
| **Full Backup** | Weekly | 4 weeks | Complete system backup |
| **Incremental** | Daily | 7 days | Changes since last backup |
| **Transaction Log** | Hourly | 24 hours | Database transaction logs |
| **Snapshot** | Before deployment | 3 versions | System state snapshot |

### 6.3 Recovery Objectives
| Objective | Target |
|:----------|:-------|
| **RTO (Recovery Time Objective)** | ≤ 5.4 hours |
| **RPO (Recovery Point Objective)** | ≤ 1 hour |

### 6.4 Backup Verification
| Item | Requirement |
|:-----|:------------|
| **Regular Testing** | ทดสอบ restore process อย่างน้อยทุก quarter |
| **Documentation** | Document recovery procedures |
| **Automation** | Automate backup verification |

---

## 7. Maintenance & Configuration

### 7.1 Maintenance Page (ข้อ 7)
| Item | Requirement |
|:-----|:------------|
| **Description** | ต้องมี function แสดง maintenance page |
| **Custom Message** | สามารถตั้งค่า custom messages ได้ |
| **Scheduling** | Admin สามารถกำหนดเวลา maintenance ได้ |
| **Status** | ☐ |

### 7.2 Maintenance Page Example
```typescript
// Environment variable control
const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || 'System is under maintenance';
const estimatedEndTime = process.env.MAINTENANCE_END_TIME;

// Middleware example
function maintenanceMiddleware(req, res, next) {
  if (isMaintenanceMode && !isAdminRequest(req)) {
    return res.status(503).json({
      status: 'maintenance',
      message: maintenanceMessage,
      estimatedEndTime: estimatedEndTime
    });
  }
  next();
}
```

### 7.3 Configuration Change Logging (ข้อ 8)
| Item | Requirement |
|:-----|:------------|
| **Description** | Log การเปลี่ยนแปลง application configuration |
| **Control** | Admin สามารถ enable/disable logging ได้ |
| **Status** | ☐ |

### 7.4 Configuration Management
| Aspect | Requirement |
|:-------|:------------|
| **Version Control** | Configuration changes versioned |
| **Audit Trail** | Who, What, When for all changes |
| **Rollback** | Ability to rollback configuration |
| **Secrets** | Separate secrets management |

---

## 8. Archiving & Data Management

### 8.1 Data Archiving (ข้อ 9)
| Item | Requirement |
|:-----|:------------|
| **Description** | รองรับการ archive data ไปยัง backup database หรือ storage |
| **Reporting** | สามารถ report จาก archived storage ได้ |
| **Status** | ☐ |

### 8.2 Archiving Strategy
| Data Type | Archive After | Storage | Retention |
|:----------|:--------------|:--------|:----------|
| **Transaction Data** | 2 years | Cold storage | 7 years |
| **Logs** | 90 days | Archive storage | 1 year |
| **User Data** | Per policy | Secure archive | Per regulation |
| **Reports** | 1 year | Archive storage | 5 years |

### 8.3 Archive Implementation
```sql
-- Example: Partition strategy for archiving
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    -- other columns
) PARTITION BY RANGE (created_at);

-- Current year partition
CREATE TABLE transactions_2024 PARTITION OF transactions
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Archive partition
CREATE TABLE transactions_2023_archive PARTITION OF transactions
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01')
    TABLESPACE archive_storage;
```

---

## 9. Support & Monitoring

### 9.1 Support Team Capability (ข้อ 10)
| Item | Requirement |
|:-----|:------------|
| **Description** | ต้องมี support team ที่สามารถ handle และ resolve issues ได้ |
| **Minimum Scope** | Application และ Database issues |
| **Status** | ☐ |

### 9.2 Alerting (ข้อ 11)
| Item | Requirement |
|:-----|:------------|
| **Description** | สามารถสร้าง alerts ตาม conditions ที่กำหนด |
| **Notification** | แจ้งเตือนไปยังผู้เกี่ยวข้อง |
| **Example** | Abnormal batch job runtime |
| **Status** | ☐ |

### 9.3 Monitoring Requirements
| Category | Metrics to Monitor |
|:---------|:-------------------|
| **Infrastructure** | CPU, Memory, Disk, Network |
| **Application** | Response time, Error rate, Throughput |
| **Database** | Query performance, Connection pool, Locks |
| **Business** | Transaction volume, User sessions |

### 9.4 Alert Configuration Example
```yaml
# Datadog alert example
alerts:
  - name: High CPU Usage
    type: metric
    query: avg(last_5m):avg:system.cpu.user{*} > 80
    message: "CPU usage is above 80% for 5 minutes"
    notify: ["team-devops@betagro.com"]
    priority: P2

  - name: Batch Job Duration
    type: metric
    query: avg(last_1h):avg:batch.job.duration{job:daily_report} > 3600
    message: "Daily report batch job taking longer than expected"
    notify: ["team-support@betagro.com"]
    priority: P3

  - name: Error Rate Spike
    type: metric
    query: sum(last_5m):sum:app.errors{*}.as_rate() > 10
    message: "Error rate has spiked above 10 errors/second"
    notify: ["team-devops@betagro.com", "on-call@betagro.com"]
    priority: P1
```

---

## 10. Documentation

### 10.1 SQL Documentation (ข้อ 12)
| Item | Requirement |
|:-----|:------------|
| **Description** | เอกสารแสดงหรือส่งมอบทุก SQL statement ที่ run ในระบบ |
| **Consideration** | จะนำมาพิจารณา |
| **Status** | ☐ |

### 10.2 Required Documentation
| Document | Content |
|:---------|:--------|
| **Database Schema** | ERD, Table definitions, Relationships |
| **SQL Queries** | Important queries, Stored procedures |
| **Migration Scripts** | Version-controlled migrations |
| **Performance Queries** | Query optimization documentation |

### 10.3 SQL Documentation Template
```markdown
## Query: Get User Orders

### Purpose
Retrieve all orders for a specific user with pagination

### SQL
​```sql
SELECT 
    o.id,
    o.order_number,
    o.total_amount,
    o.status,
    o.created_at
FROM orders o
WHERE o.user_id = :userId
    AND o.status != 'CANCELLED'
ORDER BY o.created_at DESC
LIMIT :limit OFFSET :offset;
​```

### Parameters
| Parameter | Type | Description |
|:----------|:-----|:------------|
| userId | UUID | User identifier |
| limit | INTEGER | Page size |
| offset | INTEGER | Pagination offset |

### Indexes Used
- idx_orders_user_id_created_at

### Performance
- Average execution time: 5ms
- Rows scanned: ~1000 (with pagination)
```

---

## 11. Infrastructure Checklist

### Pre-Deployment Infrastructure Checklist
| # | Category | Item | Status |
|:--|:---------|:-----|:------:|
| 1 | Cloud | Deployable on Betagro cloud (IaaS/PaaS) | ☐ |
| 2 | Scalability | Vertical scaling supported (CPU/Memory/Storage) | ☐ |
| 3 | Scalability | Horizontal scaling supported (Scale-out) | ☐ |
| 4 | Database | RDBMS or NoSQL supported | ☐ |
| 5 | Environments | Dev, QAS, Production separated | ☐ |
| 6 | Sizing | System sizing documented | ☐ |
| 7 | Backup | Full system recovery supported | ☐ |
| 8 | Backup | Partial data recovery supported | ☐ |
| 9 | Backup | Recovery within 5.4 hours | ☐ |
| 10 | Maintenance | Maintenance page implemented | ☐ |
| 11 | Configuration | Config change logging enabled | ☐ |
| 12 | Archiving | Data archiving to backup storage | ☐ |
| 13 | Archiving | Reporting from archived data | ☐ |
| 14 | Support | Support team capable (App + DB) | ☐ |
| 15 | Alerting | Condition-based alerts configured | ☐ |
| 16 | Documentation | SQL statements documented | ☐ |

---

## 📎 Appendix

### A. Infrastructure Tools
| Tool | Purpose |
|:-----|:--------|
| Terraform | Infrastructure as Code |
| Helm | Kubernetes package management |
| Ansible | Configuration management |
| Prometheus | Metrics collection |
| Grafana | Metrics visualization |
| Datadog | Monitoring & Alerting |

### B. Capacity Planning Template
| Metric | Current | 6 Months | 1 Year | 3 Years |
|:-------|:--------|:---------|:-------|:--------|
| Users | | | | |
| Daily Transactions | | | | |
| Data Volume | | | | |
| Storage Required | | | | |
| Compute Required | | | | |

### C. Disaster Recovery Plan Template
1. **Detection** - How failures are detected
2. **Notification** - Who to notify and how
3. **Assessment** - Damage assessment procedure
4. **Recovery** - Step-by-step recovery process
5. **Validation** - How to verify recovery success
6. **Post-mortem** - Incident review process

---

*เอกสารนี้เป็นมาตรฐาน Technical Infrastructure สำหรับการพัฒนา Application ปรับปรุงครั้งล่าสุด: December 2024*



