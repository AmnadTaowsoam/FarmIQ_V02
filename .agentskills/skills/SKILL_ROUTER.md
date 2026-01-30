# Skill Router - Fast Lookup (~100 lines)

> **For Agents:** Read THIS file first. Only read full skill if needed.

## Quick Decision Tree

```
Need to build...
├── API/Backend
│   ├── REST → fastapi-patterns, express-rest, nestjs-patterns
│   ├── GraphQL → graphql-best-practices
│   ├── tRPC → trpc-patterns
│   └── Real-time → websocket-patterns, server-sent-events
│
├── Frontend
│   ├── React → react-best-practices, nextjs-patterns
│   ├── State → state-management, state-machines-xstate
│   ├── Forms → form-handling, multi-step-forms
│   └── UI → shadcn-ui, tailwind-patterns, mui-material
│
├── Database
│   ├── SQL → prisma-guide, database-migrations
│   ├── NoSQL → mongodb-patterns
│   ├── Cache → redis-caching, cache-invalidation
│   ├── Vector → vector-database, supabase-patterns
│   └── Time-series → timescaledb
│
├── AI/LLM
│   ├── Integration → llm-integration, langchain-patterns
│   ├── RAG → rag-implementation, vector-search
│   ├── Agents → agent-patterns, agentic-ai-frameworks
│   ├── Prompts → prompt-engineering
│   └── Local → llm-local-deployment
│
├── Data Pipeline
│   ├── Orchestration → dagster-patterns, dbt-patterns
│   ├── Streaming → kafka-streaming, change-data-capture
│   ├── Architecture → medallion-architecture, data-mesh-architecture
│   └── Quality → data-quality-checks, data-contracts
│
├── Auth
│   ├── JWT → jwt-authentication
│   ├── OAuth → oauth2-implementation
│   ├── SSO → sso-saml-oidc
│   └── RBAC → rbac-patterns, enterprise-rbac-models
│
├── Testing
│   ├── Unit → vitest-patterns, jest-patterns, pytest-patterns
│   ├── E2E → e2e-playwright
│   ├── API → contract-testing-pact
│   └── Load → load-testing
│
├── DevOps
│   ├── CI/CD → ci-cd-github-actions, gitops-argocd
│   ├── Containers → docker-patterns, kubernetes-deployment
│   ├── IaC → terraform-infrastructure
│   └── Monitoring → opentelemetry-patterns, grafana-dashboards
│
├── Thai Market 🇹🇭
│   ├── Payment → promptpay-integration, thai-bank-apis
│   ├── E-commerce → lazada-shopee-integration
│   ├── Messaging → line-liff-patterns, thai-sms-providers
│   └── Compliance → pdpa-compliance
│
└── Microservices
    ├── Patterns → saga-pattern, cqrs-pattern, event-sourcing
    ├── Resilience → circuit-breaker, bulkhead-patterns
    ├── Workflow → temporal-workflow
    └── Communication → grpc-integration, event-driven
```

## Keyword Quick Match

| Keywords | Go to Skill |
|----------|-------------|
| supabase, firebase alternative, realtime db | `supabase-patterns` |
| langchain, llm chain, rag, agents | `langchain-patterns` |
| line, liff, thai messaging | `line-liff-patterns` |
| promptpay, qr payment, thai payment | `promptpay-integration` |
| dagster, data pipeline, orchestration | `dagster-patterns` |
| vitest, unit test, react testing | `vitest-patterns` |
| nestjs, node framework, di | `nestjs-patterns` |
| trpc, type-safe api, end-to-end types | `trpc-patterns` |
| otel, opentelemetry, tracing, observability | `opentelemetry-patterns` |
| temporal, durable workflow, saga | `temporal-workflow` |
| cdc, debezium, change data capture | `change-data-capture` |
| medallion, bronze silver gold, lakehouse | `medallion-architecture` |
| data mesh, domain ownership, data product | `data-mesh-architecture` |
| mlflow, experiment tracking, model registry | `mlflow-patterns` |
| lazada, shopee, marketplace | `lazada-shopee-integration` |
| sms, otp, thaibulksms | `thai-sms-providers` |
| scb, kbank, bank api | `thai-bank-apis` |

## Category Paths

| Category | Path |
|----------|------|
| Meta/Architecture | `00-meta-skills/` |
| Foundations | `01-foundations/` |
| Frontend | `02-frontend/` |
| Backend | `03-backend-api/` |
| Database | `04-database/` |
| AI Core | `05-ai-ml-core/` |
| AI Production | `06-ai-ml-production/` |
| Document Processing | `07-document-processing/` |
| Messaging | `08-messaging-queue/` |
| Microservices | `09-microservices/` |
| Auth | `10-authentication-authorization/` |
| Billing | `11-billing-subscription/` |
| Compliance | `12-compliance-governance/` |
| Storage | `13-file-storage/` |
| Observability | `14-monitoring-observability/` |
| DevOps | `15-devops-infrastructure/` |
| Testing | `16-testing/` |
| Domain Specific | `17-domain-specific/` |
| Data Engineering | `53-data-engineering/` |
| MLOps | `77-mlops-data-engineering/` |
| Thai Integrations | `90-thai-integrations/` |

---

## Full Skill Catalog (566 skills)

### 00-meta-skills
`architectural-reviews` `decision-records` `problem-framing` `risk-assessment` `system-thinking` `technical-debt-management`

### 01-foundations
`api-design` `code-review` `git-workflow` `python-standards` `refactoring-strategies` `typescript-standards`

### 02-frontend
`animation` `error-boundaries-react` `form-handling` `infinite-scroll` `mui-material` `multi-step-forms` `nextjs-patterns` `react-best-practices` `shadcn-ui` `state-machines-xstate` `state-management` `tailwind-patterns`

### 03-backend-api
`error-handling` `express-rest` `fastapi-patterns` `fastify-rest-api` `graphql-best-practices` `grpc-integration` `middleware` `nestjs-patterns` `nodejs-api` `trpc-patterns` `validation` `websocket-patterns`

### 04-database
`cache-invalidation` `connection-pooling` `database-locking` `database-migrations` `database-optimization` `database-transactions` `mongodb-patterns` `prisma-guide` `redis-caching` `supabase-patterns` `timescaledb` `vector-database`

### 05-ai-ml-core
`data-augmentation` `data-preprocessing` `label-studio-setup` `model-optimization` `model-training` `model-versioning` `pytorch-deployment` `yolo-integration`

### 06-ai-ml-production
`agent-patterns` `ai-observability` `embedding-models` `langchain-patterns` `llm-function-calling` `llm-guardrails` `llm-integration` `llm-local-deployment` `prompt-engineering` `rag-implementation` `vector-search` `vector-search-patterns`

### 07-document-processing
`document-ingestion-pipeline` `document-parsing` `image-preprocessing` `ocr-paddleocr` `ocr-tesseract` `pdf-processing` `rag-architecture-patterns` `rag-chunking-metadata-strategy` `rag-citations-grounding`

### 08-messaging-queue
`kafka-streams` `mqtt-integration` `queue-monitoring` `rabbitmq-patterns` `redis-queue`

### 09-microservices
`api-gateway` `circuit-breaker` `cqrs-pattern` `escrow-workflow` `event-driven` `event-sourcing` `saga-pattern` `service-design` `service-discovery` `service-mesh` `temporal-workflow`

### 10-authentication-authorization
`api-key-management` `jwt-authentication` `oauth2-implementation` `rbac-patterns` `session-management`

### 11-billing-subscription
`billing-cycles` `invoice-generation` `stripe-integration` `subscription-plans` `usage-metering` `webhook-handling`

### 12-compliance-governance
`audit-logging` `consent-management` `data-privacy` `data-retention` `gdpr-compliance` `pdpa-compliance`

### 13-file-storage
`cdn-integration` `file-compression` `file-upload-handling` `image-optimization` `multipart-upload` `s3-integration`

### 14-monitoring-observability
`distributed-tracing` `elk-stack` `error-tracking` `grafana-dashboards` `opentelemetry-patterns` `performance-monitoring` `prometheus-metrics`

### 15-devops-infrastructure
`ci-cd-github-actions` `docker-compose` `docker-patterns` `gitops-argocd` `helm-charts` `kubernetes-deployment` `load-balancing` `multi-cloud-patterns` `service-orchestration` `terraform-infrastructure`

### 16-testing
`contract-testing-pact` `e2e-playwright` `event-driven-testing` `integration-testing` `jest-patterns` `load-testing` `ml-model-testing` `pytest-patterns` `test-data-factory` `test-driven-development-agentic` `vitest-patterns`

### 17-domain-specific
`analytics-tracking` `api-versioning` `api-versioning-strategies` `feature-flags` `multi-tenancy` `multi-tenancy-advanced` `notification-system` `qr-code-features` `rate-limiting` `thai-cultural-events`

### 18-project-management
`agile-scrum` `estimation-techniques` `project-planning` `requirement-analysis` `risk-management` `technical-specifications` `user-stories`

### 19-seo-optimization
`core-web-vitals` `meta-tags` `nextjs-seo` `page-speed` `sitemap-robots` `structured-data` `technical-seo`

### 20-ai-integration
`ai-agents` `ai-search` `chatbot-integration` `conversational-ui` `line-platform-integration` `llm-txt-protocol`

### 21-documentation
`api-documentation` `changelog-management` `code-commentary-standards` `runbooks` `system-architecture-docs` `technical-writing` `user-guides`

### 22-ux-ui-design
`accessibility` `design-handoff` `design-systems` `responsive-design` `thai-ux-patterns` `user-research` `wireframing`

### 23-business-analytics
`ab-testing-analysis` `business-intelligence` `cohort-analysis` `conversion-optimization` `dashboard-design` `data-visualization` `funnel-analysis` `kpi-metrics` `sql-for-analytics`

### 24-security-practices
`incident-response` `owasp-top-10` `penetration-testing` `secrets-management` `secure-coding` `security-audit` `vulnerability-management`

### 25-internationalization
`currency-timezone` `i18n-setup` `localization` `multi-language` `rtl-support`

### 26-deployment-strategies
`blue-green-deployment` `canary-deployment` `feature-toggles` `rollback-strategies` `rolling-deployment`

### 27-team-collaboration
`code-review-culture` `knowledge-sharing` `onboarding` `pair-programming` `remote-work`

### 28-marketing-integration
`ab-testing` `campaign-management` `email-marketing` `marketing-automation` `social-media-integration` `utm-tracking`

### 29-customer-support
`customer-feedback` `helpdesk-integration` `knowledge-base` `live-chat` `support-analytics` `ticketing-system`

### 30-ecommerce
`discount-promotions` `inventory-management` `order-fulfillment` `order-management` `payment-gateways` `product-catalog` `shipping-integration` `shopping-cart`

### 31-mobile-development
`app-distribution` `deep-linking` `flutter-patterns` `mobile-ci-cd` `offline-mode` `push-notifications` `react-native-patterns`

### 32-crm-integration
`contact-management` `custom-crm` `hubspot-integration` `lead-management` `salesforce-integration` `sales-pipeline`

### 33-content-management
`contentful-integration` `content-versioning` `headless-cms` `media-library` `strapi-integration` `wordpress-api`

### 34-real-time-features
`collaborative-editing` `live-notifications` `presence-detection` `real-time-dashboard` `server-sent-events`

### 35-blockchain-web3
`blockchain-authentication` `cryptocurrency-payment` `nft-integration` `smart-contracts` `wallet-connection` `web3-integration`

### 36-iot-integration
`device-management` `edge-computing` `iot-protocols` `iot-security` `real-time-monitoring` `sensor-data-processing`

### 37-video-streaming
`adaptive-bitrate` `cdn-delivery` `live-streaming` `video-analytics` `video-transcoding` `video-upload-processing`

### 38-gaming-features
`achievements` `game-analytics` `in-game-purchases` `leaderboards` `matchmaking` `real-time-multiplayer`

### 39-data-science-ml
`ab-testing-ml` `automl` `data-pipeline` `feature-engineering` `ml-serving` `model-experiments`

### 40-system-resilience
`bulkhead-patterns` `chaos-engineering` `disaster-recovery` `failure-modes` `graceful-degradation` `idempotency-and-dedup` `postmortem-analysis` `retry-timeout-strategies`

### 41-incident-management
`communication-templates` `escalation-and-ownership` `escalation-paths` `incident-retrospective` `incident-severity-levels` `incident-triage` `oncall-playbooks` `runbook-templates` `severity-levels` `stakeholder-communication` `triage-workflow`

### 42-cost-engineering
`autoscaling-and-rightsizing` `budget-guardrails` `cloud-cost-models` `cost-guardrails` `cost-modeling` `cost-observability` `infra-sizing` `llm-cost-optimization` `llm-token-optimization` `pricing-and-usage-meters` `storage-egress-optimization`

### 43-data-reliability
`database-health-monitoring` `data-contracts` `data-incident-response` `data-lineage` `data-quality-checks` `data-quality-monitoring` `data-quality-rules` `data-retention-archiving` `data-validation-rules` `freshness-latency` `freshness-latency-slos` `lineage-and-provenance` `schema-drift` `schema-drift-handling` `schema-management`

### 44-ai-governance
`ai-data-privacy` `ai-ethics-compliance` `ai-risk-assessment` `auditability` `confidence-scoring` `explainability` `human-approval-flows` `model-bias-fairness` `model-explainability` `model-registry` `model-risk-management` `override-mechanisms`

### 45-developer-experience
`code-review-standards` `commit-conventions` `debugging-tools` `dev-environment-setup` `env-diagnosis` `hot-reload-fast-feedback` `lint-format-typecheck` `local-dev-standard` `onboarding-docs` `release-workflow` `repo-automation-scripts`

### 46-data-classification
`access-audit-and-reviews` `logging-redaction` `pii-detection` `retention-and-deletion`

### 47-performance-engineering
`caching-strategies` `concurrency-and-throughput` `db-query-optimization` `profiling-node-python` `sla-slo-slis`

### 48-product-discovery
`experiment-design` `hypothesis-writing` `mvp-scope-control` `user-interviews` `validation-metrics`

### 49-portfolio-management
`cross-team-interfaces` `delivery-governance` `dependency-mapping` `roadmap-planning`

### 50-enterprise-integrations
`enterprise-rbac-models` `scim-provisioning` `security-questionnaires` `sso-saml-oidc` `vendor-onboarding`

### 51-contracts-governance
`backward-compat-rules` `contract-testing` `deprecation-notices` `event-schema-registry` `openapi-governance`

### 52-ai-evaluation
`ground-truth-management` `llm-judge-patterns` `offline-vs-online-eval` `rag-evaluation` `regression-benchmarks`

### 53-data-engineering
`change-data-capture` `dagster-patterns` `data-mesh-architecture` `dbt-patterns` `elt-modeling` `kafka-streaming` `lakehouse-patterns` `medallion-architecture`

### 54-agentops
`audit-trails-for-agents` `prompt-versioning` `rollout-and-kill-switch` `sandboxing` `tool-creation-patterns` `tool-permission-model`

### 55-ux-writing
`error-messages` `microcopy` `onboarding-flows` `trust-pages-structure`

### 56-requirements-intake
`acceptance-criteria` `constraints-and-assumptions` `discovery-questions` `requirement-to-scope` `risk-and-dependencies`

### 57-skill-orchestration
`autonomous-gap-detector` `baseline-policy` `output-templates` `routing-rules` `scoring-and-prioritization` `skill-improvement-loop`

### 58-investment-estimation
`discovery-for-estimation` `effort-sizing` `payback-analysis` `pricing-strategy` `proposal-pack` `roi-modeling` `sensitivity-analysis`

### 59-architecture-decision
`adr-templates` `architecture-review` `deprecation-policy` `migration-planning` `system-boundaries` `tech-stack-selection` `tradeoff-analysis` `versioning-strategy`

### 59-release-engineering
`feature-flags-experimentation` `legacy-migration-playbook` `release-management`

### 60-github-mcp
`github-code-review` `github-issue-triage` `github-pr-lifecycle` `github-release-management` `github-repo-governance` `github-repo-navigation` `github-security-triage` `github-workflow-ops`

### 61-ai-production
`llm-security-redteaming` `model-serving-inference` `prompting-patterns` `retrieval-quality`

### 62-scale-operations
`data-migrations-backfill` `kubernetes-platform` `multi-tenancy-saas`

### 63-professional-services
`proposal-sow-delivery` `runbooks-ops`

### 64-meta-standards
`api-style-guide` `config-env-conventions` `error-shape-taxonomy` `event-style-guide` `logging-metrics-tracing-standard` `security-baseline-controls` `service-standards-blueprint`

### 65-context-token-optimization
`anti-bloat-checklist` `context-pack-format` `prompt-library-minimal` `retrieval-playbook-for-ai` `summarization-rules-evidence-first`

### 66-repo-navigation-knowledge-map
`change-impact-map` `codebase-learning` `docs-indexing-strategy` `naming-and-folder-conventions` `repo-map-ssot` `where-to-find-what`

### 67-codegen-scaffolding-automation
`bruno-smoke-test-generator` `ci-pipeline-generator` `db-migration-generator` `endpoint-generator` `event-contract-generator` `service-scaffold-generator`

### 68-quality-gates-ci-policies
`contract-test-gates` `definition-of-done` `lint-test-typecheck-policy` `performance-regression-gates` `release-checklist-gate` `security-scan-policy`

### 69-platform-engineering-lite
`config-distribution` `deployment-patterns` `env-matrix-dev-stg-prod` `observability-packaging` `tenant-aware-ops`

### 70-data-platform-governance
`backfill-and-reconciliation-playbook` `pii-policy-enforcement` `retention-archival`

### 71-infrastructure-patterns
`api-design-contracts` `secrets-key-management` `thai-payment-integration`

### 72-metacognitive-skill-architect
`agent-self-correction` `skill-architect` `skill-discovery-and-chaining` `task-decomposition-strategy`

### 73-iot-fleet-management
`atomic-ab-partitioning` `differential-ota-updates` `fleet-campaign-management`

### 74-iot-zero-trust-security
`hardware-rooted-identity` `micro-segmentation-policy` `mtls-pki-management`

### 75-edge-computing
`edge-cloud-sync` `lightweight-kubernetes`

### 76-iot-infrastructure
`advanced-iac-iot` `chaos-engineering-iot` `disaster-recovery-iot` `gitops-iot-infrastructure` `multi-cloud-iot`

### 77-mlops-data-engineering
`drift-detection-retraining` `feature-store-implementation` `mlflow-patterns` `model-registry-versioning`

### 78-inference-model-serving
`high-performance-inference` `model-optimization-quantization` `serverless-inference`

### 79-edge-ai-tinyml
`edge-ai-development-workflow` `edge-model-compression` `hybrid-inference-architecture` `on-device-model-training` `tinyml-microcontroller-ai`

### 80-agentic-ai-advanced-learning
`agentic-ai-frameworks`

### 81-saas-finops-pricing
`cloud-unit-economics` `hybrid-pricing-strategy` `usage-based-pricing`

### 82-technical-product-management
`api-first-product-strategy` `business-to-technical-spec` `competitive-intelligence` `cross-functional-leadership` `feature-prioritization` `platform-product-design` `product-analytics-implementation` `product-discovery-validation` `product-roadmap-communication` `technical-debt-prioritization`

### 83-go-to-market-tech
`analyst-relations` `customer-success-automation` `demand-generation-automation` `developer-relations-community` `enterprise-sales-alignment` `go-to-market-analytics` `launch-strategy-execution` `partner-program-design` `revenue-operations-revops` `sales-engineering` `sales-operations-automation` `technical-content-marketing`

### 85-future-compliance
`ai-audit-trail` `algorithmic-accountability` `cross-border-data-transfer`

### 86-sustainable-ai
`green-computing-finops`

### 87-multi-agent-governance
`multi-agent-orchestration`

### 88-ai-supply-chain-security
`model-bom-security`

### 89-post-quantum-cryptography
`pqc-for-iot`

### 90-thai-integrations 🇹🇭
`lazada-shopee-integration` `line-liff-patterns` `promptpay-integration` `thai-bank-apis` `thai-sms-providers`

---

**Usage:** `{category}/{skill-name}/SKILL.md` → e.g. `04-database/prisma-guide/SKILL.md`
