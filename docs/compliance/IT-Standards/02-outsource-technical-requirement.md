# Outsource Technical Requirement Standards

> **เอกสารมาตรฐานการพัฒนาแอปพลิเคชันโดย Vendor/Outsource**  
> Version: 1.0 | Last Updated: December 2024

---

## 📋 สารบัญ (Table of Contents)

1. [Architecture & Approval](#1-architecture--approval)
2. [Performance Standards](#2-performance-standards)
3. [Testing Requirements](#3-testing-requirements)
4. [Security Requirements](#4-security-requirements)
5. [Documentation & Deliverables](#5-documentation--deliverables)
6. [Deployment & Infrastructure](#6-deployment--infrastructure)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Support & Maintenance](#8-support--maintenance)
9. [Accessibility & UX](#9-accessibility--ux)
10. [Technology Stack](#10-technology-stack)

---

## 1. Architecture & Approval

### 1.1 Architecture Approval (ข้อ 1)
| Item | Requirement |
|:-----|:------------|
| **Description** | ก่อนเริ่ม implementation ต้องนำเสนอและได้รับการอนุมัติ **เป็นลายลักษณ์อักษร** จาก GT&D |
| **Scope** | Integration Architecture, Deployment Architecture, Data Architecture, Security Architecture |
| **Assessment** | ณ วันส่งมอบงาน จะประเมินตาม Architecture ที่อนุมัติ และจะรับงานก็ต่อเมื่อเป็นไปตามที่อนุมัติ |
| **Status** | ☐ |

### 1.2 Change Management (ข้อ 2)
| Item | Requirement |
|:-----|:------------|
| **Description** | หากต้องการเปลี่ยนแปลงหลังจากอนุมัติแล้ว ต้องได้รับการอนุมัติ **เป็นลายลักษณ์อักษร** จาก GT&D อีกครั้ง |
| **Status** | ☐ |

### 1.3 Infrastructure Usage (ข้อ 3)
| Item | Requirement |
|:-----|:------------|
| **Description** | Betagro จะจัดเตรียม Infrastructure ให้ทีมพัฒนา ทีมต้องใช้ Infrastructure ที่จัดเตรียมให้ |
| **Responsibilities** | General day-to-day operations, Deployment, Debugging |
| **Status** | ☐ |

---

## 2. Performance Standards

### 2.1 Performance Metrics (ข้อ 4)
| Metric | Target | Measurement Tool |
|:-------|:-------|:-----------------|
| **UI Page Load** | ≤ 3 seconds | Chrome DevTools |
| **API Response Time** | ≤ 200ms (4G network) | Load testing tools |
| **Application API (w/o 3rd party)** | ≤ 100ms | Response time measurement |

### 2.2 Google PageSpeed Scores
| Measurement | Target |
|:------------|:-------|
| Performance | 90-100 |
| Accessibility | 90-100 |
| Best Practices | 90-100 |
| SEO | 90-100 |

### 2.3 Security Scores
| Metric | Target | Tool |
|:-------|:-------|:-----|
| Mozilla Observatory (HTTP) | A | [observatory.mozilla.org](https://observatory.mozilla.org/) |
| Mozilla Observatory (TLS) | A | [observatory.mozilla.org](https://observatory.mozilla.org/) |
| Mozilla Observatory (SSH) | A | [observatory.mozilla.org](https://observatory.mozilla.org/) |
| HSTS Header Duration | ≥ 12 months | Header check |
| SecurityScoreCard | Rating "A" | BTG Security Team |
| Qualys SSL Labs | A+ | [ssllabs.com](https://www.ssllabs.com/ssltest/) |

### 2.4 Load Testing (ข้อ 5)
| Item | Requirement |
|:-----|:------------|
| **Scope** | Full Application และ API Level |
| **Data** | Synthetic data ที่ generate โดย programmatic |
| **Agreement** | Load volume และ data amount ต้องตกลงกับ Product Owner และ Technology Team |
| **Deliverables** | Load Test Report |
| **Status** | ☐ |

---

## 3. Testing Requirements

### 3.1 Automated Testing (ข้อ 8)
| Item | Requirement |
|:-----|:------------|
| **Feature Coverage** | ≥ 70% |
| **Focus** | Important functionalities และ business logic |
| **Deliverables** | - Automated test scripts<br>- Manual to run<br>- Report after final deployment |
| **Configuration** | IPs/domains ของ target systems ต้อง configurable |
| **Status** | ☐ |

### 3.2 Manual Testing (ข้อ 9)
| Item | Requirement |
|:-----|:------------|
| **Frequency** | ก่อนส่งมอบทุก Sprint และ Final Delivery |
| **Scope** | UI, Features, Functionality, Translations |
| **Responsibility** | Team Lead ต้องดูแลให้มีการทดสอบ |
| **Status** | ☐ |

### 3.3 Environment Security (ข้อ 7)
| Environment | Security Requirement |
|:------------|:---------------------|
| Development | Protected, ไม่ accessible สาธารณะ |
| QA | Protected, ไม่ accessible สาธารณะ |
| UAT | Protected, ไม่ accessible สาธารณะ |

**Access Methods:**
- ภายใน BTG Network
- เฉพาะ BTG Employees
- มี username/password บนหน้าแรก

---

## 4. Security Requirements

### 4.1 VAPT Requirements
| Type | Requirement |
|:-----|:------------|
| **External VAPT (ข้อ 10)** | - ทำโดย Security Auditor ที่มี certification/accreditations<br>- ทำก่อน go-live<br>- ปรึกษา Betagro Head of Security ผ่าน Product Owner ก่อนเริ่ม<br>- ส่ง final report ให้ Betagro Security Team |
| **Internal VAPT (ข้อ 11)** | - Betagro Security Team อาจทำ VAPT เพิ่มเติม<br>- Vendor ต้องแก้ไข vulnerabilities ที่พบ |

### 4.2 Infrastructure as Code (ข้อ 23)
| Item | Requirement |
|:-----|:------------|
| **Build Steps** | เก็บเป็น code และ scripts |
| **Deployment Steps** | เก็บเป็น code และ scripts |
| **Secrets** | ห้ามมี sensitive หรือ secret values ใน code |
| **Database Keys** | Tables ที่มี high volume writes ห้ามใช้ integers - ใช้ UUID v7, bigint หรือ archiving |
| **Status** | ☐ |

---

## 5. Documentation & Deliverables

### 5.1 Workflow Documentation (ข้อ 6)
| Item | Requirement |
|:-----|:------------|
| **Content** | - Integration APIs<br>- Business flows<br>- Important workflows |
| **Format** | พร้อม screenshots และ video |
| **Status** | ☐ |

### 5.2 Development Setup Documentation (ข้อ 12)
| Item | Requirement |
|:-----|:------------|
| **Content** | วิธี setup และ run project ใน development environment |
| **Requirements** | - Setup ต้อง automated<br>- มี manual commands/setup น้อยที่สุด<br>- ทุก services ต้อง run บน local ได้<br>- External dependencies connect ไปยัง dev environment ได้ |
| **Status** | ☐ |

---

## 6. Deployment & Infrastructure

### 6.1 Horizontal Scalability (ข้อ 25)
| Item | Requirement |
|:-----|:------------|
| **Description** | Application ต้อง scale horizontally ได้ |
| **Requirements** | - รองรับการ run หลาย replicas/instances<br>- ทำงานได้หลัง load balancer |
| **Status** | ☐ |

### 6.2 Graceful Shutdown (ข้อ 26)
| Item | Requirement |
|:-----|:------------|
| **Description** | เมื่อได้รับ shutdown signal ต้อง complete ongoing requests ก่อน shutdown |
| **Status** | ☐ |

### 6.3 Containerization (ข้อ 27)
| Item | Requirement |
|:-----|:------------|
| **Packaging** | Docker containers |
| **Deployment** | มี deployment scripts สำหรับ deploy บน servers |
| **Status** | ☐ |

### 6.4 Maintenance Page (ข้อ 29)
| Item | Requirement |
|:-----|:------------|
| **Description** | Application ที่มี UI ต้องมี maintenance page |
| **Control** | ควบคุมด้วย environment variable |
| **Status** | ☐ |

### 6.5 Data Archiving (ข้อ 30)
| Item | Requirement |
|:-----|:------------|
| **Description** | รองรับ data archiving ไปยัง Betagro datalake |
| **Status** | ☐ |

### 6.6 Disaster Recovery (ข้อ 31)
| Item | Requirement |
|:-----|:------------|
| **Description** | ต้องมี Disaster Recovery Plan |
| **Automation Level** | Fully หรือ Semi-automated |
| **Status** | ☐ |

---

## 7. Monitoring & Observability

### 7.1 Logging & Monitoring (ข้อ 18)
| Item | Requirement |
|:-----|:------------|
| **Platform** | Betagro-Datadog account |
| **Alerting** | ต้อง configure ให้รู้ปัญหาก่อนที่ user จะ complain เป็นจำนวนมาก |
| **Status** | ☐ |

### 7.2 Error Handling (ข้อ 16-17)
| Item | Requirement |
|:-----|:------------|
| **Loading States** | แสดง loading icon สำหรับ operations ที่ใช้เวลา > 100ms |
| **Error Notifications** | แสดง user-friendly error message เมื่อเกิดข้อผิดพลาด |
| **Empty States** | แสดงข้อความที่เหมาะสมเมื่อไม่มีข้อมูล |
| **Auto Recovery** | Implement automatic recovery สำหรับ failures เสมอ |
| **Manual Recovery** | หาก auto recovery ไม่ได้เลย ต้องมี API สำหรับ admin-role trigger |
| **Status** | ☐ |

---

## 8. Support & Maintenance

### 8.1 Multilingual Support (ข้อ 19)
| Item | Requirement |
|:-----|:------------|
| **Languages** | Thai และ English |
| **Scope** | Text และ Images |
| **Content Provider** | Product Owner จะจัดหา copywrite-text และ images |
| **Escalation** | หาก Product Owner ไม่ใส่ใจ ต้องแจ้ง Head of Application Development |
| **Status** | ☐ |

### 8.2 Communication (ข้อ 22)
| Item | Requirement |
|:-----|:------------|
| **Languages** | English และ Thai |
| **Translator** | Vendor ต้องจัดหา translator สำหรับภาษาที่ไม่ถนัด |
| **Status** | ☐ |

### 8.3 Hypercare Period (ข้อ 32-35)
| Phase | Duration | Description |
|:------|:---------|:------------|
| **Initial Hypercare** | 30 days | Post go-live bug fixing |
| **Hypercare Extension** | 30 days restart | หลัง deploy bug fixes |
| **Cycle** | ต่อเนื่อง | จนกว่าจะไม่มี bug ใน hypercare period |
| **Project Closure** | เมื่อไม่มี bugs | ในช่วง hypercare period |

### 8.4 Post Go-Live Workshop (ข้อ 20)
| Item | Requirement |
|:-----|:------------|
| **Duration** | รวม 8 ชั่วโมง |
| **Spread** | 5 วัน |
| **Content** | ตอบคำถามของ Betagro technical และ business team |
| **Status** | ☐ |

### 8.5 Support Handover (ข้อ 21)
| Item | Requirement |
|:-----|:------------|
| **Timing** | เริ่ม involve Support Team 1-2 เดือนก่อน go-live |
| **Assets Required** | - Basic troubleshooting guide<br>- API documentation<br>- Architecture documentation<br>- Functional specification<br>- User manual |
| **Status** | ☐ |

---

## 9. Accessibility & UX

### 9.1 Responsive Design (ข้อ 13)
| Category | Resolutions |
|:---------|:------------|
| **Desktop** | 1920x1200, 1920×1080, 1536×864, 1366×768 |
| **Mobile** | 360×800, 414×896, 360×640, 412×915, 390×844, 360×780, 375×667, 375×812, 360×760, 393×851, 393×873, 412×892, 428×926, 360×720, 385×854, 412×869, 414×736, 412×846, 360×740, 384×854 |

> **Note:** Application ต้อง responsive ยกเว้นระบุไว้เป็นอย่างอื่น

### 9.2 Platform Support (ข้อ 14)
| Category | Supported |
|:---------|:----------|
| **Operating Systems** | Windows 10, MacOS Monterey+, Android 12+, iOS 15+ |
| **Browsers** | Firefox ESR, Chrome LTS, Safari (MacOS/iOS) |
| **Mobile Vendors** | Samsung, Apple |
| **Form Factors** | Laptop, Mobile, Tablet |

> **Note:** ESR & LTS versions ณ วันเริ่มต้นโปรเจกต์

### 9.3 Code Quality (ข้อ 15)
| Item | Requirement |
|:-----|:------------|
| **Console Logs** | ไม่มี unnecessary console logs |
| **TypeScript Errors** | Zero errors |
| **Package Warnings** | ไม่มี outdated หรือ deprecation warnings |
| **Build Warnings** | Zero warnings ใน build phase |
| **Status** | ☐ |

### 9.4 WCAG Compliance (ข้อ 28)
| Level | Requirement |
|:------|:------------|
| **Standard** | WCAG 2.2 Level A |

---

## 10. Technology Stack

### 10.1 Approved Technologies (ข้อ 36)

#### Backend
| Technology | Version | Notes |
|:-----------|:--------|:------|
| Node.js + TypeScript | LTS | Primary backend stack |
| Python + FastAPI | 3.10+ | Alternative with Uvicorn |
| ORM | Prisma | Database ORM |

#### Frontend
| Technology | Version | Notes |
|:-----------|:--------|:------|
| React.js + TypeScript | 18+ | Primary frontend framework |

#### Database
| Technology | Version | Notes |
|:-----------|:--------|:------|
| PostgreSQL | 14+ | Primary database with Prisma ORM |

#### Deployment & Infrastructure
| Technology | Version | Notes |
|:-----------|:--------|:------|
| Docker | Latest | Containerization |
| Kubernetes | Latest | Orchestration |

#### Logging & Monitoring
| Technology | Version | Notes |
|:-----------|:--------|:------|
| Winston | Latest | Logging library |
| Datadog | - | Monitoring & Alerting |

---

## 11. Definition of Done (ข้อ 24)

### Pre-Release Checklist
| # | Item | Status |
|:--|:-----|:------:|
| 1 | Architecture approved by GT&D (in writing) | ☐ |
| 2 | All changes re-approved by GT&D | ☐ |
| 3 | Page load ≤ 3s, API ≤ 200ms | ☐ |
| 4 | Google PageSpeed ≥ 90 all categories | ☐ |
| 5 | Security scores met (Observatory A, SSL A+) | ☐ |
| 6 | Automated test coverage ≥ 70% features | ☐ |
| 7 | Manual testing completed | ☐ |
| 8 | VAPT completed & issues fixed | ☐ |
| 9 | All environments protected | ☐ |
| 10 | Documentation complete (workflows, setup) | ☐ |
| 11 | Multilingual (TH/EN) complete | ☐ |
| 12 | WCAG 2.2 Level A compliant | ☐ |
| 13 | Horizontal scalability verified | ☐ |
| 14 | Graceful shutdown implemented | ☐ |
| 15 | Docker containers ready | ☐ |
| 16 | Maintenance page implemented | ☐ |
| 17 | Monitoring & alerting configured | ☐ |
| 18 | Disaster recovery plan documented | ☐ |
| 19 | Support handover initiated | ☐ |
| 20 | Zero build warnings/errors | ☐ |

---

## 📎 Appendix

### A. Tools Summary
| Tool | Purpose | Link |
|:-----|:--------|:-----|
| Google PageSpeed | Performance testing | [pagespeed.web.dev](https://pagespeed.web.dev/) |
| Mozilla Observatory | Security headers | [observatory.mozilla.org](https://observatory.mozilla.org/) |
| Qualys SSL Labs | SSL/TLS testing | [ssllabs.com](https://www.ssllabs.com/ssltest/) |
| Datadog | Monitoring & Logging | BTG account |

### B. Contact Escalation
| Issue | Contact |
|:------|:--------|
| Architecture Changes | GT&D |
| Security Concerns | Head of Security (via Product Owner) |
| Multilingual Issues | Head of Application Development |
| Load Testing Agreement | Product Owner + Technology Team |

---

*เอกสารนี้เป็นมาตรฐานที่ใช้สำหรับการพัฒนา Application โดย Vendor/Outsource ปรับปรุงครั้งล่าสุด: December 2024*



