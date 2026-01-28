# Runbook: [INCIDENT_NAME]

**Severity**: [P1/P2/P3/P4]
**Service**: [SERVICE_NAME]
**Owner**: [TEAM_NAME]

## 1. Symptoms
- What alerts triggered?
- What are users experiencing?
- Dashboards to check: [LINK]

## 2. Impact Assessment
- **Users affected**: [ALL/PARTIAL]
- **Data risk**: [LOSS/CORRUPTION/NONE]

## 3. Diagnosis Steps
1. Check logs: `kubectl logs -l app=[SERVICE_NAME]`
2. Check metrics: `[GRAFANA_LINK]`
3. ...

## 4. Mitigation Steps
### Immediate Fix (Workaround)
1. Restart service: `docker-compose restart [SERVICE_NAME]`
2. Rollback deployment: `...`

### Long-term Resolution
- [ ] Investigate root cause
- [ ] Apply patch
- [ ] Update regression tests

## 5. Verification
- How to confirm the system is stable?

## 6. Escalation Policy
- If not resolved in 1 hour, escalate to: [CONTACT]
