from __future__ import annotations

from enum import Enum
from typing import Any


class PromptVersion(str, Enum):
    """Prompt version enumeration."""
    V1_0 = "1.0"
    V1_1 = "1.1"


class PromptTemplate:
    """Prompt template with versioning support."""

    def __init__(
        self,
        version: PromptVersion,
        template: str,
        variables: list[str],
        description: str = "",
    ):
        self.version = version
        self.template = template
        self.variables = variables
        self.description = description

    def render(self, **kwargs: Any) -> str:
        """Render template with variables."""
        missing_vars = [v for v in self.variables if v not in kwargs]
        if missing_vars:
            raise ValueError(f"Missing variables for prompt: {missing_vars}")

        return self.template.format(**kwargs)


# Prompt templates for different versions
TEMPLATES = {
    "telemetry_analysis": {
        PromptVersion.V1_0: PromptTemplate(
            version=PromptVersion.V1_0,
            template="""Analyze the following farm telemetry data:
{kpis_section}
{anomalies_section}

Analysis Mode: {mode}
Time Window: {time_window}

Provide:
1. A concise summary of the situation
2. Key findings with impact assessment
3. Likely causes for any issues
4. Recommended actions
5. Confidence level (0-1)""",
            variables=["kpis_section", "anomalies_section", "mode", "time_window"],
            description="Initial telemetry analysis prompt template",
        ),
        PromptVersion.V1_1: PromptTemplate(
            version=PromptVersion.V1_1,
            template="""As an agricultural AI expert specializing in livestock management, analyze:

{kpis_section}
{anomalies_section}

Context:
- Analysis Mode: {mode}
- Time Window: {time_window}
- Historical Context: {historical_context}

Provide a comprehensive analysis including:
1. Executive Summary - A concise overview of the situation
2. Key Findings - Detailed observations with impact levels (low/medium/high/critical)
3. Likely Root Causes - Probable reasons for any detected issues
4. Recommended Actions - Specific, actionable steps with priorities
5. Confidence Score - Your confidence level (0-1) in the analysis""",
            variables=["kpis_section", "anomalies_section", "mode", "time_window", "historical_context"],
            description="Enhanced telemetry analysis prompt with historical context",
        ),
    },
    "anomaly_explanation": {
        PromptVersion.V1_0: PromptTemplate(
            version=PromptVersion.V1_0,
            template="""Explain the following anomaly:
Anomaly Code: {code}
Description: {description}
Severity: {severity}
Detected At: {detected_at}

Provide:
1. What this anomaly typically indicates
2. Potential causes
3. Recommended investigation steps
4. Potential impact on animal welfare""",
            variables=["code", "description", "severity", "detected_at"],
            description="Basic anomaly explanation template",
        ),
        PromptVersion.V1_1: PromptTemplate(
            version=PromptVersion.V1_1,
            template="""As a livestock behavior specialist, provide detailed analysis:

Anomaly Details:
- Code: {code}
- Description: {description}
- Severity: {severity}
- Detection Time: {detected_at}
- Related Metrics: {related_metrics}

Analysis Required:
1. Behavioral interpretation - What this anomaly suggests about animal behavior
2. Environmental factors - Potential environmental causes
3. Health implications - Impact on animal health and welfare
4. Immediate actions - Steps to take within the next 24 hours
5. Long-term monitoring - What to track going forward""",
            variables=["code", "description", "severity", "detected_at", "related_metrics"],
            description="Enhanced anomaly explanation with behavioral analysis",
        ),
    },
    "action_recommendation": {
        PromptVersion.V1_0: PromptTemplate(
            version=PromptVersion.V1_0,
            template="""Based on the following analysis, recommend actions:
Summary: {summary}
Confidence: {confidence}

Provide:
1. Priority actions (what to do first)
2. Secondary actions (what to do next)
3. Monitoring recommendations (what to watch)
4. Escalation criteria (when to involve experts)""",
            variables=["summary", "confidence"],
            description="Basic action recommendation template",
        ),
        PromptVersion.V1_1: PromptTemplate(
            version=PromptVersion.V1_1,
            template="""As a farm management expert, provide actionable recommendations:

Current Situation:
- Summary: {summary}
- Confidence Level: {confidence}
- Available Resources: {resources}

Recommendations Structure:
1. IMMEDIATE (0-24 hours):
   - Critical actions requiring immediate attention
   - Resource allocation needs

2. SHORT-TERM (1-7 days):
   - Follow-up actions
   - Monitoring adjustments

3. MEDIUM-TERM (1-4 weeks):
   - Process improvements
   - Training needs

4. SUCCESS METRICS:
   - How to measure improvement
   - Expected outcomes""",
            variables=["summary", "confidence", "resources"],
            description="Enhanced action recommendation with time-based priorities",
        ),
    },
}


def get_template(template_name: str, version: PromptVersion = PromptVersion.V1_1) -> PromptTemplate:
    """Get a prompt template by name and version."""
    if template_name not in TEMPLATES:
        raise ValueError(f"Unknown template: {template_name}")

    version_templates = TEMPLATES[template_name]
    if version not in version_templates:
        # Fall back to latest version if requested version not available
        latest_version = max(version_templates.keys(), key=lambda v: v.value)
        return version_templates[latest_version]

    return version_templates[version]


def build_kpis_section(kpis: list[Any]) -> str:
    """Build KPIs section for prompt."""
    if not kpis:
        return "No KPIs available."

    lines = ["Key Performance Indicators:"]
    for kpi in kpis:
        lines.append(f"  - {kpi.code}: {kpi.value}")
        if hasattr(kpi, "delta24h") and kpi.delta24h is not None:
            direction = "increased" if kpi.delta24h > 0 else "decreased"
            lines.append(f"    (24h change: {direction} by {abs(kpi.delta24h):.2f})")

    return "\n".join(lines)


def build_anomalies_section(anomalies: list[Any]) -> str:
    """Build anomalies section for prompt."""
    if not anomalies:
        return "No anomalies detected."

    lines = ["Detected Anomalies:"]
    for anomaly in anomalies:
        lines.append(f"  - {anomaly.code}: {anomaly.description} (severity: {anomaly.severity})")

    return "\n".join(lines)
