# Approved Project Templates

> **เอกสาร Boilerplate Templates ที่ได้รับการอนุมัติจาก GT&D**  
> Version: 1.0 | Last Updated: December 2024

---

## 📋 สารบัญ (Table of Contents)

1. [Overview](#1-overview)
2. [Backend Node.js Template](#2-backend-nodejs-template)
3. [Backend Python Template](#3-backend-python-template)
4. [Frontend React Template](#4-frontend-react-template)
5. [Common Standards Across Templates](#5-common-standards-across-templates)
6. [Quick Start Guide](#6-quick-start-guide)

---

## 1. Overview

### 1.1 Available Templates

| Template | Location | Stack |
|:---------|:---------|:------|
| **Backend Node.js** | `Backend_nodejs-Template/` | Node.js 24, TypeScript, Express, Prisma |
| **Backend Python** | `Backend_python-Template/` | Python 3.11, FastAPI, Uvicorn |
| **Frontend React** | `Frontend-Template/` | React 18, TypeScript, Vite, Redux |

### 1.2 Template Features Matrix

| Feature | Node.js Backend | Python Backend | React Frontend |
|:--------|:---------------:|:--------------:|:--------------:|
| TypeScript | ✅ | ❌ | ✅ |
| Docker Multi-stage | ✅ | ✅ | ✅ |
| Health Check | ✅ | ✅ | ✅ |
| Security Headers | ✅ (Helmet) | ❌ | ✅ (Nginx) |
| JSON Logging | ✅ (Winston) | ✅ (Custom) | ✅ (Datadog RUM) |
| Datadog Integration | ✅ | ✅ | ✅ |
| OpenAPI/Swagger | ✅ | ✅ (FastAPI) | ❌ |
| Unit Testing | ✅ (Jest) | ✅ | ✅ (Vitest) |
| E2E Testing | ❌ | ❌ | ✅ (WebdriverIO) |
| Linting | ✅ (ESLint) | ❌ | ✅ (ESLint) |
| Unused Code Detection | ✅ (Knip) | ❌ | ✅ (Knip) |
| Database ORM | ✅ (Prisma) | ✅ (SQLAlchemy/httpx) | ❌ |
| i18n Support | ❌ | ❌ | ✅ (react-i18next) |
| Redux State | ❌ | ❌ | ✅ |
| Kubernetes Ready | ✅ | ✅ | ✅ |
| Azure Pipeline | ✅ | ✅ | ✅ |
| Graceful Shutdown | ✅ | ✅ | ❌ |
| Request Validation | ✅ (Zod) | ✅ (Pydantic) | ❌ |
| Git Commit ID Header | ✅ | ❌ | ✅ |
| Load Testing | ✅ (K6) | ❌ | ❌ |

---

## 2. Backend Node.js Template

### 2.1 Technology Stack

| Category | Technology | Version |
|:---------|:-----------|:--------|
| **Runtime** | Node.js | 24 LTS |
| **Language** | TypeScript | 5.4+ |
| **Framework** | Express | 4.21+ |
| **ORM** | Prisma | 5.16+ |
| **Validation** | Zod | 3.21+ |
| **Logging** | Winston | 3.10+ |
| **Security** | Helmet | 7.0+ |
| **Testing** | Jest | 29.7+ |
| **Monitoring** | dd-trace (Datadog) | 4.46+ |

### 2.2 Project Structure

```
Backend_nodejs-Template/
├── src/
│   ├── controllers/       # Request handlers
│   ├── middlewares/       # Express middlewares
│   ├── routes/            # Route definitions
│   ├── services/          # Business logic
│   ├── utils/             # Utilities (logger, swagger, datadog)
│   └── index.ts           # Application entry point
├── tests/
│   ├── controllers/       # Controller tests
│   ├── services/          # Service tests
│   └── utils/             # Utility tests
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── pipelines/             # Azure DevOps pipelines
├── scripts/               # Utility scripts (load test)
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Local development compose
├── openapi.yaml           # API specification
├── knip.json              # Unused code detection config
├── jest.config.js         # Test configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

### 2.3 Available Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run serve` | Start production server |
| `npm run test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Check linting errors |
| `npm run lint:fix` | Fix linting errors |
| `npm run knip` | Find unused code |
| `npm run migrate:up` | Run database migrations |
| `npm run prisma:generate` | Generate Prisma client |

### 2.4 Security Features

```typescript
// Security headers via Helmet (src/index.ts)
app.use(helmet())

// Headers set automatically:
// x-content-type-options: nosniff
// x-frame-options: SAMEORIGIN
// x-xss-protection: 1; mode=block
// strict-transport-security: max-age=31536000; includeSubDomains; preload
// referrer-policy: no-referrer-when-downgrade
// content-security-policy: upgrade-insecure-requests; block-all-mixed-content
```

### 2.5 Logging Configuration

```typescript
// JSON format logging (src/utils/logger.ts)
import * as winston from 'winston'

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
})
```

### 2.6 Graceful Shutdown

```typescript
// Graceful shutdown (src/index.ts)
const gracefulShutdown = async (): Promise<void> => {
  logger.info('Received shutdown signal. Graceful shutdown start')
  
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
  
  await prisma.$disconnect()
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
```

---

## 3. Backend Python Template

### 3.1 Technology Stack

| Category | Technology | Version |
|:---------|:-----------|:--------|
| **Runtime** | Python | 3.11 |
| **Framework** | FastAPI | 0.115+ |
| **ASGI Server** | Uvicorn | 0.34+ |
| **Validation** | Pydantic | 2.5+ |
| **HTTP Client** | httpx | 0.27+ |

### 3.2 Project Structure

```
Backend_python-Template/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints.py    # API endpoints
│   ├── models/                 # Data models
│   ├── services/               # Business logic
│   ├── utils/                  # Utilities
│   ├── config.py               # Configuration
│   ├── logging_config.py       # JSON logging
│   └── main.py                 # Application entry
├── config/                     # Configuration files
├── pipelines/                  # Azure DevOps pipelines
├── Dockerfile                  # Docker build
├── requirements.txt            # Python dependencies
├── env.example                 # Environment template
└── README.md
```

### 3.3 Available Commands

| Command | Description |
|:--------|:------------|
| `pip install -r requirements.txt` | Install dependencies |
| `python -m uvicorn app.main:app --reload` | Start dev server |
| `python -m pytest` | Run tests |

### 3.4 JSON Logging Configuration

```python
# app/logging_config.py
import json
import logging
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        return json.dumps(log_record, default=str)
```

### 3.5 Configuration Pattern

```python
# app/config.py
class Config:
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    PORT: int = int(os.getenv("PORT", "6403"))
    
    # Service URLs
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:6400")
    
    # Feature flags
    ENABLE_GPU: bool = os.getenv("ENABLE_GPU", "false").lower() == "true"
```

---

## 4. Frontend React Template

### 4.1 Technology Stack

| Category | Technology | Version |
|:---------|:-----------|:--------|
| **Library** | React | 18.2+ |
| **Language** | TypeScript | 5.5+ |
| **Build Tool** | Vite | 5.4+ |
| **State** | Redux Toolkit | 1.9+ |
| **UI Library** | MUI (Material-UI) | 6.1+ |
| **i18n** | react-i18next | 15.0+ |
| **Styling** | SCSS Modules | - |
| **Testing** | Vitest | 2.1+ |
| **E2E Testing** | WebdriverIO | 6.0+ |
| **Icons** | Font Awesome | 6.5+ |
| **Monitoring** | Datadog RUM | 4.47+ |

### 4.2 Project Structure

```
Frontend-Template/
├── src/
│   ├── components/         # Reusable components
│   │   └── example/        # Example components
│   ├── pages/              # Page components
│   ├── redux/              # Redux store and slices
│   │   ├── slices/         # Redux slices
│   │   ├── store.tsx       # Store configuration
│   │   └── hooks.tsx       # Typed hooks
│   ├── i18n/               # Internationalization
│   │   └── Translation/    # Translation files
│   ├── styles/             # Global styles
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilities
│   ├── assets/             # Static assets
│   ├── monitoring.ts       # Datadog RUM setup
│   ├── App.tsx             # App component
│   └── index.tsx           # Entry point
├── e2e/                    # E2E tests (WebdriverIO)
├── public/
│   ├── config.js           # Runtime configuration
│   └── manifest.json       # PWA manifest
├── env/                    # Environment files
├── pipelines/              # Azure DevOps pipelines
├── Dockerfile              # Multi-stage Docker build
├── nginx.conf              # Nginx configuration
├── vite.config.ts          # Vite configuration
├── vitest.config.ts        # Test configuration
├── eslint.config.js        # ESLint configuration
├── knip.json               # Unused code detection
└── package.json            # Dependencies and scripts
```

### 4.3 Available Scripts

| Command | Description |
|:--------|:------------|
| `npm run start:dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run lint` | Check linting errors |
| `npm run lint:fix` | Fix linting errors |
| `npm run knip` | Find unused code |
| `npm run wdio` | Run E2E tests |
| `npm run docker:build` | Build Docker image |
| `npm run docker:run` | Run Docker container |

### 4.4 Security Headers (Nginx)

```nginx
# nginx.conf
add_header Content-Security-Policy "frame-ancestors 'self'; 
    script-src 'self' [ADD_URLS]; 
    font-src 'self' [ADD_URLS]; 
    img-src 'self' [ADD_URLS]; 
    style-src 'self' 'unsafe-inline' [ADD_URLS]";
add_header Set-Cookie "Path=/; SameSite=Strict; HttpOnly; Secure";
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
```

### 4.5 Runtime Environment Variables

```javascript
// public/config.js
window.APP_ENV = "dev"

// types/index.d.ts
declare global {
    interface Window {
        APP_ENV?: string
    }
}
```

### 4.6 Datadog RUM Integration

```typescript
// src/monitoring.ts
import { datadogRum } from "@datadog/browser-rum";

export const datadogMonitoring = (): void => {
    if (window.location.hostname === "localhost") return;
    
    datadogRum.init({
        applicationId: "YOUR_APP_ID",
        clientToken: "YOUR_CLIENT_TOKEN",
        site: "datadoghq.com",
        service: "your-service-name",
        env: window.APP_ENV,
        version: import.meta.env.VITE_COMMIT_ID,
        sessionSampleRate: 100,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
    });
};
```

### 4.7 i18n Configuration

```typescript
// src/i18n/i18n.tsx
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './Translation/English/translation.json';
import thTranslation from './Translation/Thai/translation.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    th: { translation: thTranslation },
  },
  lng: 'th',
  fallbackLng: 'en',
});
```

---

## 5. Common Standards Across Templates

### 5.1 Docker Best Practices

| Practice | Implementation |
|:---------|:---------------|
| **Multi-stage Build** | Separate build and production stages |
| **Non-root User** | Create and use dedicated user |
| **Health Check** | HEALTHCHECK instruction in Dockerfile |
| **Layer Caching** | Copy package files before source |
| **Security** | Remove unnecessary packages |

```dockerfile
# Common pattern
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS production
RUN adduser -D -u 1001 appuser
COPY --from=build /app/dist ./dist
USER appuser
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

### 5.2 Logging Standards

All templates follow JSON structured logging:

```json
{
  "timestamp": "2024-12-10T10:30:00.000Z",
  "level": "INFO",
  "logger": "app",
  "message": "Server started",
  "extra": {
    "port": 3000,
    "transactionId": "abc-123"
  }
}
```

### 5.3 Health Check Endpoints

| Template | Endpoint | Response |
|:---------|:---------|:---------|
| Node.js | `/api/health` | `OK` (200) |
| Python | `/health` | `{"status": "healthy"}` (200) |
| Frontend | `/` (nginx) | HTML (200) |

### 5.4 Azure Pipeline Stages

All templates include pipelines for:
- `dev` - Development environment
- `qa` - Quality Assurance
- `uat` - User Acceptance Testing
- `prod` - Production

### 5.5 Branch Policies

1. Create branches: `qa`, `uat`, `production`
2. Set merge type: **Rebase and fast-forward only**
3. Require PR review before merge

---

## 6. Quick Start Guide

### 6.1 Using Node.js Backend Template

```bash
# 1. Copy template
cp -r Backend_nodejs-Template/Backend_nodejs-Template ./my-backend

# 2. Rename project
cd my-backend
# Edit package.json: change "app-name" to your project name

# 3. Install dependencies
npm install

# 4. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 5. Setup database
npm run prisma:generate
npm run migrate:up

# 6. Start development
npm run dev
```

### 6.2 Using Python Backend Template

```bash
# 1. Copy template
cp -r Backend_python-Template ./my-python-backend

# 2. Setup virtual environment
cd my-python-backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment
cp env.example .env
# Edit .env with your configuration

# 5. Start development
python -m uvicorn app.main:app --reload --port 6403
```

### 6.3 Using Frontend Template

```bash
# 1. Copy template
cp -r Frontend-Template/Frontend-Template ./my-frontend

# 2. Rename project
cd my-frontend
# Edit package.json: change "react-boiler-plate" to your project name

# 3. Install dependencies
npm install

# 4. Setup environment
# Edit env/.dev.env with your configuration
# Edit public/config.js for runtime variables

# 5. Start development
npm run start:dev
```

### 6.4 Customization Checklist

| Step | Node.js | Python | Frontend |
|:-----|:-------:|:------:|:--------:|
| Update package/requirements name | ✅ | ✅ | ✅ |
| Update Kubernetes manifests | ✅ | ✅ | ✅ |
| Update Dockerfile ports | ✅ | ✅ | ✅ |
| Update Datadog service name | ✅ | ✅ | ✅ |
| Update CSP headers | ✅ | ❌ | ✅ |
| Update database schema | ✅ | ✅ | ❌ |
| Update API endpoints | ✅ | ✅ | ❌ |
| Update translations | ❌ | ❌ | ✅ |
| Update theme/styles | ❌ | ❌ | ✅ |

---

## 📎 Appendix

### A. Port Conventions

| Service Type | Default Port |
|:-------------|:-------------|
| Node.js Backend | 3000 |
| Python Backend | 6403 |
| Frontend (Dev) | 3000 |
| Frontend (Nginx) | 8080 |

### B. Environment Variables Template

```bash
# Common
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# External Services
API_BASE_URL=http://localhost:3000
DATADOG_API_KEY=xxx

# Feature Flags
ENABLE_FEATURE_X=true
```

### C. Code Quality Commands Summary

| Template | Lint | Test | Coverage | Unused Code |
|:---------|:-----|:-----|:---------|:------------|
| Node.js | `npm run lint` | `npm run test` | `npm run test:coverage` | `npm run knip` |
| Python | - | `pytest` | `pytest --cov` | - |
| Frontend | `npm run lint` | `npm run test` | - | `npm run knip` |

---

*เอกสารนี้อธิบาย Boilerplate Templates ที่ได้รับการอนุมัติ ปรับปรุงครั้งล่าสุด: December 2024*

