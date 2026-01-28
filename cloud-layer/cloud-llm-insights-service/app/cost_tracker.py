"""Enhanced LLM cost tracking with per-tenant attribution and budget management."""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class TenantCostRecord:
    """Cost record for a tenant."""
    tenant_id: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float
    timestamp: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    insight_id: Optional[str] = None


@dataclass
class TenantBudget:
    """Budget configuration for a tenant."""
    tenant_id: str
    monthly_budget_usd: float
    alert_threshold_percent: float = 80.0
    hard_limit_enabled: bool = False
    custom_pricing: dict[str, dict[str, dict[str, float]]] = field(default_factory=dict)


@dataclass
class CostAlert:
    """Cost alert."""
    alert_id: str
    tenant_id: str
    alert_type: str
    message: str
    current_cost_usd: float
    budget_usd: float
    threshold_percent: float
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


class EnhancedCostTracker:
    """Enhanced cost tracker with per-tenant attribution."""

    # Pricing per 1K tokens (example prices)
    PRICING = {
        "openai": {
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-4-turbo-preview": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        },
        "anthropic": {
            "claude-3-opus": {"input": 0.015, "output": 0.075},
            "claude-3-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
        },
    }

    def __init__(self, default_monthly_budget_usd: float = 100.0):
        self._default_monthly_budget_usd = default_monthly_budget_usd
        self._tenant_budgets: dict[str, TenantBudget] = {}
        self._tenant_costs: dict[str, list[TenantCostRecord]] = defaultdict(list)
        self._alerts: list[CostAlert] = []
        self._global_monthly_usage_usd = 0.0
        self._global_total_tokens = 0
        self._global_total_requests = 0

    def set_tenant_budget(self, budget: TenantBudget) -> None:
        """Set budget for a tenant."""
        self._tenant_budgets[budget.tenant_id] = budget
        logger.info(
            f"Set budget for tenant {budget.tenant_id}: ${budget.monthly_budget_usd:.2f}",
            extra={"tenant_id": budget.tenant_id, "budget_usd": budget.monthly_budget_usd},
        )

    def get_tenant_budget(self, tenant_id: str) -> TenantBudget:
        """Get budget for a tenant, using default if not set."""
        if tenant_id not in self._tenant_budgets:
            return TenantBudget(
                tenant_id=tenant_id,
                monthly_budget_usd=self._default_monthly_budget_usd,
            )
        return self._tenant_budgets[tenant_id]

    def calculate_cost(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        tenant_id: Optional[str] = None,
    ) -> float:
        """Calculate cost for usage."""
        budget = self.get_tenant_budget(tenant_id) if tenant_id else None

        # Check for custom pricing
        if budget and provider in budget.custom_pricing:
            if model in budget.custom_pricing[provider]:
                pricing = budget.custom_pricing[provider][model]
            else:
                pricing = {"input": 0.01, "output": 0.03}
        else:
            provider_pricing = self.PRICING.get(provider.lower(), {})
            pricing = provider_pricing.get(model, {"input": 0.01, "output": 0.03})

        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]

        return input_cost + output_cost

    def track_usage(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        tenant_id: str,
        insight_id: Optional[str] = None,
        db: Any = None,
    ) -> TenantCostRecord:
        """Track LLM usage and cost with tenant attribution."""
        cost = self.calculate_cost(provider, model, input_tokens, output_tokens, tenant_id)

        # Update global stats
        self._global_monthly_usage_usd += cost
        self._global_total_tokens += input_tokens + output_tokens
        self._global_total_requests += 1

        # Create tenant record
        record = TenantCostRecord(
            tenant_id=tenant_id,
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_usd=cost,
            insight_id=insight_id,
        )

        # Store tenant cost
        self._tenant_costs[tenant_id].append(record)

        # Check budget and create alerts
        self._check_budget_alerts(tenant_id)

        logger.info(
            "LLM usage tracked",
            extra={
                "provider": provider,
                "model": model,
                "tenant_id": tenant_id,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost,
                "global_monthly_usage_usd": self._global_monthly_usage_usd,
            },
        )

        return record

    def _check_budget_alerts(self, tenant_id: str) -> None:
        """Check if budget alerts should be triggered."""
        budget = self.get_tenant_budget(tenant_id)
        current_cost = self.get_tenant_monthly_cost(tenant_id)

        threshold_cost = budget.monthly_budget_usd * (budget.alert_threshold_percent / 100)

        # Check if threshold exceeded
        if current_cost >= threshold_cost:
            # Check if alert already created for this tenant
            existing_alert = any(
                a.tenant_id == tenant_id and a.alert_type == "threshold_exceeded"
                for a in self._alerts[-10:]  # Check recent alerts
            )

            if not existing_alert:
                alert = CostAlert(
                    alert_id=f"alert-{tenant_id}-{int(datetime.now().timestamp())}",
                    tenant_id=tenant_id,
                    alert_type="threshold_exceeded",
                    message=f"Cost threshold exceeded: ${current_cost:.2f} / ${budget.monthly_budget_usd:.2f}",
                    current_cost_usd=current_cost,
                    budget_usd=budget.monthly_budget_usd,
                    threshold_percent=budget.alert_threshold_percent,
                )
                self._alerts.append(alert)
                logger.warning(
                    f"Cost alert for tenant {tenant_id}",
                    extra={
                        "tenant_id": tenant_id,
                        "current_cost_usd": current_cost,
                        "budget_usd": budget.monthly_budget_usd,
                        "threshold_percent": budget.alert_threshold_percent,
                    },
                )

    def get_tenant_monthly_cost(
        self, tenant_id: str, month: Optional[datetime] = None
    ) -> float:
        """Get monthly cost for a tenant."""
        if month is None:
            month = datetime.now(tz=timezone.utc)

        month_start = month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

        tenant_records = self._tenant_costs.get(tenant_id, [])
        return sum(
            r.cost_usd
            for r in tenant_records
            if month_start <= r.timestamp <= month_end
        )

    def get_tenant_usage_summary(
        self, tenant_id: str, month: Optional[datetime] = None
    ) -> dict[str, Any]:
        """Get usage summary for a tenant."""
        if month is None:
            month = datetime.now(tz=timezone.utc)

        month_start = month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

        tenant_records = self._tenant_costs.get(tenant_id, [])
        month_records = [
            r for r in tenant_records if month_start <= r.timestamp <= month_end
        ]

        budget = self.get_tenant_budget(tenant_id)
        total_cost = sum(r.cost_usd for r in month_records)
        total_tokens = sum(r.total_tokens for r in month_records)
        total_requests = len(month_records)

        # Group by provider/model
        by_model: dict[str, dict[str, Any]] = {}
        for record in month_records:
            key = f"{record.provider}:{record.model}"
            if key not in by_model:
                by_model[key] = {
                    "provider": record.provider,
                    "model": record.model,
                    "requests": 0,
                    "tokens": 0,
                    "cost_usd": 0.0,
                }
            by_model[key]["requests"] += 1
            by_model[key]["tokens"] += record.total_tokens
            by_model[key]["cost_usd"] += record.cost_usd

        return {
            "tenant_id": tenant_id,
            "month": month.strftime("%Y-%m"),
            "budget_usd": budget.monthly_budget_usd,
            "current_cost_usd": total_cost,
            "budget_remaining_usd": max(0, budget.monthly_budget_usd - total_cost),
            "budget_exceeded": total_cost >= budget.monthly_budget_usd,
            "threshold_exceeded": (
                total_cost >= budget.monthly_budget_usd * (budget.alert_threshold_percent / 100)
            ),
            "total_tokens": total_tokens,
            "total_requests": total_requests,
            "average_cost_per_request": total_cost / total_requests if total_requests > 0 else 0,
            "average_tokens_per_request": total_tokens / total_requests if total_requests > 0 else 0,
            "by_model": list(by_model.values()),
        }

    def get_global_usage_summary(self) -> dict[str, Any]:
        """Get global usage summary."""
        return {
            "monthly_budget_usd": self._default_monthly_budget_usd,
            "monthly_usage_usd": self._global_monthly_usage_usd,
            "budget_remaining_usd": max(
                0, self._default_monthly_budget_usd - self._global_monthly_usage_usd
            ),
            "budget_exceeded": self._global_monthly_usage_usd >= self._default_monthly_budget_usd,
            "total_tokens": self._global_total_tokens,
            "total_requests": self._global_total_requests,
            "average_cost_per_request": (
                self._global_monthly_usage_usd / self._global_total_requests
                if self._global_total_requests > 0
                else 0
            ),
            "active_tenants": len(self._tenant_costs),
            "total_alerts": len(self._alerts),
        }

    def get_all_tenants_summary(self) -> list[dict[str, Any]]:
        """Get summary for all tenants."""
        return [
            self.get_tenant_usage_summary(tenant_id)
            for tenant_id in self._tenant_costs.keys()
        ]

    def get_alerts(self, tenant_id: Optional[str] = None) -> list[CostAlert]:
        """Get cost alerts, optionally filtered by tenant."""
        if tenant_id:
            return [a for a in self._alerts if a.tenant_id == tenant_id]
        return self._alerts.copy()

    def reset_monthly_usage(self) -> None:
        """Reset monthly usage (call at start of new month)."""
        self._global_monthly_usage_usd = 0.0
        self._global_total_tokens = 0
        self._global_total_requests = 0
        self._tenant_costs.clear()
        logger.info("Monthly cost tracking reset")

    def optimize_prompt_efficiency(
        self,
        tenant_id: str,
        current_tokens: int,
        target_tokens: int,
    ) -> dict[str, Any]:
        """Analyze and suggest prompt efficiency optimizations."""
        reduction_percent = (current_tokens - target_tokens) / current_tokens * 100
        current_cost = self.calculate_cost("openai", "gpt-4", current_tokens, current_tokens)
        target_cost = self.calculate_cost("openai", "gpt-4", target_tokens, target_tokens)
        savings = current_cost - target_cost

        return {
            "tenant_id": tenant_id,
            "current_tokens": current_tokens,
            "target_tokens": target_tokens,
            "reduction_percent": reduction_percent,
            "current_cost_usd": current_cost,
            "target_cost_usd": target_cost,
            "savings_usd": savings,
            "suggestions": [
                "Remove redundant context from prompts",
                "Use more concise system messages",
                "Implement context window management",
                "Cache frequently used prompts",
                "Use prompt compression techniques",
            ],
        }


# Global cost tracker instance
_cost_tracker: EnhancedCostTracker | None = None


def get_cost_tracker(monthly_budget_usd: float = 100.0) -> EnhancedCostTracker:
    """Get or create the global cost tracker."""
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = EnhancedCostTracker(monthly_budget_usd=monthly_budget_usd)
    return _cost_tracker
