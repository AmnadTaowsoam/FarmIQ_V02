Purpose: Product/engineering roadmap for FarmIQ (phased plan + exit criteria).  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-27  

---

# Roadmap

This roadmap is grounded in the current repo implementation (services, contracts, docker-compose) and captures the intended next phases.

## Phase 1 — Current (Insights Orchestration + Notifications)

**Goal**: Deliver “insights generation” with safe orchestration and in-app notifications, without exposing internal services to `dashboard-web`.

**Deliverables (current repo)**
- `cloud-analytics-service` orchestrator endpoint:
  - `POST /api/v1/analytics/insights/generate` (`cloud-layer/cloud-analytics-service/app/insights_routes.py`)
- `cloud-llm-insights-service` endpoints:
  - `POST /api/v1/llm-insights/analyze`
  - `GET /api/v1/llm-insights/history`
  - `GET /api/v1/llm-insights/{insightId}`
  - (`cloud-layer/cloud-llm-insights-service/app/routes.py`)
- In-app notifications (service + BFF proxy + FE UI):
  - Notification service: `/api/v1/notifications/{send,inbox,history}`
  - BFF proxy: `/api/v1/notifications/{send,inbox,history}` (and dashboard aliases)
  - Dashboard-web bell + `/notifications` page

**Non-goals**
- RAG/vector search, citations/grounding
- WebSockets/push notifications
- Closed-loop automation (actuation)

**Risks**
- Contract mismatch between FE and BFF notification list shape
- Insights deep-link target not implemented in FE yet
- BFF insights proxy routes not implemented yet (BFF-only principle gap)

**Exit criteria (measurable)**
- Reliability: P95 insight generate latency ≤ 3s with mock provider; error rate ≤ 1% (5xx) in dev/demo runs
- Notification dedupe: repeated generation with same `(tenant,farm,barn,window,mode)` does not spam (idempotency key / externalRef)
- Observability: requestId/traceId present end-to-end in logs for insight and notification calls

**Demo script (operator)**
1) Open dashboard-web, select a tenant/farm/barn context.
2) Trigger insight generation (current: direct to analytics; target: via BFF in Phase 1 completion).
3) Confirm notification bell increments and a new inbox item appears.
4) Click the notification and navigate to the “insight view” (current: pending route; see Phase 1 TODOs).

## Phase 2 — Grounded AI (RAG + Vector)

**Goal**: Ground LLM outputs in curated knowledge and provide references/citations.

**Deliverables**
- Vector store + embeddings pipeline (no in-memory cache for sessions)
- Prompt templates + versioning
- Evidence-backed citations in `references[]` and UI display of citations

**Non-goals**
- Automation/actuation

**Exit criteria**
- Citation coverage: ≥ 80% of insights include at least 1 citation
- Hallucination budget: < 5% of sampled insights contain ungrounded claims (manual review rubric)
- Cost guardrails: per-insight cost budget documented and monitored (provider tokens/usage)

## Phase 3 — Closed-loop Recommendations (Safety-gated)

**Goal**: Action recommendations become operational playbooks (still human-approved).

**Deliverables**
- Safety gates + RBAC for “recommended action” review/approval
- Audit logs for “recommendation shown → acknowledged → action taken”
- Best-effort notifications for action urgency

**Exit criteria**
- Adoption: ≥ 30% of daily active ops users open the insight drawer weekly
- Safety: 0 incidents of unauthorized action execution; all actions are human-approved

## Phase 4 — Profit Optimization / Prescriptive Analytics

**Goal**: Move from “what happened” to “what to do for profit” using costs + benchmarks.

**Deliverables**
- Cost model integration (feed cost, mortality, energy, labor)
- Prescriptive analytics dashboards and scenario planning

**Exit criteria**
- Demonstrated impact in pilot: measurable improvement in target KPIs (FCR, mortality, weight uniformity) with documented baselines
- Cost guardrails: monthly inference spend bounded and visible

