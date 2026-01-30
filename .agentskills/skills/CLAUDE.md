# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚡ Fast Skill Loading (IMPORTANT)

**DO NOT read `SKILL_INDEX.md` directly - it's 3000+ lines!**

### Skill Lookup Order:
1. **First:** Read `SKILL_ROUTER.md` (~100 lines) - decision tree & keyword matching
2. **Find:** Identify the specific skill you need
3. **Then:** Read only that skill's `SKILL.md`

### When to Read Full SKILL.md:
- ✅ User asks for implementation code
- ✅ Need specific configuration examples
- ✅ Troubleshooting or debugging
- ✅ Writing production code

### When SKILL_ROUTER.md is Enough:
- ✅ Deciding which technology to use
- ✅ Quick concept explanation
- ✅ Comparing options
- ✅ Answering "what should I use for X?"

---

## Repository Purpose

This is a collection of Claude Code skills documentation organized by technical domain. Each skill provides reference material, code patterns, and best practices for specific technologies or patterns.

## Repository Structure

Skills are organized in numbered directories by domain:

```
00-meta-skills/       - Architecture, decisions, system thinking
01-foundations/       - API design, code review, git, standards
02-frontend/          - React, Next.js, state, UI libraries
03-backend-api/       - Express, FastAPI, NestJS, tRPC
04-database/          - Prisma, MongoDB, Redis, Supabase, vectors
05-ai-ml-core/        - Training, preprocessing, YOLO, PyTorch
06-ai-ml-production/  - LLM, RAG, LangChain, agents, guardrails
07-document-processing/ - OCR, PDF, image processing
08-messaging-queue/   - Kafka, RabbitMQ, Redis, MQTT
09-microservices/     - Saga, CQRS, Temporal, service mesh
10-authentication/    - JWT, OAuth2, RBAC, SSO
11-billing/           - Stripe, subscriptions, usage metering
12-compliance/        - GDPR, PDPA, audit logging
13-file-storage/      - S3, CDN, uploads, optimization
14-monitoring/        - OpenTelemetry, Prometheus, Grafana
15-devops/            - Docker, K8s, Terraform, GitHub Actions
16-testing/           - Vitest, Jest, Playwright, Pytest
17-domain-specific/   - Multi-tenancy, feature flags
53-data-engineering/  - Dagster, CDC, Medallion, Data Mesh
77-mlops/             - MLflow, feature stores, model serving
90-thai-integrations/ - PromptPay, LINE, Thai banks, Lazada
```

## Skill File Format

Each `SKILL.md` contains:
- Overview and purpose
- Core concepts with code examples
- Quick start guide
- Production checklist
- Anti-patterns to avoid
- Integration points

## Working with This Repository

When adding or modifying skills:
1. Place in appropriate numbered directory
2. Use kebab-case subdirectory name
3. Include `SKILL.md` following established format
4. Update `SKILL_ROUTER.md` if adding new skill
5. Skills may contain bilingual content (English/Thai)
