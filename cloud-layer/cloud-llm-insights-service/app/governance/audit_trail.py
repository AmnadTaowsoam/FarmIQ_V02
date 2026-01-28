"""AI governance and compliance framework with audit trail, explainability, and human override."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class AuditEventType(str, Enum):
    """Types of audit events."""
    INSIGHT_GENERATED = "insight_generated"
    INSIGHT_REVIEWED = "insight_reviewed"
    INSIGHT_APPROVED = "insight_approved"
    INSIGHT_REJECTED = "insight_rejected"
    INSIGHT_OVERRIDDEN = "insight_overridden"
    HUMAN_OVERRIDE_TRIGGERED = "human_override_triggered"
    BIAS_DETECTED = "bias_detected"
    MODEL_VERSION_CHANGED = "model_version_changed"
    PROMPT_VERSION_CHANGED = "prompt_version_changed"
    GUARDRAIL_VIOLATION = "guardrail_violation"
    COST_BUDGET_EXCEEDED = "cost_budget_exceeded"


class OverrideStatus(str, Enum):
    """Status of human override."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"


@dataclass
class AuditEvent:
    """An audit event in the AI system."""
    event_id: str
    event_type: AuditEventType
    timestamp: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    tenant_id: str | None = None
    user_id: str | None = None
    insight_id: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    prompt_version: str | None = None
    details: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExplainabilityRecord:
    """Record explaining an AI decision."""
    insight_id: str
    explanation: str
    confidence_factors: dict[str, float]
    data_sources: list[str]
    reasoning_steps: list[str]
    limitations: list[str]
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


@dataclass
class HumanOverrideRequest:
    """A human override request."""
    request_id: str
    insight_id: str
    original_insight: dict[str, Any]
    override_reason: str
    requested_by: str
    requested_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    status: OverrideStatus = OverrideStatus.PENDING
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_comments: str | None = None
    modified_insight: dict[str, Any] | None = None


@dataclass
class BiasDetectionResult:
    """Result of bias detection."""
    insight_id: str
    bias_type: str
    severity: str
    detected_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    affected_groups: list[str] = field(default_factory=list)
    description: str = ""
    mitigation_suggestions: list[str] = field(default_factory=list)


@dataclass
class RiskAssessment:
    """AI risk assessment."""
    assessment_id: str
    insight_id: str
    risk_level: str  # low, medium, high, critical
    risk_factors: list[dict[str, Any]]
    mitigation_actions: list[str]
    assessed_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    assessed_by: str = "system"


class AuditTrail:
    """Audit trail for AI operations."""

    def __init__(self):
        self._events: list[AuditEvent] = []
        self._explainability_records: dict[str, ExplainabilityRecord] = {}
        self._override_requests: dict[str, HumanOverrideRequest] = {}
        self._bias_detections: list[BiasDetectionResult] = []
        self._risk_assessments: dict[str, RiskAssessment] = {}

    def log_event(
        self,
        event_type: AuditEventType,
        tenant_id: str | None = None,
        user_id: str | None = None,
        insight_id: str | None = None,
        model_provider: str | None = None,
        model_name: str | None = None,
        prompt_version: str | None = None,
        details: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AuditEvent:
        """Log an audit event."""
        import uuid

        event = AuditEvent(
            event_id=f"audit-{uuid.uuid4().hex[:12]}",
            event_type=event_type,
            tenant_id=tenant_id,
            user_id=user_id,
            insight_id=insight_id,
            model_provider=model_provider,
            model_name=model_name,
            prompt_version=prompt_version,
            details=details or {},
            metadata=metadata or {},
        )

        self._events.append(event)

        logger.info(
            f"Audit event logged: {event_type.value}",
            extra={
                "event_id": event.event_id,
                "event_type": event_type.value,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "insight_id": insight_id,
            },
        )

        return event

    def get_events(
        self,
        event_type: AuditEventType | None = None,
        tenant_id: str | None = None,
        insight_id: str | None = None,
        limit: int = 100,
    ) -> list[AuditEvent]:
        """Get audit events, optionally filtered."""
        events = self._events

        if event_type:
            events = [e for e in events if e.event_type == event_type]
        if tenant_id:
            events = [e for e in events if e.tenant_id == tenant_id]
        if insight_id:
            events = [e for e in events if e.insight_id == insight_id]

        # Return most recent events first
        return sorted(events, key=lambda e: e.timestamp, reverse=True)[:limit]

    def add_explainability_record(
        self,
        insight_id: str,
        explanation: str,
        confidence_factors: dict[str, float],
        data_sources: list[str],
        reasoning_steps: list[str],
        limitations: list[str],
    ) -> ExplainabilityRecord:
        """Add an explainability record."""
        record = ExplainabilityRecord(
            insight_id=insight_id,
            explanation=explanation,
            confidence_factors=confidence_factors,
            data_sources=data_sources,
            reasoning_steps=reasoning_steps,
            limitations=limitations,
        )

        self._explainability_records[insight_id] = record

        logger.info(
            f"Explainability record added for insight: {insight_id}",
            extra={"insight_id": insight_id},
        )

        return record

    def get_explainability_record(
        self, insight_id: str
    ) -> Optional[ExplainabilityRecord]:
        """Get explainability record for an insight."""
        return self._explainability_records.get(insight_id)

    def create_override_request(
        self,
        insight_id: str,
        original_insight: dict[str, Any],
        override_reason: str,
        requested_by: str,
    ) -> HumanOverrideRequest:
        """Create a human override request."""
        import uuid

        request = HumanOverrideRequest(
            request_id=f"override-{uuid.uuid4().hex[:12]}",
            insight_id=insight_id,
            original_insight=original_insight,
            override_reason=override_reason,
            requested_by=requested_by,
        )

        self._override_requests[request.request_id] = request

        # Log audit event
        self.log_event(
            event_type=AuditEventType.HUMAN_OVERRIDE_TRIGGERED,
            insight_id=insight_id,
            details={
                "override_request_id": request.request_id,
                "override_reason": override_reason,
                "requested_by": requested_by,
            },
        )

        logger.info(
            f"Human override request created: {request.request_id}",
            extra={
                "request_id": request.request_id,
                "insight_id": insight_id,
                "requested_by": requested_by,
            },
        )

        return request

    def review_override_request(
        self,
        request_id: str,
        status: OverrideStatus,
        reviewed_by: str,
        review_comments: str | None = None,
        modified_insight: dict[str, Any] | None = None,
    ) -> Optional[HumanOverrideRequest]:
        """Review a human override request."""
        if request_id not in self._override_requests:
            return None

        request = self._override_requests[request_id]
        request.status = status
        request.reviewed_by = reviewed_by
        request.reviewed_at = datetime.now(tz=timezone.utc)
        request.review_comments = review_comments
        request.modified_insight = modified_insight

        # Log audit event
        event_type = (
            AuditEventType.INSIGHT_APPROVED
            if status == OverrideStatus.APPROVED
            else AuditEventType.INSIGHT_REJECTED
        )

        self.log_event(
            event_type=event_type,
            insight_id=request.insight_id,
            user_id=reviewed_by,
            details={
                "override_request_id": request_id,
                "status": status.value,
                "review_comments": review_comments,
            },
        )

        logger.info(
            f"Human override request reviewed: {request_id} -> {status.value}",
            extra={
                "request_id": request_id,
                "status": status.value,
                "reviewed_by": reviewed_by,
            },
        )

        return request

    def get_override_requests(
        self,
        status: OverrideStatus | None = None,
        insight_id: str | None = None,
    ) -> list[HumanOverrideRequest]:
        """Get override requests, optionally filtered."""
        requests = list(self._override_requests.values())

        if status:
            requests = [r for r in requests if r.status == status]
        if insight_id:
            requests = [r for r in requests if r.insight_id == insight_id]

        return sorted(requests, key=lambda r: r.requested_at, reverse=True)

    def detect_bias(
        self,
        insight_id: str,
        insight_text: str,
        protected_groups: list[str],
    ) -> BiasDetectionResult:
        """Detect potential bias in an insight."""
        import uuid

        # Simple bias detection based on keyword matching
        bias_keywords = {
            "gender": ["he", "she", "man", "woman", "male", "female"],
            "age": ["young", "old", "elderly", "youth"],
            "race": ["race", "ethnicity", "nationality"],
        }

        detected_biases = []
        for bias_type, keywords in bias_keywords.items():
            for keyword in keywords:
                if keyword.lower() in insight_text.lower():
                    detected_biases.append(bias_type)
                    break

        if detected_biases:
            result = BiasDetectionResult(
                assessment_id=f"bias-{uuid.uuid4().hex[:12]}",
                insight_id=insight_id,
                bias_type=", ".join(detected_biases),
                severity="medium",
                affected_groups=protected_groups,
                description=f"Potential {', '.join(detected_biases)} bias detected in insight",
                mitigation_suggestions=[
                    "Review insight for stereotypical language",
                    "Ensure fair treatment of all groups",
                    "Consider alternative phrasing",
                    "Add human review for sensitive insights",
                ],
            )

            self._bias_detections.append(result)

            # Log audit event
            self.log_event(
                event_type=AuditEventType.BIAS_DETECTED,
                insight_id=insight_id,
                details={
                    "bias_type": result.bias_type,
                    "severity": result.severity,
                },
            )

            logger.warning(
                f"Bias detected for insight: {insight_id}",
                extra={"insight_id": insight_id, "bias_type": result.bias_type},
            )

            return result

        return BiasDetectionResult(
            assessment_id=f"bias-{uuid.uuid4().hex[:12]}",
            insight_id=insight_id,
            bias_type="none",
            severity="none",
            affected_groups=[],
            description="No bias detected",
            mitigation_suggestions=[],
        )

    def assess_risk(
        self,
        insight_id: str,
        insight: dict[str, Any],
        confidence: float,
    ) -> RiskAssessment:
        """Assess risk level for an insight."""
        import uuid

        risk_factors = []
        risk_level = "low"

        # Check confidence
        if confidence < 0.5:
            risk_factors.append(
                {
                    "factor": "low_confidence",
                    "value": confidence,
                    "description": "Insight has low confidence",
                    "severity": "medium",
                }
            )
            risk_level = "medium"

        # Check for anomalies
        if insight.get("notificationHint", {}).get("severity") == "critical":
            risk_factors.append(
                {
                    "factor": "critical_anomaly",
                    "value": "critical",
                    "description": "Insight relates to critical anomaly",
                    "severity": "high",
                }
            )
            risk_level = "high"

        # Check for recommended actions
        actions = insight.get("recommendedActions", [])
        if len(actions) == 0:
            risk_factors.append(
                {
                    "factor": "no_actions",
                    "value": 0,
                    "description": "No recommended actions provided",
                    "severity": "low",
                }
            )

        # Determine mitigation actions
        mitigation_actions = []
        if risk_level in ["medium", "high", "critical"]:
            mitigation_actions.append("Require human review before action")
            mitigation_actions.append("Add additional monitoring")
        if risk_level in ["high", "critical"]:
            mitigation_actions.append("Escalate to domain expert")
            mitigation_actions.append("Document decision process")

        assessment = RiskAssessment(
            assessment_id=f"risk-{uuid.uuid4().hex[:12]}",
            insight_id=insight_id,
            risk_level=risk_level,
            risk_factors=risk_factors,
            mitigation_actions=mitigation_actions,
        )

        self._risk_assessments[assessment.assessment_id] = assessment

        logger.info(
            f"Risk assessment completed for insight: {insight_id} -> {risk_level}",
            extra={"insight_id": insight_id, "risk_level": risk_level},
        )

        return assessment

    def generate_audit_report(
        self,
        tenant_id: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> dict[str, Any]:
        """Generate an audit report."""
        # Filter events
        events = self._events
        if tenant_id:
            events = [e for e in events if e.tenant_id == tenant_id]
        if start_time:
            events = [e for e in events if e.timestamp >= start_time]
        if end_time:
            events = [e for e in events if e.timestamp <= end_time]

        # Group by event type
        by_type: dict[str, int] = {}
        for event in events:
            event_type = event.event_type.value
            by_type[event_type] = by_type.get(event_type, 0) + 1

        # Get bias detections
        bias_count = len(self._bias_detections)

        # Get override requests
        overrides = self.get_override_requests()
        pending_overrides = [o for o in overrides if o.status == OverrideStatus.PENDING]

        return {
            "report_generated_at": datetime.now(tz=timezone.utc).isoformat(),
            "filters": {
                "tenant_id": tenant_id,
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None,
            },
            "summary": {
                "total_events": len(events),
                "events_by_type": by_type,
                "bias_detections": bias_count,
                "override_requests": len(overrides),
                "pending_overrides": len(pending_overrides),
            },
            "recent_events": [
                {
                    "event_id": e.event_id,
                    "event_type": e.event_type.value,
                    "timestamp": e.timestamp.isoformat(),
                    "tenant_id": e.tenant_id,
                    "insight_id": e.insight_id,
                }
                for e in events[:20]
            ],
            "pending_overrides": [
                {
                    "request_id": o.request_id,
                    "insight_id": o.insight_id,
                    "requested_by": o.requested_by,
                    "requested_at": o.requested_at.isoformat(),
                    "override_reason": o.override_reason,
                }
                for o in pending_overrides[:10]
            ],
        }

    def export_audit_trail(self, filepath: str) -> None:
        """Export audit trail to file."""
        report = self.generate_audit_report()

        with open(filepath, "w") as f:
            json.dump(report, f, indent=2)

        logger.info(f"Audit trail exported to {filepath}")


# Global audit trail instance
_audit_trail: AuditTrail | None = None


def get_audit_trail() -> AuditTrail:
    """Get or create the global audit trail."""
    global _audit_trail
    if _audit_trail is None:
        _audit_trail = AuditTrail()
    return _audit_trail
