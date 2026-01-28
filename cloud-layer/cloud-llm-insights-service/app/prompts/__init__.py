"""Prompt templates and registry module."""

from app.prompts.templates import (
    PromptTemplate,
    PromptVersion as TemplateVersion,
    TEMPLATES,
    get_template,
    build_kpis_section,
    build_anomalies_section,
)
from app.prompts.registry import (
    PromptRegistry,
    PromptStatus,
    PromptType,
    PromptVersion as RegistryPromptVersion,
    get_prompt_registry,
)

# Export PromptVersion as alias for TemplateVersion for backward compatibility
PromptVersion = TemplateVersion

__all__ = [
    # Templates
    "PromptTemplate",
    "TemplateVersion",
    "PromptVersion",  # Alias for TemplateVersion
    "TEMPLATES",
    "get_template",
    "build_kpis_section",
    "build_anomalies_section",
    # Registry
    "PromptRegistry",
    "PromptStatus",
    "PromptType",
    "RegistryPromptVersion",
    "get_prompt_registry",
]
