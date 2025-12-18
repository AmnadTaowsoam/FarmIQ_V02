# In-house Technical Requirement Standards

> **เอกสารมาตรฐานการพัฒนาแอปพลิเคชันภายใน (In-house Development)**  
> Version: 1.0 | Last Updated: December 2024

---

## 📋 สารบัญ (Table of Contents)

1. [Architecture & Approval](#1-architecture--approval)
2. [Technology Stack & Tools](#2-technology-stack--tools)
3. [Performance Standards](#3-performance-standards)
4. [Code Quality & Testing](#4-code-quality--testing)
5. [Security Requirements](#5-security-requirements)
6. [Documentation](#6-documentation)
7. [Deployment & Infrastructure](#7-deployment--infrastructure)
8. [Support & Maintenance](#8-support--maintenance)
9. [Accessibility & UX](#9-accessibility--ux)

---

## 1. Architecture & Approval

### 1.1 Architecture Approval (ข้อ 1)
| Item | Requirement |
|:-----|:------------|
| **Description** | ก่อนเริ่มพัฒนา ต้องนำเสนอและได้รับการอนุมัติจาก GT&D ในเรื่อง Development Architecture, Deployment Architecture, Data Architecture และ Security Architecture |
| **Verification** | มีเอกสาร Architecture ที่ได้รับการอนุมัติ |
| **Acceptance Criteria** | - มี Architecture Diagram ครบทุกด้าน<br>- มีลายเซ็นอนุมัติจาก GT&D<br>- การพัฒนาต้องเป็นไปตาม Architecture ที่อนุมัติ |
| **Status** | ☐ |

### 1.2 Change Management
| Item | Requirement |
|:-----|:------------|
| **Description** | หากต้องการเปลี่ยนแปลง Architecture หลังจากอนุมัติแล้ว ต้องได้รับการอนุมัติจาก GT&D อีกครั้ง |
| **Verification** | มี Change Request ที่ได้รับการอนุมัติ |
| **Acceptance Criteria** | มี Change Log และเอกสารอนุมัติการเปลี่ยนแปลง |
| **Status** | ☐ |

---

## 2. Technology Stack & Tools

### 2.1 Approved Technology Stack (ข้อ 2)
| Item | Requirement |
|:-----|:------------|
| **Description** | ใช้เฉพาะ Tools, Technologies และ Code Libraries ที่ได้รับการอนุมัติจาก GT&D เท่านั้น |
| **Verification** | ตรวจสอบ package.json, requirements.txt, go.mod หรือไฟล์ dependency ที่เกี่ยวข้อง |
| **Acceptance Criteria** | - ใช้เฉพาะ Library ที่อนุมัติ<br>- หากต้องการใช้ Library ใหม่ ต้องมีเอกสารขออนุมัติ<br>- ห้ามใช้ Personal Accounts และ Licenses |
| **Status** | ☐ |

### 2.2 Approved Technology List

#### Backend
| Technology | Version | Notes |
|:-----------|:--------|:------|
| Node.js + TypeScript | LTS | Primary backend stack |
| Python + FastAPI | 3.10+ | Alternative backend with Uvicorn |
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

#### Logging
| Technology | Version | Notes |
|:-----------|:--------|:------|
| Winston | Latest | JSON format logging |
| Datadog | - | Monitoring & Alerting |

### 2.3 Infrastructure Provision (ข้อ 3)
| Item | Requirement |
|:-----|:------------|
| **Description** | Betagro จะจัดเตรียม Infrastructure ให้ทีมพัฒนา ทีมต้องใช้ Infrastructure ที่จัดเตรียมให้และรับผิดชอบการ Deploy และ Debug |
| **Acceptance Criteria** | - ใช้ Infrastructure ที่จัดเตรียมให้เท่านั้น<br>- ทีมสามารถ Deploy และ Debug ได้ด้วยตัวเอง |
| **Status** | ☐ |

---

## 3. Performance Standards

### 3.1 Page Load Performance (ข้อ 5)
| Metric | Target | Tool |
|:-------|:-------|:-----|
| Page Load Time | ≤ 3 seconds | Chrome DevTools |
| API Response Time | ≤ 200ms (4G network) | Load testing tools |
| Google PageSpeed - Performance | 90-100 | [PageSpeed Insights](https://pagespeed.web.dev/) |
| Google PageSpeed - Accessibility | 90-100 | [PageSpeed Insights](https://pagespeed.web.dev/) |
| Google PageSpeed - Best Practices | 90-100 | [PageSpeed Insights](https://pagespeed.web.dev/) |
| Google PageSpeed - SEO | 90-100 | [PageSpeed Insights](https://pagespeed.web.dev/) |

### 3.2 Security Scores
| Metric | Target | Tool |
|:-------|:-------|:-----|
| Mozilla Observatory (HTTP) | A+ | [observatory.mozilla.org](https://observatory.mozilla.org/) |
| Mozilla Observatory (TLS) | A+ | [observatory.mozilla.org](https://observatory.mozilla.org/) |
| HSTS Header Duration | ≥ 12 months | Header check |
| SecurityScoreCard | Rating "A" | BTG Security Team |
| Qualys SSL Labs | A+ | [ssllabs.com](https://www.ssllabs.com/ssltest/) |

### 3.3 CDN & Caching (ข้อ 6)
| Item | Requirement |
|:-----|:------------|
| **Description** | Web Assets ต้อง serve ผ่าน CDN ที่ Betagro จัดเตรียมให้ |
| **Responsibilities** | - Upload/Update assets<br>- Cache invalidation<br>- Caching strategy<br>- API response caching (where possible) |
| **CORS Policy** | Backend ไม่ต้อง enable CORS สำหรับ Frontend ของตัวเอง (ใช้ same origin หรือ proxy) |
| **Status** | ☐ |

### 3.4 Load Testing (ข้อ 7)
| Item | Requirement |
|:-----|:------------|
| **Description** | ทำ Load Test ทั้ง Full Application และ API Level |
| **Requirements** | - Test Plan ต้องได้รับความเห็นชอบจาก Product Owner และ Technology Team<br>- Synthetic data ต้อง generate โดย programmatic<br>- ต้องรันเป็นส่วนหนึ่งของ DevOps Pipeline (ก่อน/หลัง deploy ไป dev) |
| **Deliverables** | - Load Test Plan<br>- Load Test Report<br>- Performance Baseline |
| **Status** | ☐ |

---

## 4. Code Quality & Testing

### 4.1 Code Review (ข้อ 4)
| Item | Requirement |
|:-----|:------------|
| **Description** | ทำ Code Review กับ Betagro Technology Team เพื่อปรับปรุงคุณภาพโค้ด |
| **Focus Areas** | Clarity, Readability, Organization, Maintainability, Structure, Code Practices |
| **Requirements** | ต้องปฏิบัติตามข้อแนะนำที่ได้รับจากการ Review |
| **Status** | ☐ |

### 4.2 Code Quality Tools
| Tool | Purpose | Target |
|:-----|:--------|:-------|
| ESLint | Linting JavaScript/TypeScript | Zero warnings/errors |
| Knip | Find unused code | Zero unused exports |
| TypeScript | Type checking | Strict mode, zero errors |
| Checkmarx | Security scanning (ข้อ 13) | Issues fixed within sprint |

### 4.3 Test Coverage Requirements

#### Unit & Functional Tests (ข้อ 11)
| Metric | Target |
|:-------|:-------|
| Code Coverage (Frontend) | ≥ 70% |
| Code Coverage (Backend) | ≥ 70% |
| Code Coverage (Overall) | ≥ 70% |

#### E2E Integration Tests (ข้อ 10)
| Metric | Target |
|:-------|:-------|
| Requirement Coverage | ≥ 70% of all requirements |
| Test Types | Integration, Smoke, Regression |
| Scope | Software features, User requirements, User journey, Test cases, Test scenarios |

#### Manual Testing (ข้อ 12)
| Item | Requirement |
|:-----|:------------|
| **Frequency** | ทุก Sprint และ Final Delivery |
| **Scope** | UI, Features, Functionality, Translations |
| **Responsibility** | Team Lead ต้องดูแลให้มีการทดสอบอย่างครบถ้วน |
| **Status** | ☐ |

### 4.4 Code Cleanliness (ข้อ 20)
| Item | Requirement |
|:-----|:------------|
| **Console Logs** | ไม่มี unnecessary console logs ใน production |
| **TypeScript Errors** | Zero errors |
| **Package Warnings** | ไม่มี outdated หรือ deprecation warnings |
| **Unused Code** | ใช้ `knip` tool เพื่อหาและลบ unused code |
| **Build Warnings** | Zero warnings ใน build phase |
| **Status** | ☐ |

### 4.5 Version Control (ข้อ 8)
| Item | Requirement |
|:-----|:------------|
| **Required in VCS** | - Source code<br>- Test scripts<br>- Source maps<br>- Database schema<br>- Server setup scripts<br>- Images & Videos<br>- UI designs<br>- OpenAPI/Swagger documentation |
| **Branch Cleanup** | ลบ stale branches ยกเว้น env-deployment-specific และ main |
| **Ownership** | Assets ทั้งหมดเป็นของ Betagro, ห้าม vendor เก็บ copy |
| **Status** | ☐ |

---

## 5. Security Requirements

### 5.1 Environment Security (ข้อ 9)
| Environment | Requirement |
|:------------|:------------|
| Development | ไม่ accessible สาธารณะ, ต้องอยู่ใน BTG Network หรือมี authentication |
| QA | ไม่ accessible สาธารณะ, ต้องอยู่ใน BTG Network หรือมี authentication |
| UAT | ไม่ accessible สาธารณะ, ต้องอยู่ใน BTG Network หรือมี authentication |

### 5.2 VAPT Requirements
| Item | Requirement |
|:-----|:------------|
| **External VAPT (ข้อ 14)** | ทำ VAPT กับ Security Auditor ที่มี certification/accreditations ที่เป็นที่ยอมรับ ก่อน go-live |
| **Internal VAPT (ข้อ 15)** | Betagro Security Team จะทำ VAPT เพิ่มเติม และ vulnerabilities ที่พบต้องได้รับการแก้ไข |
| **Consultation** | ปรึกษา Betagro Head of Security ผ่าน Product Owner ก่อนเริ่ม VAPT |
| **Status** | ☐ |

### 5.3 Network Security
| Item | Requirement |
|:-----|:------------|
| **Network Policy** | Lock down ingress/egress network และเปิดเฉพาะ domains/IPs ที่จำเป็น |
| **Tools** | ใช้ Istio หรือ Cilium network policy |
| **Restriction** | ห้ามเปิด wildcard domains หรือ IP ranges ขนาดใหญ่ |
| **Status** | ☐ |

### 5.4 Infrastructure as Code (ข้อ 29)
| Item | Requirement |
|:-----|:------------|
| **Build Steps** | เก็บเป็น code/scripts |
| **Deployment Steps** | เก็บเป็น code/scripts |
| **Secrets** | ห้ามมี sensitive/secret values ใน code |
| **Status** | ☐ |

---

## 6. Documentation

### 6.1 Workflow Documentation (ข้อ 16)
| Item | Requirement |
|:-----|:------------|
| **Content** | Document important workflows ใน application |
| **Format** | พร้อม screenshots และ video |
| **Status** | ☐ |

### 6.2 Development Setup Documentation (ข้อ 17)
| Item | Requirement |
|:-----|:------------|
| **Content** | วิธี setup และ run project บน local development environment |
| **Requirements** | - Setup ต้อง automated<br>- มี manual steps น้อยที่สุด<br>- ทุก services ต้อง run บน local ได้<br>- External dependencies สามารถ connect ไปยัง dev environment |
| **Status** | ☐ |

---

## 7. Deployment & Infrastructure

### 7.1 Horizontal Scalability (ข้อ 32)
| Item | Requirement |
|:-----|:------------|
| **Description** | Application ต้อง scale horizontally ได้ |
| **Requirements** | - รองรับการ run หลาย replicas/instances<br>- ทำงานได้หลัง load balancer |
| **Status** | ☐ |

### 7.2 Database Design (ข้อ 30)
| Item | Requirement |
|:-----|:------------|
| **Primary Key** | Tables ที่มี high volume writes ต้องใช้ UUID v7 แทน integer/bigint |
| **Reason** | ป้องกันปัญหา "running out of integer range" |
| **Status** | ☐ |

### 7.3 Persistent Storage (ข้อ 37)
| Item | Requirement |
|:-----|:------------|
| **Method** | ใช้ regular filesystem read/write กับ Kubernetes PVC |
| **Restriction** | ห้าม code เรียก cloud storage services โดยตรง (Azure Blob, GCS, etc.) |
| **Status** | ☐ |

### 7.4 Maintenance Page (ข้อ 35)
| Item | Requirement |
|:-----|:------------|
| **Description** | Application ที่มี UI ต้องมี maintenance page |
| **Control** | ควบคุมด้วย environment variable |
| **Status** | ☐ |

### 7.5 Data Archiving (ข้อ 36)
| Item | Requirement |
|:-----|:------------|
| **Description** | รองรับ data archiving ไปยัง Betagro datalake |
| **Status** | ☐ |

---

## 8. Support & Maintenance

### 8.1 Logging & Monitoring (ข้อ 23)
| Item | Requirement |
|:-----|:------------|
| **Platform** | Betagro-Datadog account |
| **Format** | JSON format |
| **Library** | BTG approved logging library |
| **Alerting** | ต้อง configure ให้รู้ปัญหาก่อนที่ user จะ complain |
| **Status** | ☐ |

### 8.2 Error Handling (ข้อ 21-22)
| Item | Requirement |
|:-----|:------------|
| **Loading States** | แสดง loading icon สำหรับ operations ที่ใช้เวลา > 100ms |
| **Error Notifications** | แสดง user-friendly error message เมื่อเกิดข้อผิดพลาด |
| **Empty States** | แสดงข้อความที่เหมาะสมเมื่อไม่มีข้อมูล |
| **Auto Recovery** | Implement automatic recovery สำหรับ failures ที่สำคัญ |
| **Manual Recovery** | หาก auto recovery ไม่ได้ ต้องมี API สำหรับ super-admin trigger |
| **Status** | ☐ |

### 8.3 Multilingual Support (ข้อ 24)
| Item | Requirement |
|:-----|:------------|
| **Languages** | Thai และ English |
| **Scope** | Text และ Images |
| **Content Provider** | Product Owner จะจัดหา copywrite-text และ images |
| **Escalation** | หาก Product Owner ไม่ใส่ใจ ต้องแจ้ง Head of Application Development |
| **Status** | ☐ |

### 8.4 Post Go-Live Support (ข้อ 25-27)
| Phase | Duration | Responsibility |
|:------|:---------|:---------------|
| Hypercare | 15 days | Fix critical & high priority bugs |
| Hypercare Extension | 15 days restart หลัง deploy fix | จนกว่าจะไม่มี bug ใน hypercare period |
| Workshop | 8 hours over 5 days | ให้ความรู้กับ Betagro team |
| Support Handover | 1-2 months ก่อน go-live | เริ่ม involve Support Team |

### 8.5 Handover Requirements (ข้อ 27)
| Asset | Required |
|:------|:---------|
| Basic Troubleshooting Guide | ✓ |
| API Documentation | ✓ |
| Architecture Documentation | ✓ |
| Functional Specification | ✓ |
| User Manual | ✓ |

### 8.6 Communication (ข้อ 28)
| Item | Requirement |
|:-----|:------------|
| **Languages** | English และ Thai |
| **Translator** | ทีมต้องจัดหา translator สำหรับภาษาที่ไม่ถนัด |
| **Status** | ☐ |

---

## 9. Accessibility & UX

### 9.1 WCAG Compliance (ข้อ 33)
| Level | Requirement |
|:------|:------------|
| **Standard** | WCAG 2.2 Level A (ขั้นต่ำสุด) |

#### Level A Requirements:
| Item | Description |
|:-----|:------------|
| **Alt Text** | รูปภาพต้องมีข้อความอธิบาย (Alt Text) เพื่อให้โปรแกรมอ่านหน้าจอบอกได้ว่ารูปคืออะไร |
| **Keyboard Navigation** | ใช้งานได้ด้วยแป้นพิมพ์ (Tab, Enter) ได้ทุกปุ่ม โดยไม่ต้องใช้เมาส์ |
| **No Keyboard Trap** | ไม่มีคอนเทนต์ที่ติดอยู่ เช่น เปิด popup แล้วต้องกด Esc หรือ Tab ออกได้ |
| **Clear Labels** | หัวข้อและปุ่มมีชื่อชัดเจน ห้ามมีปุ่มที่มีแค่ไอคอนโดยไม่มีข้อความอธิบาย |
| **No Fast Flashing** | ไม่มีสิ่งที่กระพริบเร็วเกินไป |

### 9.2 Responsive Design (ข้อ 18)
| Category | Resolutions |
|:---------|:------------|
| **Desktop** | 1920x1200, 1920×1080, 1536×864, 1366×768 |
| **Tablet** | Various tablet resolutions |
| **Mobile** | 360×800, 414×896, 360×640, 412×915, 390×844, 360×780, 375×667, 375×812, 360×760, 393×851, 393×873, 412×892, 428×926, 360×720, 385×854, 412×869, 414×736, 412×846, 360×740, 384×854 |

> **Note:** Product Owner จะยืนยันว่า application ต้อง responsive หรือไม่

### 9.3 Platform Support (ข้อ 19)
| Category | Supported |
|:---------|:----------|
| **Operating Systems** | Windows 10, MacOS Monterey+, Android 12+, iOS 15+ |
| **Browsers** | Firefox ESR, Chrome LTS, Safari (MacOS/iOS) |
| **Mobile Vendors** | Samsung, Apple |
| **Form Factors** | Laptop, Mobile, Tablet |

> **Note:** ESR & LTS versions ณ วันเริ่มต้นโปรเจกต์

---

## 10. Definition of Done (ข้อ 31)

ก่อน release ทุกครั้ง ต้องตรวจสอบให้ครบทุกข้อใน Definition of Done:

### Release Checklist
| # | Item | Status |
|:--|:-----|:------:|
| 1 | Architecture approved by GT&D | ☐ |
| 2 | All approved technologies only | ☐ |
| 3 | Page load ≤ 3s, API ≤ 200ms | ☐ |
| 4 | Google PageSpeed ≥ 90 all categories | ☐ |
| 5 | Code coverage ≥ 70% | ☐ |
| 6 | E2E test coverage ≥ 70% requirements | ☐ |
| 7 | Zero TypeScript/ESLint errors | ☐ |
| 8 | Zero unused code (knip check) | ☐ |
| 9 | Checkmarx issues resolved | ☐ |
| 10 | VAPT completed & issues fixed | ☐ |
| 11 | Documentation complete | ☐ |
| 12 | Multilingual (TH/EN) complete | ☐ |
| 13 | WCAG 2.2 Level A compliant | ☐ |
| 14 | Maintenance page implemented | ☐ |
| 15 | Logging to Datadog configured | ☐ |
| 16 | All environments protected | ☐ |
| 17 | Support handover initiated | ☐ |

---

## 📎 Appendix

### A. Scope Clarification (ข้อ 34)
หากทีมพัฒนาเห็นว่างานที่ขอเป็น out of scope:
1. ต้องนำเสนอ fact/data based evidence
2. หากเป็น scope บางส่วน ต้องทำส่วนที่อยู่ใน scope ให้เสร็จ

### B. Tools Summary
| Tool | Purpose | Link |
|:-----|:--------|:-----|
| Google PageSpeed | Performance testing | [pagespeed.web.dev](https://pagespeed.web.dev/) |
| Mozilla Observatory | Security headers | [observatory.mozilla.org](https://observatory.mozilla.org/) |
| Qualys SSL Labs | SSL/TLS testing | [ssllabs.com](https://www.ssllabs.com/ssltest/) |
| ESLint | JavaScript/TypeScript linting | - |
| Knip | Unused code detection | [npm:knip](https://www.npmjs.com/package/knip) |
| Checkmarx | Security scanning | BTG provided |
| Datadog | Monitoring & Logging | BTG account |

---

*เอกสารนี้เป็นมาตรฐานที่ใช้สำหรับการพัฒนา Application ภายใน ปรับปรุงครั้งล่าสุด: December 2024*



