"""
Drift Detection Module for FarmIQ
Automated monitoring of model performance degradation and data distribution changes
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

import pandas as pd
import numpy as np
from scipy import stats
from evidently import ColumnMapping
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset

from app.config import settings

# Configure logging
logging.basicConfig(level=settings.log_level, format=settings.log_format)
logger = logging.getLogger(__name__)


class DriftType(Enum):
    """Types of drift that can be detected"""
    DATA_DRIFT = "data_drift"
    CONCEPT_DRIFT = "concept_drift"
    TARGET_DRIFT = "target_drift"
    PREDICTION_DRIFT = "prediction_drift"


class DriftSeverity(Enum):
    """Severity levels for detected drift"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class DriftResult:
    """Result of drift detection"""
    drift_type: DriftType
    severity: DriftSeverity
    score: float
    threshold: float
    features_affected: List[str]
    timestamp: datetime
    details: Dict[str, Any]


@dataclass
class RetrainingDecision:
    """Decision on whether to trigger retraining"""
    should_retrain: bool
    reason: str
    priority: str
    estimated_cost: float
    timestamp: datetime


class DriftDetector:
    """
    Enterprise-grade drift detection with multiple statistical methods
    """

    def __init__(
        self,
        data_drift_threshold: float = 0.2,
        concept_drift_threshold: float = 0.1,
        feature_thresholds: Optional[Dict[str, float]] = None
    ):
        """
        Initialize drift detector

        Args:
            data_drift_threshold: Threshold for data drift detection
            concept_drift_threshold: Threshold for concept drift detection
            feature_thresholds: Custom thresholds per feature
        """
        self.data_drift_threshold = data_drift_threshold
        self.concept_drift_threshold = concept_drift_threshold
        self.feature_thresholds = feature_thresholds or {}
        self.reference_data: Optional[pd.DataFrame] = None
        self.reference_predictions: Optional[np.ndarray] = None
        self.reference_targets: Optional[np.ndarray] = None

        logger.info(
            f"Drift Detector initialized: data_drift={data_drift_threshold}, "
            f"concept_drift={concept_drift_threshold}"
        )

    def set_reference(
        self,
        data: pd.DataFrame,
        predictions: Optional[np.ndarray] = None,
        targets: Optional[np.ndarray] = None
    ) -> None:
        """
        Set reference data for drift comparison

        Args:
            data: Reference feature data
            predictions: Reference predictions (optional)
            targets: Reference targets (optional)
        """
        self.reference_data = data.copy()
        self.reference_predictions = predictions
        self.reference_targets = targets
        logger.info(f"Reference data set with {len(data)} samples")

    def detect_data_drift(
        self,
        current_data: pd.DataFrame,
        method: str = "psi"
    ) -> DriftResult:
        """
        Detect data drift using statistical tests

        Args:
            current_data: Current feature data to compare
            method: Statistical method to use ('psi', 'ks', 'wasserstein')

        Returns:
            DriftResult with detection details
        """
        if self.reference_data is None:
            raise ValueError("Reference data not set")

        features_affected = []
        feature_scores = {}

        for feature in self.reference_data.columns:
            if feature not in current_data.columns:
                continue

            ref_col = self.reference_data[feature].dropna()
            curr_col = current_data[feature].dropna()

            if method == "psi":
                score = self._calculate_psi(ref_col, curr_col)
            elif method == "ks":
                score = 1 - stats.ks_2samp(ref_col, curr_col).pvalue
            elif method == "wasserstein":
                score = stats.wasserstein_distance(ref_col, curr_col)
                score = score / (ref_col.std() + 1e-10)  # Normalize
            else:
                raise ValueError(f"Unknown method: {method}")

            threshold = self.feature_thresholds.get(
                feature, self.data_drift_threshold
            )
            feature_scores[feature] = score

            if score > threshold:
                features_affected.append(feature)

        avg_drift_score = np.mean(list(feature_scores.values())) if feature_scores else 0
        severity = self._calculate_severity(
            avg_drift_score, self.data_drift_threshold
        )

        return DriftResult(
            drift_type=DriftType.DATA_DRIFT,
            severity=severity,
            score=avg_drift_score,
            threshold=self.data_drift_threshold,
            features_affected=features_affected,
            timestamp=datetime.utcnow(),
            details={
                "method": method,
                "feature_scores": feature_scores,
                "num_features_analyzed": len(feature_scores)
            }
        )

    def detect_concept_drift(
        self,
        current_data: pd.DataFrame,
        current_predictions: np.ndarray,
        current_targets: Optional[np.ndarray] = None
    ) -> DriftResult:
        """
        Detect concept drift (change in P(Y|X))

        Args:
            current_data: Current feature data
            current_predictions: Current model predictions
            current_targets: Current true labels (optional)

        Returns:
            DriftResult with detection details
        """
        if self.reference_predictions is None:
            raise ValueError("Reference predictions not set")

        # Method 1: DDM (Drift Detection Method) - track error rate
        error_drift = 0.0
        if current_targets is not None and self.reference_targets is not None:
            current_errors = (current_predictions != current_targets).astype(float)
            if hasattr(self, 'reference_errors'):
                reference_errors = self.reference_errors
                error_drift = abs(np.mean(current_errors) - np.mean(reference_errors))
            else:
                self.reference_errors = (self.reference_predictions != self.reference_targets).astype(float)
                error_drift = abs(np.mean(current_errors) - np.mean(self.reference_errors))

        # Method 2: Prediction distribution shift
        pred_drift = 0.0
        if self.reference_predictions is not None:
            if len(np.unique(self.reference_predictions)) < 20:
                # Classification - use chi-square test
                ref_dist = np.bincount(self.reference_predictions.astype(int))
                curr_dist = np.bincount(current_predictions.astype(int))
                _, p_value = stats.chisquare(f_obs=curr_dist, f_exp=ref_dist)
                pred_drift = 1 - p_value
            else:
                # Regression - use KS test
                _, p_value = stats.ks_2samp(
                    self.reference_predictions, current_predictions
                )
                pred_drift = 1 - p_value

        combined_drift = max(error_drift, pred_drift)
        severity = self._calculate_severity(
            combined_drift, self.concept_drift_threshold
        )

        return DriftResult(
            drift_type=DriftType.CONCEPT_DRIFT,
            severity=severity,
            score=combined_drift,
            threshold=self.concept_drift_threshold,
            features_affected=[],
            timestamp=datetime.utcnow(),
            details={
                "error_drift": error_drift,
                "prediction_drift": pred_drift,
                "samples_analyzed": len(current_data)
            }
        )

    def _calculate_psi(
        self,
        expected: pd.Series,
        actual: pd.Series,
        buckets: int = 10
    ) -> float:
        """
        Calculate Population Stability Index (PSI)

        Args:
            expected: Reference distribution
            actual: Current distribution
            buckets: Number of buckets for discretization

        Returns:
            PSI score
        """
        def scale_range(input_, min_val, max_val):
            input_ += -(np.min(input_))
            input_ /= np.max(input_) / (max_val - min_val)
            input_ += min_val
            return input_

        # Create bins
        breakpoints = np.linspace(0, buckets + 1, buckets + 1)
        breakpoints = scale_range(breakpoints, np.min(expected), np.max(expected))

        expected_percents = np.histogram(expected, breakpoints)[0] / len(expected)
        actual_percents = np.histogram(actual, breakpoints)[0] / len(actual)

        # Calculate PSI
        psi_value = 0
        for e_percent, a_percent in zip(expected_percents, actual_percents):
            if e_percent == 0:
                e_percent = 0.0001
            if a_percent == 0:
                a_percent = 0.0001

            psi_value += (e_percent - a_percent) * np.log(e_percent / a_percent)

        return psi_value

    def _calculate_severity(
        self,
        score: float,
        threshold: float
    ) -> DriftSeverity:
        """
        Calculate drift severity based on score and threshold

        Args:
            score: Drift score
            threshold: Threshold for drift detection

        Returns:
            DriftSeverity enum value
        """
        if score < threshold * 0.5:
            return DriftSeverity.NONE
        elif score < threshold:
            return DriftSeverity.LOW
        elif score < threshold * 1.5:
            return DriftSeverity.MEDIUM
        elif score < threshold * 2:
            return DriftSeverity.HIGH
        else:
            return DriftSeverity.CRITICAL


class RetrainingOrchestrator:
    """
    Orchestrates retraining decisions based on drift detection results
    """

    def __init__(
        self,
        min_data_points: int = 10000,
        cooldown_hours: int = 24,
        auto_approve: bool = False,
        cost_per_training: float = 100.0
    ):
        """
        Initialize retraining orchestrator

        Args:
            min_data_points: Minimum data points required for retraining
            cooldown_hours: Minimum hours between retraining cycles
            auto_approve: Whether to auto-approve retraining
            cost_per_training: Estimated cost per training run
        """
        self.min_data_points = min_data_points
        self.cooldown_hours = cooldown_hours
        self.auto_approve = auto_approve
        self.cost_per_training = cost_per_training
        self.last_retraining_time: Optional[datetime] = None

        logger.info(
            f"Retraining Orchestrator initialized: min_data={min_data_points}, "
            f"cooldown={cooldown_hours}h"
        )

    def make_retraining_decision(
        self,
        drift_results: List[DriftResult],
        current_data_size: int
    ) -> RetrainingDecision:
        """
        Make decision on whether to trigger retraining

        Args:
            drift_results: List of drift detection results
            current_data_size: Size of current dataset

        Returns:
            RetrainingDecision with details
        """
        # Check cooldown period
        if self.last_retraining_time:
            time_since_last = datetime.utcnow() - self.last_retraining_time
            if time_since_last.total_seconds() < self.cooldown_hours * 3600:
                return RetrainingDecision(
                    should_retrain=False,
                    reason=f"Cooldown period active ({time_since_last} since last retraining)",
                    priority="none",
                    estimated_cost=0.0,
                    timestamp=datetime.utcnow()
                )

        # Check data size
        if current_data_size < self.min_data_points:
            return RetrainingDecision(
                should_retrain=False,
                reason=f"Insufficient data: {current_data_size} < {self.min_data_points}",
                priority="none",
                estimated_cost=0.0,
                timestamp=datetime.utcnow()
            )

        # Evaluate drift severity
        critical_drift = any(
            r.severity == DriftSeverity.CRITICAL for r in drift_results
        )
        high_drift = any(
            r.severity == DriftSeverity.HIGH for r in drift_results
        )
        medium_drift = any(
            r.severity == DriftSeverity.MEDIUM for r in drift_results
        )

        if critical_drift or high_drift:
            priority = "critical" if critical_drift else "high"
            should_retrain = True
            reason = f"{priority.capitalize()} severity drift detected"
        elif medium_drift:
            priority = "medium"
            should_retrain = self.auto_approve
            reason = "Medium severity drift detected (requires approval if auto-approve disabled)"
        else:
            priority = "low"
            should_retrain = False
            reason = "Drift severity below retraining threshold"

        return RetrainingDecision(
            should_retrain=should_retrain,
            reason=reason,
            priority=priority,
            estimated_cost=self.cost_per_training if should_retrain else 0.0,
            timestamp=datetime.utcnow()
        )

    def trigger_retraining(self, model_id: str) -> str:
        """
        Trigger retraining pipeline

        Args:
            model_id: ID of model to retrain

        Returns:
            Training job ID
        """
        # In production, this would call the ML pipeline
        training_job_id = f"training-{model_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        self.last_retraining_time = datetime.utcnow()
        logger.info(f"Retraining triggered for model {model_id}, job ID: {training_job_id}")

        return training_job_id


# Global instances
drift_detector = DriftDetector()
retraining_orchestrator = RetrainingOrchestrator()
