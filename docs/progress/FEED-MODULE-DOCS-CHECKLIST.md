# Feed Module Docs Checklist

## Documents Created/Updated
- `../cloud-layer/feed-module-overview.md`
- `../edge-layer/edge-feed-intake.md`
- `../cloud-layer/cloud-feed-service.md`
- `../cloud-layer/cloud-barn-records-service.md`
- `../cloud-layer/kpi-engine-fcr-adg-sgr.md`
- `../contracts/feed-service.contract.md`
- `../contracts/barn-records-service.contract.md`
- `../contracts/events-feed-and-barn.contract.md`
- `../dev/frontend-feeding-module.md`
- `../progress/FEED-MODULE-DOCS-CHECKLIST.md`

## Mermaid Diagrams Inventory
| doc | diagram type | count |
|---|---|---|
| cloud-layer/feed-module-overview.md | architecture flowchart + data pipeline flowchart | 2 |
| edge-layer/edge-feed-intake.md | sequence (edge->cloud ingestion) | 1 |
| cloud-layer/cloud-feed-service.md | ER diagram | 1 |
| cloud-layer/cloud-barn-records-service.md | flowchart (FE entry -> API -> DB -> KPI) | 1 |
| cloud-layer/kpi-engine-fcr-adg-sgr.md | sequence (KPI computation) | 1 |

Total Mermaid diagrams: 6

## Endpoints Count Inventory
| contract doc | endpoint rows |
|---|---:|
| contracts/feed-service.contract.md | 14 |
| contracts/barn-records-service.contract.md | 13 |

Total endpoint rows: 27

## DB Tables Inventory
| doc | tables |
|---|---|
| edge-layer/edge-feed-intake.md | feed_intake_local, feed_intake_dedupe, sync_outbox |
| cloud-layer/cloud-feed-service.md | feed_formula, feed_lot, feed_delivery, feed_quality_result, feed_intake_record, feed_program, feed_inventory_snapshot |
| cloud-layer/cloud-barn-records-service.md | barn_morbidity_event, barn_mortality_event, barn_cull_event, barn_vaccine_event, barn_treatment_event, barn_daily_count, barn_welfare_check, barn_housing_condition, barn_genetic_profile |
| cloud-layer/kpi-engine-fcr-adg-sgr.md | kpi_daily, kpi_realtime, kpi_compute_state |

Total DB column rows: 275

## Examples Inventory
| contract doc | example sets | idempotent examples | error examples |
|---|---:|---:|---:|
| contracts/feed-service.contract.md | 12 | 5 | 3 |
| contracts/barn-records-service.contract.md | 10 | 3 | 2 |
| contracts/events-feed-and-barn.contract.md | 4 | 0 | 2 |

Total example sets: 26
Total idempotent examples: 8
Total error examples: 7

## Status
- Done: all required docs created with sections, tables, and diagrams
- TODO: align any future schema changes with Prisma migrations
- Blocked: none

## Next Steps for Implementation
1) Generate OpenAPI specs from service schemas and align with contract tables.
2) Implement Idempotency-Key handling in POST endpoints.
3) Add KPI daily rollup scheduler and backfill jobs.

## Checklist Counter
- Mermaid: 6/6
- Endpoints Table Rows: 27/27
- DB Column Rows: 275/275
- Examples: 26/26
- Open Questions: 0/0
