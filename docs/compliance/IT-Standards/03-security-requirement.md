# Security Requirement Standards

> **เอกสารมาตรฐานความปลอดภัยสำหรับการพัฒนาแอปพลิเคชัน**  
> Version: 1.0 | Last Updated: December 2024

---

## 📋 สารบัญ (Table of Contents)

1. [Secure Development](#1-secure-development)
2. [Authorization & Access Control](#2-authorization--access-control)
3. [Data Validation & Input Security](#3-data-validation--input-security)
4. [Password Management](#4-password-management)
5. [Audit Logging](#5-audit-logging)
6. [Data Protection](#6-data-protection)
7. [Session Management](#7-session-management)
8. [Security Testing](#8-security-testing)
9. [Web Security Configuration](#9-web-security-configuration)
10. [Compliance](#10-compliance)

---

## 1. Secure Development

### 1.1 Secure by Design (ข้อ 1)
| Item | Requirement |
|:-----|:------------|
| **Approach** | Secure by Design / Privacy by Design |
| **Scope** | - Hardening<br>- Secure source code<br>- ทุกขั้นตอนของการพัฒนาและติดตั้งระบบ |
| **Status** | ☐ |

### 1.2 Secure Development Lifecycle Checklist
| Phase | Security Activities |
|:------|:-------------------|
| **Design** | Threat modeling, Security architecture review |
| **Development** | Secure coding practices, Code review |
| **Testing** | VAPT, Security scanning |
| **Deployment** | Hardening, Security configuration |
| **Maintenance** | Patch management, Vulnerability monitoring |

---

## 2. Authorization & Access Control

### 2.1 Default Credentials (ข้อ 2.1)
| Item | Requirement |
|:-----|:------------|
| **Before Production** | ลบหรือเปลี่ยน default user accounts และ passwords ทั้งหมด |
| **Status** | ☐ |

### 2.2 Least Privilege Principle (ข้อ 2.2)
| Item | Requirement |
|:-----|:------------|
| **Design** | User privileges ต้องตั้งค่าให้น้อยที่สุดเท่าที่จำเป็นสำหรับการทำงาน |
| **Personal Data** | เมื่อเข้าถึงข้อมูลส่วนบุคคล ต้องแสดงเฉพาะข้อมูลของ data owner เท่านั้น |
| **Status** | ☐ |

### 2.3 Authorization Matrix (ข้อ 2.3)
| Item | Requirement |
|:-----|:------------|
| **Document** | ต้องมีเอกสาร Authorization Matrix ที่ชัดเจน |
| **Content** | กำหนด User Access Control ที่ชัดเจน |
| **Status** | ☐ |

### 2.4 Authorization Matrix Template
| Role | Module/Feature | Create | Read | Update | Delete | Notes |
|:-----|:---------------|:------:|:----:|:------:|:------:|:------|
| Admin | User Management | ✓ | ✓ | ✓ | ✓ | |
| User | Own Profile | ✗ | ✓ | ✓ | ✗ | Own data only |
| Guest | Public Content | ✗ | ✓ | ✗ | ✗ | |

---

## 3. Data Validation & Input Security

### 3.1 Input Validation (ข้อ 3.1)
| Item | Requirement |
|:-----|:------------|
| **Description** | ตรวจสอบความถูกต้องของข้อมูลที่ import เข้า database |
| **Security** | ป้องกัน special characters ที่ไม่จำเป็น เช่น `<@@!` |
| **Prevention** | - Cross-site Scripting (XSS)<br>- SQL Injection |
| **Status** | ☐ |

### 3.2 Data Validation Rules (ข้อ 3.2)
| Rule | Description | Status |
|:-----|:------------|:------:|
| **3.2.1 Data Type** | ตรวจสอบว่าข้อมูลตรงกับ data type ของ variable ในระบบ | ☐ |
| **3.2.2 Value Range** | ตรวจสอบว่าข้อมูลอยู่ใน range ที่กำหนด | ☐ |
| **3.2.3 Bounds Check** | ตรวจสอบ upper และ lower bounds ของค่า | ☐ |
| **3.2.4 Overflow Prevention** | ป้องกันข้อมูลเกินขอบเขตของ variable | ☐ |
| **3.2.5 Completeness** | ป้องกันข้อมูลสูญหายหรือไม่ครบถ้วน | ☐ |
| **3.2.6 Correctness** | ตรวจสอบความถูกต้องและเหมาะสมของค่า | ☐ |
| **3.2.7 Success Verification** | ตรวจสอบว่าค่าถูก enter เข้า field สำเร็จ | ☐ |

### 3.3 Data Integrity (ข้อ 3.3)
| Item | Requirement |
|:-----|:------------|
| **Unauthorized Modification** | ป้องกันการแก้ไขข้อมูลโดยไม่ได้รับอนุญาต |
| **Authority-based Changes** | การแก้ไขต้องอิงตาม user authority |
| **Real-time Update** | การเปลี่ยนแปลงต้อง update แบบ real-time |
| **Abnormal Conditions** | ป้องกัน abnormal conditions ของระบบ |
| **Status** | ☐ |

### 3.4 Sensitive Data Handling (ข้อ 3.3.1-3.3.2)
| Item | Requirement |
|:-----|:------------|
| **Cookie Security** | ห้ามใช้ cookies เก็บ user account, passwords หรือ personal information |
| **Autocomplete** | ต้อง disable autocomplete สำหรับ fields ที่เกี่ยวกับความปลอดภัย (username, password) |
| **Status** | ☐ |

```html
<!-- Example: Disable autocomplete -->
<input type="text" name="username" autocomplete="off" />
<input type="password" name="password" autocomplete="off" />
```

---

## 4. Password Management

### 4.1 Password Policy (ข้อ 4.1)
| Rule | Requirement | Status |
|:-----|:------------|:------:|
| **4.1.1 Minimum Length** | อย่างน้อย 8 ตัวอักษร | ☐ |
| **4.1.2 Complexity** | ต้องมี uppercase, lowercase, numbers และ special symbols | ☐ |
| **4.1.3 Expiration** | ต้องเปลี่ยนทุก 180 วัน | ☐ |
| **4.1.4 Lockout** | ล็อค account 5 นาที หลังจากใส่ผิด 5 ครั้งติดต่อกัน | ☐ |
| **4.1.5 Counter Reset** | รีเซ็ต counter เมื่อใส่รหัสผ่านถูกต้อง (ก่อนครบ 5 ครั้ง) | ☐ |

### 4.2 Password Handling
| Item | Requirement | Status |
|:-----|:------------|:------:|
| **4.2 Force Change** | บังคับเปลี่ยนรหัสผ่านเมื่อ login ครั้งแรกหรือหลัง admin reset | ☐ |
| **4.3 Masked Entry** | รหัสผ่านต้องไม่แสดงขณะพิมพ์ (masked) | ☐ |
| **4.4 No Remember** | ระบบต้องไม่จำรหัสผ่าน | ☐ |
| **4.5 Admin Password Delivery** | ส่งมอบ admin password ให้ Betagro หลังติดตั้งเสร็จ | ☐ |
| **4.6 MFA Support** | รองรับ Multi-Factor Authentication | ☐ |

### 4.3 Password Validation Example
```typescript
interface PasswordPolicy {
  minLength: 8;
  requireUppercase: true;
  requireLowercase: true;
  requireNumbers: true;
  requireSpecialChars: true;
  expirationDays: 180;
  maxFailedAttempts: 5;
  lockoutMinutes: 5;
}

function validatePassword(password: string): boolean {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 8;
  
  return hasUppercase && hasLowercase && hasNumbers && hasSpecialChars && isLongEnough;
}
```

---

## 5. Audit Logging

### 5.1 Required Log Types (ข้อ 5)
| Category | Required Information |
|:---------|:---------------------|
| **5.1 User Identification** | User ID, Employee ID |
| **5.2 Event Types** | Transaction logs, Abnormal event logs, Access logs |
| **5.3 Timestamp** | Date และ Time ของการเข้าใช้งาน (synchronized กับ reliable time source) |
| **5.4 Admin Activities** | ทุก activities ของ users ที่มี high-level permissions (admin/root) |
| **5.5 System Activities** | ชื่อ affected data, System component, Resources ที่เกี่ยวข้อง |
| **5.6 Activity Results** | ผลลัพธ์ของ activities ทั้ง successful และ unsuccessful |

### 5.2 Log Storage Requirements
| Item | Requirement | Status |
|:-----|:------------|:------:|
| **5.7 Retention** | เก็บ logs อย่างน้อย 90 วัน | ☐ |
| **5.8 SIEM Export** | รองรับ export logs ไปยัง log server หรือ external SIEM | ☐ |
| **5.9 Access** | Betagro ต้องเข้าถึง logs ได้ | ☐ |

### 5.3 Log Format Example
```json
{
  "timestamp": "2024-12-10T10:30:00.000Z",
  "userId": "EMP12345",
  "eventType": "LOGIN_SUCCESS",
  "action": "user_authentication",
  "resource": "auth_service",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "result": "success",
  "details": {
    "method": "password",
    "mfaUsed": true
  }
}
```

### 5.4 Required Event Logging
| Event Type | Must Log |
|:-----------|:---------|
| User authentication (login/logout) | ✓ |
| Failed login attempts | ✓ |
| Authorization changes | ✓ |
| Privilege modifications | ✓ |
| Data modifications (CRUD) | ✓ |
| System configuration changes | ✓ |
| Admin/root operations | ✓ |

---

## 6. Data Protection

### 6.1 Encryption & Masking (ข้อ 6)
| Item | Requirement |
|:-----|:------------|
| **Sensitive Data** | ต้อง encrypt หรือใช้ data masking |
| **Examples** | - Financial transactions<br>- Personal information |
| **Status** | ☐ |

### 6.2 Data Classification
| Classification | Protection Required | Examples |
|:---------------|:-------------------|:---------|
| **Public** | No encryption | Marketing content |
| **Internal** | Access control | Internal documents |
| **Confidential** | Encryption required | Financial data |
| **Restricted** | Encryption + Masking | PII, Passwords |

### 6.3 Encryption Standards
| Data State | Encryption Method |
|:-----------|:-----------------|
| **At Rest** | AES-256 or equivalent |
| **In Transit** | TLS 1.2+ |
| **Passwords** | bcrypt, Argon2, or PBKDF2 |

---

## 7. Session Management

### 7.1 Session Timeout (ข้อ 7)
| Item | Requirement |
|:-----|:------------|
| **Description** | ระบบต้องสามารถตั้งค่า session timeout ได้ |
| **Implementation** | Configurable timeout period |
| **Status** | ☐ |

### 7.2 Session Security Best Practices
| Practice | Requirement |
|:---------|:------------|
| **Session ID** | Generate using cryptographically secure random |
| **Transmission** | HTTPS only (Secure flag) |
| **Cookie Settings** | HttpOnly, SameSite=Strict |
| **Regeneration** | Regenerate session ID after login |
| **Invalidation** | Proper logout invalidation |

```typescript
// Session cookie configuration example
const sessionConfig = {
  name: 'sessionId',
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 60 * 1000, // 30 minutes
  },
  resave: false,
  saveUninitialized: false,
};
```

---

## 8. Security Testing

### 8.1 Security Test (ข้อ 8)
| Item | Requirement |
|:-----|:------------|
| **When** | ก่อน Go-live (หากเข้าเกณฑ์ Security Test) |
| **Standard** | OWASP Top 10 (latest year) สำหรับ Web applications |
| **Executor** | Betagro Information Security Team |
| **Vendor Responsibility** | ต้องแก้ไข vulnerabilities ที่พบ |
| **Status** | ☐ |

### 8.2 Web Application Firewall (ข้อ 9)
| Item | Requirement |
|:-----|:------------|
| **Condition** | กรณีใช้ URL จาก Betagro subdomain |
| **Requirement** | ต้องทำงานร่วมกับ Betagro's WAF ได้ |
| **Environments** | Testing และ Production |
| **Status** | ☐ |

### 8.3 Vulnerability Management (ข้อ 10)
| Severity | Requirement |
|:---------|:------------|
| **Critical** | ต้องปิดก่อน go-live และตลอดสัญญา |
| **High** | ต้องปิดก่อน go-live และตลอดสัญญา |
| **Medium** | ต้องปิดก่อน go-live และตลอดสัญญา |
| **Low** | ประเมินและแก้ไขตาม risk |

---

## 9. Web Security Configuration

### 9.1 TLS/SSL Configuration (ข้อ 11.1-11.2)
| Item | Requirement | Status |
|:-----|:------------|:------:|
| **TLS Version** | ≥ 1.2 | ☐ |
| **Cipher Suites** | ไม่ใช้ Weak Cipher Suites | ☐ |
| **Certificate** | ห้ามใช้ Self-Signed Certificate | ☐ |

### 9.2 Security Headers (ข้อ 11.3-11.6)
| Header | Configuration | Status |
|:-------|:--------------|:------:|
| **CSP** | Content-Security-Policy ต้อง enable | ☐ |
| **HSTS** | ≥ 12 months (31536000 seconds) | ☐ |
| **X-Content-Type-Options** | nosniff | ☐ |
| **Ports** | ปิด port 80, 8080 หรือจำกัด source IP | ☐ |

### 9.3 Recommended Security Headers
```nginx
# Nginx configuration example
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 10. Compliance

### 10.1 PDPA Compliance (ข้อ 12-13)
| Item | Requirement | Status |
|:-----|:------------|:------:|
| **Test Data (ข้อ 12)** | หากมี Personal Data ต้องขออนุญาตจาก Betagro ก่อน import | ☐ |
| **System Compliance (ข้อ 13)** | ระบบต้อง comply กับ PDPA | ☐ |
| **Integration** | รองรับการเชื่อมต่อกับ Betagro's Personal Data Management System | ☐ |

### 10.2 Patch Management (ข้อ 14)
| Item | Requirement |
|:-----|:------------|
| **Version Updates** | ต้อง update version และ security patches |
| **Scope** | ทั้งระหว่างพัฒนาและให้บริการตลอดสัญญา |
| **Purpose** | ป้องกัน threats ที่ส่งผลกระทบต่อความปลอดภัยของระบบและข้อมูล |
| **Status** | ☐ |

### 10.3 API Security (ข้อ 15)
| Item | Requirement |
|:-----|:------------|
| **Interface Security** | กำหนด security สำหรับ application interface |
| **Methods** | - API Security<br>- Certificate<br>- Encryption ที่เกี่ยวข้อง |
| **Status** | ☐ |

### 10.4 Time Configuration (ข้อ 16)
| Item | Requirement |
|:-----|:------------|
| **Timezone** | ต้องตั้งเวลาตามมาตรฐานประเทศไทย (ICT, UTC+7) |
| **NTP Sync** | ใช้ reliable time source |
| **Status** | ☐ |

---

## 11. Security Checklist Summary

### Pre-Deployment Security Checklist
| # | Category | Item | Status |
|:--|:---------|:-----|:------:|
| 1 | Development | Secure by Design implemented | ☐ |
| 2 | Authorization | Default credentials removed/changed | ☐ |
| 3 | Authorization | Least privilege configured | ☐ |
| 4 | Authorization | Authorization matrix documented | ☐ |
| 5 | Input | All input validation implemented | ☐ |
| 6 | Input | XSS/SQL Injection prevention | ☐ |
| 7 | Password | Password policy implemented | ☐ |
| 8 | Password | MFA supported | ☐ |
| 9 | Logging | Audit logging configured | ☐ |
| 10 | Logging | Log retention ≥ 90 days | ☐ |
| 11 | Logging | SIEM export supported | ☐ |
| 12 | Encryption | Data at rest encrypted | ☐ |
| 13 | Encryption | Data in transit encrypted (TLS 1.2+) | ☐ |
| 14 | Session | Session timeout configured | ☐ |
| 15 | Testing | VAPT completed | ☐ |
| 16 | Testing | Critical/High/Medium vulnerabilities fixed | ☐ |
| 17 | Headers | Security headers configured | ☐ |
| 18 | TLS | TLS 1.2+ only, no weak ciphers | ☐ |
| 19 | Compliance | PDPA compliant | ☐ |
| 20 | Compliance | Thailand timezone configured | ☐ |

---

## 📎 Appendix

### A. OWASP Top 10 Reference
| # | Vulnerability | Prevention |
|:--|:--------------|:-----------|
| A01 | Broken Access Control | Implement proper authorization |
| A02 | Cryptographic Failures | Use strong encryption |
| A03 | Injection | Input validation, parameterized queries |
| A04 | Insecure Design | Threat modeling, security patterns |
| A05 | Security Misconfiguration | Hardening, secure defaults |
| A06 | Vulnerable Components | Dependency scanning, updates |
| A07 | Authentication Failures | Strong auth, MFA |
| A08 | Data Integrity Failures | Digital signatures, integrity checks |
| A09 | Security Logging Failures | Comprehensive logging, monitoring |
| A10 | SSRF | Input validation, network segmentation |

### B. Security Tools
| Tool | Purpose |
|:-----|:--------|
| OWASP ZAP | Web application security scanner |
| Burp Suite | Security testing platform |
| Checkmarx | Static code analysis |
| SonarQube | Code quality & security |
| Snyk | Dependency vulnerability scanning |
| Trivy | Container security scanning |

### C. Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

*เอกสารนี้เป็นมาตรฐานความปลอดภัยที่ใช้สำหรับการพัฒนา Application ปรับปรุงครั้งล่าสุด: December 2024*



