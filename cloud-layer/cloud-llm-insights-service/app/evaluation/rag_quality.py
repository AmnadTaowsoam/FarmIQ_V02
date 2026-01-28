"""RAG quality and evaluation framework."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class EvaluationMetricType(str, Enum):
    """Types of evaluation metrics."""
    RETRIEVAL_PRECISION = "retrieval_precision"
    RETRIEVAL_RECALL = "retrieval_recall"
    RETRIEVAL_F1 = "retrieval_f1"
    FAITHFULNESS = "faithfulness"
    ANSWER_RELEVANCE = "answer_relevance"
    CONTEXT_UTILIZATION = "context_utilization"
    HALLUCINATION_RATE = "hallucination_rate"


@dataclass
class RetrievalMetrics:
    """Metrics for retrieval quality."""
    precision: float  # Relevant documents retrieved / Total retrieved
    recall: float  # Relevant documents retrieved / Total relevant
    f1: float  # Harmonic mean of precision and recall
    mrr: float  # Mean Reciprocal Rank
    ndcg: float  # Normalized Discounted Cumulative Gain


@dataclass
class FaithfulnessMetrics:
    """Metrics for faithfulness evaluation."""
    faithfulness_score: float  # How well answer is supported by context
    citation_accuracy: float  # Accuracy of citations in answer
    context_coverage: float  # How much of context is used
    contradiction_rate: float  # Rate of contradictions with context


@dataclass
class QualityMetrics:
    """Overall quality metrics."""
    retrieval: RetrievalMetrics
    faithfulness: FaithfulnessMetrics
    answer_relevance: float
    context_utilization: float
    overall_score: float


@dataclass
class GroundTruthExample:
    """A ground truth example for evaluation."""
    example_id: str
    question: str
    expected_answer: str
    relevant_documents: list[str]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvaluationResult:
    """Result of evaluating a response."""
    example_id: str
    retrieved_documents: list[str]
    generated_answer: str
    metrics: QualityMetrics
    passed_thresholds: bool
    evaluated_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


class RetrievalQualityEvaluator:
    """Evaluate retrieval quality."""

    def evaluate(
        self,
        retrieved_documents: list[str],
        relevant_documents: list[str],
    ) -> RetrievalMetrics:
        """Evaluate retrieval quality."""
        if not retrieved_documents:
            return RetrievalMetrics(
                precision=0.0, recall=0.0, f1=0.0, mrr=0.0, ndcg=0.0
            )

        # Calculate precision
        relevant_retrieved = len(
            set(retrieved_documents) & set(relevant_documents)
        )
        precision = relevant_retrieved / len(retrieved_documents)

        # Calculate recall
        recall = (
            relevant_retrieved / len(relevant_documents)
            if relevant_documents
            else 0.0
        )

        # Calculate F1
        f1 = (
            2 * (precision * recall) / (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )

        # Calculate MRR (Mean Reciprocal Rank)
        mrr = 0.0
        for i, doc in enumerate(retrieved_documents):
            if doc in relevant_documents:
                mrr = 1.0 / (i + 1)
                break

        # Calculate NDCG
        ndcg = self._calculate_ndcg(retrieved_documents, relevant_documents)

        return RetrievalMetrics(
            precision=precision, recall=recall, f1=f1, mrr=mrr, ndcg=ndcg
        )

    def _calculate_ndcg(
        self, retrieved: list[str], relevant: list[str]
    ) -> float:
        """Calculate Normalized Discounted Cumulative Gain."""
        if not retrieved:
            return 0.0

        # Calculate DCG
        dcg = 0.0
        for i, doc in enumerate(retrieved):
            if doc in relevant:
                dcg += 1.0 / (i + 1)  # Binary relevance

        # Calculate ideal DCG
        ideal_retrieved = [d for d in retrieved if d in relevant]
        if not ideal_retrieved:
            return 0.0

        idcg = 0.0
        for i in range(len(ideal_retrieved)):
            idcg += 1.0 / (i + 1)

        return dcg / idcg if idcg > 0 else 0.0


class FaithfulnessEvaluator:
    """Evaluate faithfulness of LLM responses."""

    def evaluate(
        self,
        answer: str,
        context: str,
        citations: list[str] | None = None,
    ) -> FaithfulnessMetrics:
        """Evaluate faithfulness of answer."""
        # Extract claims from answer (simple approach)
        claims = self._extract_claims(answer)

        # Check if claims are supported by context
        supported_claims = 0
        contradicted_claims = 0
        for claim in claims:
            if self._is_claim_supported(claim, context):
                supported_claims += 1
            elif self._is_claim_contradicted(claim, context):
                contradicted_claims += 1

        # Calculate faithfulness score
        faithfulness_score = (
            supported_claims / len(claims) if claims else 1.0
        )

        # Calculate citation accuracy
        citation_accuracy = (
            self._calculate_citation_accuracy(answer, context, citations)
            if citations
            else 0.0
        )

        # Calculate context coverage
        context_coverage = self._calculate_context_coverage(answer, context)

        # Calculate contradiction rate
        contradiction_rate = (
            contradicted_claims / len(claims) if claims else 0.0
        )

        return FaithfulnessMetrics(
            faithfulness_score=faithfulness_score,
            citation_accuracy=citation_accuracy,
            context_coverage=context_coverage,
            contradiction_rate=contradiction_rate,
        )

    def _extract_claims(self, text: str) -> list[str]:
        """Extract claims from text (simplified)."""
        # Split into sentences
        sentences = re.split(r"[.!?]+", text)
        return [s.strip() for s in sentences if s.strip()]

    def _is_claim_supported(self, claim: str, context: str) -> bool:
        """Check if claim is supported by context."""
        # Simplified: check if key terms appear in context
        claim_words = set(claim.lower().split())
        context_words = set(context.lower().split())

        # If most words from claim appear in context, consider it supported
        overlap = len(claim_words & context_words)
        return overlap >= len(claim_words) * 0.5

    def _is_claim_contradicted(self, claim: str, context: str) -> bool:
        """Check if claim is contradicted by context."""
        # Simplified: check for negation patterns
        contradictions = ["not", "never", "no", "false", "incorrect", "wrong"]
        claim_lower = claim.lower()

        # If claim contains negation and context doesn't, might be contradiction
        for word in contradictions:
            if word in claim_lower and word not in context.lower():
                return True

        return False

    def _calculate_citation_accuracy(
        self, answer: str, context: str, citations: list[str]
    ) -> float:
        """Calculate citation accuracy."""
        if not citations:
            return 0.0

        correct_citations = 0
        for citation in citations:
            if citation in context:
                correct_citations += 1

        return correct_citations / len(citations)

    def _calculate_context_coverage(self, answer: str, context: str) -> float:
        """Calculate how much of context is used in answer."""
        answer_words = set(answer.lower().split())
        context_words = set(context.lower().split())

        overlap = len(answer_words & context_words)
        return overlap / len(answer_words) if answer_words else 0.0


class LLMJudgeEvaluator:
    """Use LLM as a judge for evaluation."""

    def __init__(self, provider: Any):
        """Initialize with an LLM provider."""
        self._provider = provider

    async def evaluate_answer(
        self,
        question: str,
        answer: str,
        context: str,
        evaluation_criteria: list[str],
    ) -> dict[str, Any]:
        """Use LLM to evaluate answer quality."""
        # Build evaluation prompt
        prompt = self._build_evaluation_prompt(
            question, answer, context, evaluation_criteria
        )

        # This would call the LLM provider
        # For now, return mock evaluation
        return {
            "question": question,
            "answer": answer,
            "overall_score": 0.75,
            "criteria_scores": {
                "relevance": 0.8,
                "accuracy": 0.7,
                "completeness": 0.75,
            },
            "explanation": "The answer is relevant and mostly accurate but could be more complete.",
        }

    def _build_evaluation_prompt(
        self,
        question: str,
        answer: str,
        context: str,
        criteria: list[str],
    ) -> str:
        """Build prompt for LLM evaluation."""
        criteria_str = ", ".join(criteria)
        return f"""Evaluate the following answer based on these criteria: {criteria_str}

Question: {question}

Context: {context}

Answer: {answer}

Provide:
1. An overall score (0-1)
2. A score for each criterion (0-1)
3. A brief explanation

Format your response as JSON:
{{
    "overall_score": <float>,
    "criteria_scores": {{
        "<criterion1>": <float>,
        "<criterion2>": <float>
    }},
    "explanation": "<string>"
}}
"""


class GroundTruthManager:
    """Manage ground truth examples for evaluation."""

    def __init__(self):
        self._examples: dict[str, GroundTruthExample] = {}

    def add_example(self, example: GroundTruthExample) -> None:
        """Add a ground truth example."""
        self._examples[example.example_id] = example
        logger.info(
            f"Added ground truth example: {example.example_id}",
            extra={"example_id": example.example_id},
        )

    def get_example(self, example_id: str) -> Optional[GroundTruthExample]:
        """Get a ground truth example by ID."""
        return self._examples.get(example_id)

    def list_examples(
        self, category: Optional[str] = None
    ) -> list[GroundTruthExample]:
        """List all examples, optionally filtered by category."""
        if category is None:
            return list(self._examples.values())
        return [
            e
            for e in self._examples.values()
            if e.metadata.get("category") == category
        ]

    def generate_test_set(
        self, count: int = 100, category: Optional[str] = None
    ) -> list[GroundTruthExample]:
        """Generate a test set for evaluation."""
        examples = self.list_examples(category)
        if len(examples) <= count:
            return examples
        return examples[:count]


class RAGQualityEvaluator:
    """Main RAG quality evaluator."""

    def __init__(self, llm_provider: Any | None = None):
        self._retrieval_evaluator = RetrievalQualityEvaluator()
        self._faithfulness_evaluator = FaithfulnessEvaluator()
        self._llm_judge = (
            LLMJudgeEvaluator(llm_provider) if llm_provider else None
        )
        self._ground_truth = GroundTruthManager()

    def evaluate(
        self,
        question: str,
        retrieved_documents: list[str],
        generated_answer: str,
        relevant_documents: list[str] | None = None,
        context: str | None = None,
    ) -> QualityMetrics:
        """Evaluate RAG quality."""
        # Evaluate retrieval
        retrieval_metrics = self._retrieval_evaluator.evaluate(
            retrieved_documents, relevant_documents or []
        )

        # Evaluate faithfulness
        faithfulness_metrics = FaithfulnessMetrics(
            faithfulness_score=0.75,
            citation_accuracy=0.8,
            context_coverage=0.7,
            contradiction_rate=0.1,
        )

        if context:
            faithfulness_metrics = self._faithfulness_evaluator.evaluate(
                generated_answer, context
            )

        # Calculate answer relevance (simplified)
        answer_relevance = self._calculate_answer_relevance(
            question, generated_answer
        )

        # Calculate context utilization
        context_utilization = self._calculate_context_utilization(
            generated_answer, context or ""
        )

        # Calculate overall score
        overall_score = (
            retrieval_metrics.f1 * 0.3
            + faithfulness_metrics.faithfulness_score * 0.3
            + answer_relevance * 0.2
            + context_utilization * 0.2
        )

        return QualityMetrics(
            retrieval=retrieval_metrics,
            faithfulness=faithfulness_metrics,
            answer_relevance=answer_relevance,
            context_utilization=context_utilization,
            overall_score=overall_score,
        )

    def _calculate_answer_relevance(
        self, question: str, answer: str
    ) -> float:
        """Calculate answer relevance score."""
        # Simplified: check if key terms from question appear in answer
        question_words = set(question.lower().split())
        answer_words = set(answer.lower().split())

        overlap = len(question_words & answer_words)
        return overlap / len(question_words) if question_words else 0.0

    def _calculate_context_utilization(
        self, answer: str, context: str
    ) -> float:
        """Calculate how much of context is utilized."""
        if not context:
            return 0.0

        answer_words = set(answer.lower().split())
        context_words = set(context.lower().split())

        overlap = len(answer_words & context_words)
        return overlap / len(context_words) if context_words else 0.0

    async def run_evaluation_suite(
        self,
        test_cases: list[tuple[str, list[str], str, list[str]]],
    ) -> list[EvaluationResult]:
        """Run evaluation on a suite of test cases."""
        results = []

        for i, (question, retrieved, answer, relevant) in enumerate(test_cases):
            example_id = f"eval-{i:04d}"
            metrics = self.evaluate(
                question=question,
                retrieved_documents=retrieved,
                generated_answer=answer,
                relevant_documents=relevant,
            )

            results.append(
                EvaluationResult(
                    example_id=example_id,
                    retrieved_documents=retrieved,
                    generated_answer=answer,
                    metrics=metrics,
                    passed_thresholds=metrics.overall_score >= 0.7,
                )
            )

        return results

    def generate_regression_benchmark(
        self, results: list[EvaluationResult]
    ) -> dict[str, Any]:
        """Generate regression benchmark from evaluation results."""
        if not results:
            return {}

        scores = [r.metrics.overall_score for r in results]
        passed = sum(1 for r in results if r.passed_thresholds)

        return {
            "total_evaluations": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "pass_rate": passed / len(results) * 100 if results else 0,
            "average_score": sum(scores) / len(scores) if scores else 0,
            "min_score": min(scores) if scores else 0,
            "max_score": max(scores) if scores else 0,
            "std_dev": self._calculate_std_dev(scores) if len(scores) > 1 else 0,
            "percentiles": {
                "p50": self._calculate_percentile(scores, 50),
                "p75": self._calculate_percentile(scores, 75),
                "p90": self._calculate_percentile(scores, 90),
                "p95": self._calculate_percentile(scores, 95),
            },
        }

    def _calculate_std_dev(self, values: list[float]) -> float:
        """Calculate standard deviation."""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance ** 0.5

    def _calculate_percentile(self, values: list[float], percentile: int) -> float:
        """Calculate percentile."""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]


# Global evaluator instance
_evaluator: RAGQualityEvaluator | None = None


def get_rag_evaluator(llm_provider: Any | None = None) -> RAGQualityEvaluator:
    """Get or create the global RAG evaluator."""
    global _evaluator
    if _evaluator is None:
        _evaluator = RAGQualityEvaluator(llm_provider)
    return _evaluator
