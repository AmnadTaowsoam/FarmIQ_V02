"""LLM security guardrails for injection detection, output filtering, and content moderation."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class GuardrailSeverity(str, Enum):
    """Severity of guardrail violation."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GuardrailType(str, Enum):
    """Types of guardrails."""
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    SENSITIVE_DATA = "sensitive_data"
    CONTENT_MODERATION = "content_moderation"
    OUTPUT_FILTERING = "output_filtering"


@dataclass
class GuardrailViolation:
    """A guardrail violation."""
    violation_type: GuardrailType
    severity: GuardrailSeverity
    message: str
    detected_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    context: Optional[str] = None
    matched_pattern: Optional[str] = None


@dataclass
class GuardrailResult:
    """Result of guardrail check."""
    passed: bool
    violations: list[GuardrailViolation] = field(default_factory=list)
    filtered_content: Optional[str] = None


class PromptInjectionDetector:
    """Detect prompt injection attempts."""

    # Common prompt injection patterns
    INJECTION_PATTERNS = [
        r"(?i)ignore\s+(all\s+)?(previous|above|earlier)\s+(instructions?|prompts?|commands?)",
        r"(?i)forget\s+(all\s+)?(previous|above|earlier)\s+(instructions?|prompts?|commands?)",
        r"(?i)disregard\s+(all\s+)?(previous|above|earlier)\s+(instructions?|prompts?|commands?)",
        r"(?i)override\s+(all\s+)?(previous|above|earlier)\s+(instructions?|prompts?|commands?)",
        r"(?i)new\s+(instruction|prompt|command)",
        r"(?i)system\s*:\s*(ignore|forget|override)",
        r"(?i)developer\s*:\s*(ignore|forget|override)",
        r"(?i)assistant\s*:\s*(ignore|forget|override)",
        r"(?i)\[INST\].*?\[/INST\]",
        r"(?i)\[SYSTEM\].*?\[/SYSTEM\]",
        r"(?i)\[PROMPT\].*?\[/PROMPT\]",
        r"(?i)###\s*(instruction|prompt|command)\s*###",
        r"(?i)---\s*(instruction|prompt|command)\s*---",
        r"(?i)<<<\s*(instruction|prompt|command)\s*<<<",
        r"(?i)translate\s+this\s+to\s+(python|javascript|code)",
        r"(?i)convert\s+this\s+to\s+(python|javascript|code)",
        r"(?i)print\s+(all\s+)?(instructions?|prompts?|commands?)",
        r"(?i)repeat\s+(all\s+)?(instructions?|prompts?|commands?)",
        r"(?i)output\s+(all\s+)?(instructions?|prompts?|commands?)",
        r"(?i)show\s+(all\s+)?(instructions?|prompts?|commands?)",
        r"(?i)what\s+(are|were)\s+(all\s+)?(the\s+)?(instructions?|prompts?|commands?)",
        r"(?i)tell\s+me\s+(all\s+)?(the\s+)?(instructions?|prompts?|commands?)",
        r"(?i)your\s+(instructions?|prompts?|commands?)\s+are",
    ]

    def __init__(self):
        self._patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.INJECTION_PATTERNS]

    def detect(self, text: str) -> list[GuardrailViolation]:
        """Detect prompt injection attempts in text."""
        violations = []

        for pattern in self._patterns:
            match = pattern.search(text)
            if match:
                violations.append(
                    GuardrailViolation(
                        violation_type=GuardrailType.PROMPT_INJECTION,
                        severity=GuardrailSeverity.HIGH,
                        message="Potential prompt injection detected",
                        context=text[max(0, match.start() - 50) : match.end() + 50],
                        matched_pattern=match.group(),
                    )
                )

        return violations


class JailbreakDetector:
    """Detect jailbreak attempts."""

    # Common jailbreak patterns
    JAILBREAK_PATTERNS = [
        r"(?i)(act|roleplay|pretend|simulate|become|you are|as a)\s+(as\s+)?(a\s+)?(unrestricted|harmful|dangerous|malicious|evil|criminal|terrorist|hacker)",
        r"(?i)(ignore|bypass|override|disable)\s+(your\s+)?(safety|security|ethical|moral|content)\s+(guidelines|rules|restrictions|filters)",
        r"(?i)(no\s+)?(safety|security|ethical|moral|content)\s+(guidelines|rules|restrictions|filters)",
        r"(?i)(i\s+)?need\s+(you\s+)?to\s+(ignore|bypass|override)\s+(all\s+)?(rules|restrictions)",
        r"(?i)(dan\s+mode|developer\s+mode|jailbreak\s+mode)",
        r"(?i)(hypothetically|theoretically|in\s+fiction|in\s+a\s+story)",
        r"(?i)(for\s+educational\s+purposes|for\s+research|for\s+testing)",
        r"(?i)(just\s+curious|just\s+wondering)",
        r"(?i)(it's\s+important|it\s+is\s+important)",
        r"(?i)(i\s+promise|i\s+swear)",
        r"(?i)(trust\s+me|believe\s+me)",
        r"(?i)(no\s+one\s+will\s+know|don't\s+tell\s+anyone)",
        r"(?i)(this\s+is\s+not\s+harmful|this\s+is\s+safe)",
        r"(?i)(help\s+me\s+with|hack|exploit|attack|bypass)",
    ]

    def __init__(self):
        self._patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.JAILBREAK_PATTERNS]

    def detect(self, text: str) -> list[GuardrailViolation]:
        """Detect jailbreak attempts in text."""
        violations = []

        for pattern in self._patterns:
            match = pattern.search(text)
            if match:
                violations.append(
                    GuardrailViolation(
                        violation_type=GuardrailType.JAILBREAK,
                        severity=GuardrailSeverity.CRITICAL,
                        message="Potential jailbreak attempt detected",
                        context=text[max(0, match.start() - 50) : match.end() + 50],
                        matched_pattern=match.group(),
                    )
                )

        return violations


class SensitiveDataFilter:
    """Filter sensitive data from input and output."""

    # Patterns for sensitive data
    SENSITIVE_PATTERNS = {
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "credit_card": r"\b(?:\d[ -]*?){13,16}\b",
        "api_key": r"(?i)(api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*[A-Za-z0-9_-]{20,}",
        "password": r"(?i)(password|passwd|pwd)\s*[:=]\s*\S+",
        "ip_address": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
    }

    def __init__(self, mask_char: str = "*"):
        self._mask_char = mask_char
        self._patterns = {
            name: re.compile(pattern, re.IGNORECASE)
            for name, pattern in self.SENSITIVE_PATTERNS.items()
        }

    def filter(self, text: str) -> tuple[str, list[GuardrailViolation]]:
        """Filter sensitive data from text."""
        filtered_text = text
        violations = []

        for name, pattern in self._patterns.items():
            matches = list(pattern.finditer(filtered_text))
            for match in matches:
                violations.append(
                    GuardrailViolation(
                        violation_type=GuardrailType.SENSITIVE_DATA,
                        severity=GuardrailSeverity.HIGH,
                        message=f"Sensitive data detected: {name}",
                        context=filtered_text[max(0, match.start() - 20) : match.end() + 20],
                        matched_pattern=match.group(),
                    )
                )
                # Mask the sensitive data
                filtered_text = (
                    filtered_text[: match.start()]
                    + self._mask_char * len(match.group())
                    + filtered_text[match.end() :]
                )

        return filtered_text, violations


class ContentModerator:
    """Moderate content for harmful or inappropriate content."""

    # Harmful content patterns
    HARMFUL_PATTERNS = {
        "violence": r"(?i)(kill|murder|assault|attack|beat|torture|abuse|harm|hurt)",
        "hate_speech": r"(?i)(hate|racist|sexist|homophobic|slur|discrimination|bigot)",
        "self_harm": r"(?i)(suicide|kill\s+myself|self-harm|end\s+my\s+life)",
        "sexual_content": r"(?i)(pornography|explicit|nude|sexual|adult\s+content)",
        "illegal": r"(?i)(illegal|crime|felony|fraud|money\s+laundering|drug\s+trafficking)",
    }

    def __init__(self):
        self._patterns = {
            name: re.compile(pattern, re.IGNORECASE)
            for name, pattern in self.HARMFUL_PATTERNS.items()
        }

    def moderate(self, text: str) -> list[GuardrailViolation]:
        """Moderate content for harmful patterns."""
        violations = []

        for name, pattern in self._patterns.items():
            match = pattern.search(text)
            if match:
                severity = GuardrailSeverity.CRITICAL if name in ["violence", "hate_speech", "self_harm", "illegal"] else GuardrailSeverity.HIGH
                violations.append(
                    GuardrailViolation(
                        violation_type=GuardrailType.CONTENT_MODERATION,
                        severity=severity,
                        message=f"Harmful content detected: {name}",
                        context=text[max(0, match.start() - 50) : match.end() + 50],
                        matched_pattern=match.group(),
                    )
                )

        return violations


class OutputFilter:
    """Filter LLM output for safety and quality."""

    def __init__(self):
        self._sensitive_data_filter = SensitiveDataFilter()
        self._content_moderator = ContentModerator()

    def filter(self, output: str) -> GuardrailResult:
        """Filter LLM output."""
        violations = []
        filtered_content = output

        # Check for sensitive data
        filtered_content, data_violations = self._sensitive_data_filter.filter(filtered_content)
        violations.extend(data_violations)

        # Check for harmful content
        content_violations = self._content_moderator.moderate(filtered_content)
        violations.extend(content_violations)

        return GuardrailResult(
            passed=len(violations) == 0,
            violations=violations,
            filtered_content=filtered_content if violations else None,
        )


class GuardrailsEngine:
    """Main guardrails engine that combines all guardrails."""

    def __init__(self):
        self._prompt_injection_detector = PromptInjectionDetector()
        self._jailbreak_detector = JailbreakDetector()
        self._output_filter = OutputFilter()

    def check_input(self, text: str) -> GuardrailResult:
        """Check input text for guardrail violations."""
        violations = []

        # Check for prompt injection
        injection_violations = self._prompt_injection_detector.detect(text)
        violations.extend(injection_violations)

        # Check for jailbreak attempts
        jailbreak_violations = self._jailbreak_detector.detect(text)
        violations.extend(jailbreak_violations)

        # Check for sensitive data
        sensitive_data_filter = SensitiveDataFilter()
        filtered_text, data_violations = sensitive_data_filter.filter(text)
        violations.extend(data_violations)

        return GuardrailResult(
            passed=len(violations) == 0,
            violations=violations,
            filtered_content=filtered_text if data_violations else None,
        )

    def check_output(self, output: str) -> GuardrailResult:
        """Check LLM output for guardrail violations."""
        return self._output_filter.filter(output)

    def log_violations(self, violations: list[GuardrailViolation], context: dict[str, Any]) -> None:
        """Log guardrail violations."""
        for violation in violations:
            logger.warning(
                f"Guardrail violation: {violation.violation_type.value}",
                extra={
                    "violation_type": violation.violation_type.value,
                    "severity": violation.severity.value,
                    "message": violation.message,
                    "context": violation.context,
                    "matched_pattern": violation.matched_pattern,
                    **context,
                },
            )


# Global guardrails engine instance
_guardrails_engine: GuardrailsEngine | None = None


def get_guardrails() -> GuardrailsEngine:
    """Get or create the global guardrails engine."""
    global _guardrails_engine
    if _guardrails_engine is None:
        _guardrails_engine = GuardrailsEngine()
    return _guardrails_engine
