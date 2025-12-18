# 📋 Betagro Coding Standards

> **มาตรฐานกลาง (Standard Checklist) สำหรับการพัฒนาแอปพลิเคชัน**  
> Group Technology & Digital (GT&D) Department

---

## 🎯 วัตถุประสงค์

โฟลเดอร์ `standards/` นี้เก็บมาตรฐานกลางสำหรับใช้ตรวจงานพัฒนาแอปพลิเคชัน ให้สอดคล้องกับข้อกำหนดของ IT / GT&D ทั้งเรื่องเทคนิค, ความปลอดภัย, โครงสร้างพื้นฐาน และ UX/UI Design

ใช้เป็น **แหล่งอ้างอิงเดียว (Single Source of Truth)** สำหรับ:
- ✅ ออกแบบสถาปัตยกรรม (Architecture Design)
- ✅ เขียนโค้ด / ทำ PR Review
- ✅ ทดสอบก่อนขึ้น UAT / Production
- ✅ ทำ Post-go-live / Hypercare Checklist
- ✅ Code Review และ Quality Assurance

---

## 📁 โครงสร้างเอกสาร

| ไฟล์ | คำอธิบาย |
|:-----|:---------|
| [`01-inhouse-technical-requirement.md`](./01-inhouse-technical-requirement.md) | ข้อกำหนดด้านเทคนิคสำหรับทีมพัฒนาภายใน (In-house) |
| [`02-outsource-technical-requirement.md`](./02-outsource-technical-requirement.md) | ข้อกำหนดสำหรับ Vendor / Outsource |
| [`03-security-requirement.md`](./03-security-requirement.md) | ข้อกำหนดด้านความปลอดภัย |
| [`04-technical-infrastructure-requirement.md`](./04-technical-infrastructure-requirement.md) | ข้อกำหนด Technical Infrastructure |
| [`05-design-requirement.md`](./05-design-requirement.md) | ข้อกำหนด UX/UI Design และ Accessibility |
| [`06-master-checklist.md`](./06-master-checklist.md) | รวม Checklist ทั้งหมดสำหรับ Code Review และ Pre-Release |
| [`07-approved-templates.md`](./07-approved-templates.md) | Boilerplate Templates ที่ได้รับการอนุมัติ (Node.js, Python, React) |

---

## 📊 สรุปมาตรฐานหลัก

### 🔧 Technical Standards

| หมวด | มาตรฐาน |
|:-----|:--------|
| **Performance** | Page Load ≤ 3s, API ≤ 200ms |
| **PageSpeed Score** | ≥ 90 ทุก category |
| **Test Coverage** | ≥ 70% Code Coverage |
| **E2E Test** | ≥ 70% Requirement Coverage |
| **Security Scan** | Checkmarx issues fixed within sprint |

### 🔐 Security Standards

| หมวด | มาตรฐาน |
|:-----|:--------|
| **TLS** | ≥ 1.2 |
| **HSTS** | ≥ 12 months |
| **Password** | 8+ chars, complexity required |
| **Log Retention** | ≥ 90 days |
| **VAPT** | Before go-live |

### 🎨 Design Standards

| หมวด | มาตรฐาน |
|:-----|:--------|
| **WCAG** | Level A (minimum) |
| **Load Time** | 0-2 seconds |
| **Touch Target** | ≥ 44x44px |

### 🏗️ Infrastructure Standards

| หมวด | มาตรฐาน |
|:-----|:--------|
| **Environments** | Dev, QAS, Production (separated) |
| **RTO** | ≤ 5.4 hours |
| **Scalability** | Horizontal & Vertical |

---

## 🛠️ Technology Stack ที่อนุมัติ

### Backend
| Technology | Version |
|:-----------|:--------|
| Node.js + TypeScript | LTS |
| Python + FastAPI | 3.10+ |
| Prisma ORM | Latest |

### Frontend
| Technology | Version |
|:-----------|:--------|
| React.js + TypeScript | 18+ |

### Database
| Technology | Version |
|:-----------|:--------|
| PostgreSQL | 14+ |

### Deployment
| Technology | Version |
|:-----------|:--------|
| Docker | Latest |
| Kubernetes | Latest |

### Monitoring
| Technology | Purpose |
|:-----------|:--------|
| Winston | Logging |
| Datadog | Monitoring & Alerting |

---

## 📝 วิธีใช้งาน Checklist

### 1. สำหรับโปรเจกต์ใหม่

```bash
# Copy standards folder ไปยังโปรเจกต์
cp -r standards/ /path/to/your-project/

# หรือ reference โดยตรง
```

### 2. สำหรับ Code Review

1. เปิดเอกสารที่เกี่ยวข้อง (Technical, Security, Design)
2. ใช้ Checklist ท้ายแต่ละเอกสารเพื่อตรวจสอบ
3. ทำเครื่องหมาย ☐ → ☑ เมื่อผ่านแต่ละข้อ

### 3. สำหรับ Pre-Deployment

1. รัน Automated Tests
2. ตรวจสอบ Performance Metrics
3. ทำ Security Scan
4. ผ่าน Checklist ใน Definition of Done

---

## ✅ Quick Checklist สำหรับ Release

| # | Category | Item |
|:--|:---------|:-----|
| 1 | Architecture | ได้รับการอนุมัติจาก GT&D |
| 2 | Performance | Page Load ≤ 3s, API ≤ 200ms |
| 3 | PageSpeed | ≥ 90 ทุก category |
| 4 | Testing | Code Coverage ≥ 70% |
| 5 | Security | VAPT completed, issues fixed |
| 6 | Security | TLS 1.2+, HSTS ≥ 12 months |
| 7 | Accessibility | WCAG 2.2 Level A |
| 8 | Documentation | Complete (Setup, API, Workflows) |
| 9 | Multilingual | Thai & English |
| 10 | Infrastructure | Maintenance page, Logging configured |

---

## 📋 Checklist Template

สำหรับแต่ละโปรเจกต์ สามารถสร้าง project-specific checklist ได้:

```markdown
# Project: [PROJECT_NAME]
## Pre-Release Checklist

### Technical Requirements
- [ ] Architecture approved
- [ ] Performance targets met
- [ ] Test coverage ≥ 70%
- [ ] Code review completed
- [ ] No ESLint/TypeScript errors

### Security Requirements  
- [ ] VAPT completed
- [ ] Vulnerabilities fixed
- [ ] Security headers configured
- [ ] Logging to SIEM

### Design Requirements
- [ ] WCAG Level A compliant
- [ ] Responsive design verified
- [ ] All resolutions tested

### Infrastructure
- [ ] All environments configured
- [ ] Backup & recovery tested
- [ ] Monitoring & alerting configured
- [ ] Maintenance page ready
```

---

## 🔄 Status Values

| Status | Meaning |
|:-------|:--------|
| ☐ | ยังไม่ได้ตรวจสอบ |
| ☑ หรือ OK | ผ่านแล้ว / มี evidence ชัดเจน |
| ✗ หรือ NOK | ยังไม่ผ่าน / ยังไม่ได้ทำ |
| N/A | ไม่เกี่ยวกับโปรเจกต์นี้ |

---

## 📞 Contact & Escalation

| Issue | Contact |
|:------|:--------|
| Architecture Questions | GT&D Team |
| Security Concerns | Head of Security (via Product Owner) |
| Technical Standards | Head of Application Development |
| Design Standards | UX/UI Design Team |

---

## 📚 Related Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

---

## 📜 Version History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 1.0 | December 2024 | Initial release |

---

*Maintained by Group Technology & Digital (GT&D) Department*



