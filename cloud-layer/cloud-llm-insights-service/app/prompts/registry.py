"""Prompt registry service for versioning and A/B testing."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class PromptStatus(str, Enum):
    """Prompt status."""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"


class PromptType(str, Enum):
    """Prompt types."""
    TELEMETRY_ANALYSIS = "telemetry_analysis"
    ANOMALY_EXPLANATION = "anomaly_explanation"
    ACTION_RECOMMENDATION = "action_recommendation"


@dataclass
class PromptVersion:
    """Prompt version metadata."""
    version: str
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    created_by: str = "system"
    description: str = ""
    variables: list[str] = field(default_factory=list)
    template: str = ""
    status: PromptStatus = PromptStatus.DRAFT
    is_default: bool = False
    ab_test_group: Optional[str] = None  # For A/B testing
    performance_metrics: dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptRegistry:
    """Registry for managing prompt versions."""

    def __init__(self):
        self._prompts: dict[str, dict[str, PromptVersion]] = {}
        # Structure: {prompt_type: {version: PromptVersion}}

    def register_prompt(
        self,
        prompt_type: PromptType,
        version: str,
        template: str,
        variables: list[str],
        description: str = "",
        status: PromptStatus = PromptStatus.DRAFT,
        is_default: bool = False,
        ab_test_group: Optional[str] = None,
        created_by: str = "system",
    ) -> PromptVersion:
        """Register a new prompt version."""
        if prompt_type.value not in self._prompts:
            self._prompts[prompt_type.value] = {}

        prompt_version = PromptVersion(
            version=version,
            template=template,
            variables=variables,
            description=description,
            status=status,
            is_default=is_default,
            ab_test_group=ab_test_group,
            created_by=created_by,
        )

        self._prompts[prompt_type.value][version] = prompt_version
        logger.info(
            f"Registered prompt: {prompt_type.value}:{version}",
            extra={
                "prompt_type": prompt_type.value,
                "version": version,
                "status": status.value,
                "is_default": is_default,
            },
        )

        return prompt_version

    def get_prompt(
        self, prompt_type: PromptType, version: str | None = None
    ) -> Optional[PromptVersion]:
        """Get a specific prompt version."""
        if prompt_type.value not in self._prompts:
            return None

        if version:
            return self._prompts[prompt_type.value].get(version)

        # Return default version
        for prompt_ver in self._prompts[prompt_type.value].values():
            if prompt_ver.is_default and prompt_ver.status == PromptStatus.ACTIVE:
                return prompt_ver

        # Return latest active version
        active_versions = [
            (v, p)
            for v, p in self._prompts[prompt_type.value].items()
            if p.status == PromptStatus.ACTIVE
        ]
        if active_versions:
            return sorted(active_versions, key=lambda x: x[0])[-1][1]

        return None

    def list_versions(self, prompt_type: PromptType) -> list[PromptVersion]:
        """List all versions of a prompt type."""
        if prompt_type.value not in self._prompts:
            return []
        return list(self._prompts[prompt_type.value].values())

    def update_status(
        self, prompt_type: PromptType, version: str, status: PromptStatus
    ) -> bool:
        """Update prompt status."""
        if prompt_type.value not in self._prompts:
            return False

        if version not in self._prompts[prompt_type.value]:
            return False

        self._prompts[prompt_type.value][version].status = status
        logger.info(
            f"Updated prompt status: {prompt_type.value}:{version} -> {status.value}",
            extra={"prompt_type": prompt_type.value, "version": version, "status": status.value},
        )
        return True

    def set_default(self, prompt_type: PromptType, version: str) -> bool:
        """Set a version as default for a prompt type."""
        if prompt_type.value not in self._prompts:
            return False

        if version not in self._prompts[prompt_type.value]:
            return False

        # Unset previous default
        for prompt_ver in self._prompts[prompt_type.value].values():
            prompt_ver.is_default = False

        # Set new default
        self._prompts[prompt_type.value][version].is_default = True
        logger.info(
            f"Set default prompt: {prompt_type.value}:{version}",
            extra={"prompt_type": prompt_type.value, "version": version},
        )
        return True

    def assign_ab_test_group(
        self, prompt_type: PromptType, version: str, group: str
    ) -> bool:
        """Assign a version to an A/B test group."""
        if prompt_type.value not in self._prompts:
            return False

        if version not in self._prompts[prompt_type.value]:
            return False

        self._prompts[prompt_type.value][version].ab_test_group = group
        logger.info(
            f"Assigned A/B test group: {prompt_type.value}:{version} -> {group}",
            extra={"prompt_type": prompt_type.value, "version": version, "group": group},
        )
        return True

    def get_ab_test_variants(
        self, prompt_type: PromptType, group: str
    ) -> list[PromptVersion]:
        """Get all variants for an A/B test group."""
        if prompt_type.value not in self._prompts:
            return []

        return [
            p
            for p in self._prompts[prompt_type.value].values()
            if p.ab_test_group == group and p.status == PromptStatus.ACTIVE
        ]

    def track_performance(
        self,
        prompt_type: PromptType,
        version: str,
        metric_name: str,
        value: float,
    ) -> bool:
        """Track performance metric for a prompt version."""
        if prompt_type.value not in self._prompts:
            return False

        if version not in self._prompts[prompt_type.value]:
            return False

        metrics = self._prompts[prompt_type.value][version].performance_metrics
        if metric_name not in metrics:
            metrics[metric_name] = {"count": 0, "sum": 0.0, "values": []}

        metrics[metric_name]["count"] += 1
        metrics[metric_name]["sum"] += value
        metrics[metric_name]["values"].append(value)
        # Keep only last 1000 values
        if len(metrics[metric_name]["values"]) > 1000:
            metrics[metric_name]["values"].pop(0)

        return True

    def get_performance_metrics(
        self, prompt_type: PromptType, version: str
    ) -> dict[str, Any]:
        """Get performance metrics for a prompt version."""
        if prompt_type.value not in self._prompts:
            return {}

        if version not in self._prompts[prompt_type.value]:
            return {}

        metrics = {}
        for metric_name, data in self._prompts[prompt_type.value][
            version
        ].performance_metrics.items():
            count = data["count"]
            if count > 0:
                avg = data["sum"] / count
                sorted_values = sorted(data["values"])
                median = sorted_values[count // 2]
                p95 = sorted_values[int(count * 0.95)] if count > 0 else 0
                metrics[metric_name] = {
                    "count": count,
                    "average": avg,
                    "median": median,
                    "p95": p95,
                    "min": min(data["values"]) if data["values"] else 0,
                    "max": max(data["values"]) if data["values"] else 0,
                }

        return metrics

    def compare_versions(
        self, prompt_type: PromptType, version1: str, version2: str
    ) -> dict[str, Any]:
        """Compare performance between two prompt versions."""
        metrics1 = self.get_performance_metrics(prompt_type, version1)
        metrics2 = self.get_performance_metrics(prompt_type, version2)

        comparison = {
            "version1": version1,
            "version2": version2,
            "metrics": {},
        }

        all_metrics = set(metrics1.keys()) | set(metrics2.keys())
        for metric in all_metrics:
            if metric in metrics1 and metric in metrics2:
                comparison["metrics"][metric] = {
                    "version1": metrics1[metric],
                    "version2": metrics2[metric],
                    "difference": metrics2[metric]["average"] - metrics1[metric]["average"],
                    "improvement_percent": (
                        (metrics2[metric]["average"] - metrics1[metric]["average"])
                        / metrics1[metric]["average"]
                        * 100
                        if metrics1[metric]["average"] != 0
                        else 0
                    ),
                }

        return comparison


# Global prompt registry instance
_prompt_registry: PromptRegistry | None = None


def get_prompt_registry() -> PromptRegistry:
    """Get or create the global prompt registry."""
    global _prompt_registry
    if _prompt_registry is None:
        _prompt_registry = PromptRegistry()
        # Initialize with default prompts
        _initialize_default_prompts()
    return _prompt_registry


def _initialize_default_prompts() -> None:
    """Initialize default prompts from templates module."""
    from app.prompts.templates import TEMPLATES, PromptVersion as TemplateVersion

    if _prompt_registry is None:
        return

    # Import existing templates and register them
    for template_name, version_map in TEMPLATES.items():
        prompt_type = PromptType(template_name)

        for template_ver, template_obj in version_map.items():
            _prompt_registry.register_prompt(
                prompt_type=prompt_type,
                version=template_ver.value,
                template=template_obj.template,
                variables=template_obj.variables,
                description=template_obj.description,
                status=PromptStatus.ACTIVE,
                is_default=(template_ver == TemplateVersion.V1_1),
            )
