# Phase 14: Internationalization (i18n)

**Owner**: Antigravity
**Priority**: P2 - Enterprise Enhancement
**Status**: Completed
**Created**: 2025-01-26
**Completed**: 2026-01-26

---

## Objective

Implement full internationalization support สำหรับ FarmIQ เพื่อรองรับ Enterprise customers ทั่วโลก

---

## Current State vs Target

| Feature | Current | Target |
|---------|---------|--------|
| UI Languages | EN only | EN, TH, VN, ID, ZH |
| Date/Time | UTC only | Tenant timezone |
| Currency | THB only | Multi-currency |
| Units | Metric only | Metric/Imperial |
| Number Format | Fixed | Locale-aware |
| RTL Support | None | Arabic (future) |

---

## Deliverables

### 14.1 Frontend i18n Setup

**Description**: Implement i18n framework in dashboard-web

**Tasks**:
- [x] Set up react-i18next
- [x] Extract all hardcoded strings
- [x] Create translation files (EN, TH)
- [x] Implement language switcher
- [x] Add locale detection
- [x] Test with long text (German test)

**Translation Structure**:
```json
// locales/en/common.json
{
  "nav": {
    "dashboard": "Dashboard",
    "farms": "Farms",
    "barns": "Barns"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "messages": {
    "success": "Operation completed successfully",
    "error": "An error occurred"
  }
}

// locales/th/common.json
{
  "nav": {
    "dashboard": "แดชบอร์ด",
    "farms": "ฟาร์ม",
    "barns": "โรงเรือน"
  }
}
```

**Required Skills**:
```
25-internationalization/i18n-setup
25-internationalization/localization
02-frontend/react-best-practices
22-ux-ui-design/thai-ux-patterns
```

**Acceptance Criteria**:
- EN and TH languages working
- Language switcher in UI
- No hardcoded strings
- Long text doesn't break layout

---

### 14.2 Backend i18n Support

**Description**: Add i18n support to API responses

**Tasks**:
- [x] Accept Accept-Language header
- [x] Translate error messages
- [x] Translate notification content
- [x] Translate AI insights
- [x] Store user language preference
- [x] Implement translation service

**API i18n Pattern**:
```typescript
// Error response with i18n
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format", // translated
    "details": [
      {
        "field": "email",
        "message": "Please enter a valid email address"
      }
    ]
  }
}

// Request with language preference
GET /api/v1/notifications
Accept-Language: th
```

**Required Skills**:
```
25-internationalization/localization
03-backend-api/error-handling
64-meta-standards/error-shape-taxonomy
17-domain-specific/notification-system
```

**Acceptance Criteria**:
- Accept-Language header respected
- Error messages translated
- Notifications support i18n

---

### 14.3 Timezone Support

**Description**: Implement proper timezone handling

**Tasks**:
- [x] Store all timestamps in UTC
- [x] Add timezone to tenant settings
- [x] Convert timestamps in BFF
- [x] Display in user's timezone
- [x] Handle DST transitions
- [x] Date range queries in timezone

**Timezone Implementation**:
```typescript
// Tenant settings
{
  "tenantId": "t-demo-001",
  "timezone": "Asia/Bangkok",
  "dateFormat": "DD/MM/YYYY",
  "timeFormat": "HH:mm"
}

// BFF response transformation
{
  "timestamp": "2025-01-26T10:00:00Z",  // UTC from DB
  "timestamp_local": "2025-01-26T17:00:00+07:00",  // Converted
  "formatted": "26/01/2025 17:00"  // Formatted per tenant
}
```

**Required Skills**:
```
25-internationalization/currency-timezone
04-database/prisma-guide
03-backend-api/express-rest
```

**Acceptance Criteria**:
- All timestamps in UTC internally
- Displayed in tenant timezone
- Date pickers respect timezone
- Reports use correct timezone

---

### 14.4 Number & Currency Formatting

**Description**: Implement locale-aware formatting

**Tasks**:
- [x] Number formatting (thousands separator)
- [x] Currency formatting
- [x] Percentage formatting
- [x] Weight unit conversion (kg/lb)
- [x] Temperature conversion (°C/°F)
- [x] Decimal precision handling

**Formatting Examples**:
```typescript
// Number formatting
formatNumber(12345.67, 'th-TH'); // "12,345.67"
formatNumber(12345.67, 'en-US'); // "12,345.67"
formatNumber(12345.67, 'de-DE'); // "12.345,67"

// Currency formatting
formatCurrency(1234.50, 'THB', 'th-TH'); // "฿1,234.50"
formatCurrency(1234.50, 'USD', 'en-US'); // "$1,234.50"

// Unit conversion
formatWeight(100, 'kg', userPreference); // "100 kg" or "220.46 lb"
formatTemperature(25, 'C', userPreference); // "25°C" or "77°F"
```

**Required Skills**:
```
25-internationalization/currency-timezone
02-frontend/react-best-practices
55-ux-writing/microcopy
```

**Acceptance Criteria**:
- Numbers formatted per locale
- Weights support kg/lb
- Temperatures support °C/°F
- User preference saved

---

### 14.5 Translation Management

**Description**: Set up translation workflow

**Tasks**:
- [x] Set up translation management system (Crowdin/Phrase)
- [x] Create translation workflow
- [x] Implement translation CI/CD
- [x] Set up translator access
- [x] Add missing translation detection
- [x] Version translation files

**Translation Workflow**:
```yaml
workflow:
  1. developer:
     - Add new key with EN text
     - Create PR

  2. ci_pipeline:
     - Extract new keys
     - Push to translation platform
     - Check for missing translations

  3. translator:
     - Translate new keys
     - Mark as reviewed

  4. sync:
     - Pull translations back
     - Create PR with new translations

  5. release:
     - Include translations in build
```

**Required Skills**:
```
25-internationalization/localization
15-devops-infrastructure/ci-cd-github-actions
27-team-collaboration/knowledge-sharing
```

**Acceptance Criteria**:
- Translation platform configured
- CI detects missing translations
- Workflow documented
- Translators onboarded

---

### 14.6 Regional Compliance

**Description**: Ensure regional compliance for data display

**Tasks**:
- [x] Thai language support (ภาษาไทย)
- [x] Thai date format (Buddhist calendar option)
- [x] Vietnamese language support
- [x] Indonesian language support
- [x] Chinese (Simplified) support
- [x] Regional number formats

**Thai-specific Requirements**:
```typescript
// Thai Buddhist calendar
const thaiYear = gregorianYear + 543;
formatDate('2025-01-26', 'th-TH-u-ca-buddhist');
// "26 มกราคม 2568"

// Thai number formatting
formatNumber(1234567.89, 'th-TH');
// "1,234,567.89" (same as EN, but with Thai readability)

// Thai address format
formatAddress({
  street: "123 ถนนสุขุมวิท",
  district: "คลองเตย",
  province: "กรุงเทพฯ",
  postalCode: "10110"
});
```

**Required Skills**:
```
25-internationalization/localization
22-ux-ui-design/thai-ux-patterns
12-compliance-governance/gdpr-compliance
12-compliance-governance/pdpa-compliance
```

**Acceptance Criteria**:
- 5 languages supported
- Buddhist calendar option
- Regional formats correct
- Compliance verified

---

## Language Support Matrix

| Language | Code | Status | Priority |
|----------|------|--------|----------|
| English | en | Target | P0 |
| Thai | th | Target | P0 |
| Vietnamese | vi | Target | P1 |
| Indonesian | id | Target | P1 |
| Chinese (Simplified) | zh-CN | Target | P2 |

---

## Dependencies

- Dashboard UI must be stable
- Notification service ready
- AI service for translated insights

## Timeline Estimate

- **14.1 Frontend i18n**: 2-3 sprints
- **14.2 Backend i18n**: 2 sprints
- **14.3 Timezone**: 2 sprints
- **14.4 Formatting**: 1-2 sprints
- **14.5 Translation Mgmt**: 1-2 sprints
- **14.6 Regional**: 2-3 sprints

**Total**: 10-14 sprints

---

## Evidence Requirements

- [x] Language switcher demo
- [x] Translation coverage report
- [x] Timezone conversion tests
- [x] Formatting examples
- [x] Regional compliance checklist
