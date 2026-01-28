"""
Cohort analysis module
Analyzes batch performance over time for cohort-based insights
"""

import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class CohortAnalyzer:
    """Cohort analyzer for FarmIQ batch analysis"""

    def analyze(
        self,
        df: pd.DataFrame,
        cohort_by: str = 'batch_start_date',
        metrics: List[str] = ['fcr', 'adg_kg', 'survival_rate'],
    ) -> Dict[str, Any]:
        """
        Perform cohort analysis

        Args:
            df: DataFrame with batch data
            cohort_by: How to group cohorts
            metrics: Metrics to analyze

        Returns:
            Dictionary with cohort results and summary
        """
        # Prepare data
        df = self._prepare_data(df, cohort_by)

        if df.empty:
            return {
                'cohorts': [],
                'summary': {
                    'total_cohorts': 0,
                    'total_batches': 0,
                    'message': 'No data available for cohort analysis',
                },
            }

        # Group by cohort
        cohorts = df.groupby(cohort_by).agg({
            'batch_id': 'count',
            'days_in_batch': 'mean',
            'avg_fcr': 'mean',
            'avg_adg_kg': 'mean',
            'avg_sgr_pct': 'mean',
            'survival_rate': 'mean',
            'total_feed_kg': 'sum',
            'total_weight_gain_kg': 'sum',
            'mortality_rate': 'mean',
        }).reset_index()

        cohorts = cohorts.rename(columns={
            'batch_id': 'batch_count',
            'days_in_batch': 'avg_days_in_batch',
        })

        # Calculate cohort metrics
        cohorts['performance_score'] = self._calculate_performance_score(cohorts)

        # Sort by performance score
        cohorts = cohorts.sort_values('performance_score', ascending=False)

        # Convert to list of dictionaries
        cohort_list = []
        for _, row in cohorts.iterrows():
            cohort_list.append({
                'cohort_id': str(row[cohort_by]),
                'batch_count': int(row['batch_count']),
                'avg_days_in_batch': round(row['avg_days_in_batch'], 1),
                'avg_fcr': round(row['avg_fcr'], 2) if pd.notna(row['avg_fcr']) else None,
                'avg_adg_kg': round(row['avg_adg_kg'], 2) if pd.notna(row['avg_adg_kg']) else None,
                'avg_sgr_pct': round(row['avg_sgr_pct'], 2) if pd.notna(row['avg_sgr_pct']) else None,
                'survival_rate': round(row['survival_rate'] * 100, 1) if pd.notna(row['survival_rate']) else None,
                'total_feed_kg': round(row['total_feed_kg'], 2) if pd.notna(row['total_feed_kg']) else None,
                'total_weight_gain_kg': round(row['total_weight_gain_kg'], 2) if pd.notna(row['total_weight_gain_kg']) else None,
                'mortality_rate': round(row['mortality_rate'] * 100, 1) if pd.notna(row['mortality_rate']) else None,
                'performance_score': round(row['performance_score'], 2),
            })

        # Calculate summary statistics
        summary = self._calculate_summary(cohorts, cohort_list)

        return {
            'cohorts': cohort_list,
            'summary': summary,
        }

    def run_scenario(
        self,
        df: pd.DataFrame,
        scenario_type: str = 'feed_adjustment',
        parameters: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Run what-if scenario modeling

        Args:
            df: DataFrame with batch data
            scenario_type: Type of scenario
            parameters: Scenario parameters

        Returns:
            Dictionary with scenario results and recommendations
        """
        if parameters is None:
            parameters = {}

        # Prepare data
        df = self._prepare_data(df, 'batch_id')

        if df.empty:
            return {
                'results': [],
                'recommendations': ['No data available for scenario modeling'],
            }

        results = []
        recommendations = []

        if scenario_type == 'feed_adjustment':
            results, recommendations = self._feed_adjustment_scenario(df, parameters)
        elif scenario_type == 'fcr_target':
            results, recommendations = self._fcr_target_scenario(df, parameters)
        elif scenario_type == 'adg_target':
            results, recommendations = self._adg_target_scenario(df, parameters)
        else:
            raise ValueError(f"Unknown scenario type: {scenario_type}")

        return {
            'results': results,
            'recommendations': recommendations,
        }

    def _prepare_data(self, df: pd.DataFrame, cohort_by: str) -> pd.DataFrame:
        """Prepare data for cohort analysis"""
        # Ensure required columns exist
        required_cols = ['batch_id', 'batch_start_date', 'batch_end_date']
        for col in required_cols:
            if col not in df.columns:
                if 'batch_start_date' in df.columns and cohort_by == 'batch_start_date':
                    pass  # Already have batch_start_date
                else:
                    logger.warning(f"Column {col} not found in data")
                    df[col] = None

        # Calculate days in batch
        if 'batch_start_date' in df.columns and 'batch_end_date' in df.columns:
            df['batch_start_date'] = pd.to_datetime(df['batch_start_date'])
            df['batch_end_date'] = pd.to_datetime(df['batch_end_date'])
            df['days_in_batch'] = (
                df['batch_end_date'] - df['batch_start_date']
            ).dt.days

        # Ensure cohort column exists
        if cohort_by not in df.columns:
            logger.warning(f"Cohort column {cohort_by} not found, using batch_id")
            df[cohort_by] = df.get('batch_id', 'unknown')

        return df

    def _calculate_performance_score(self, cohorts: pd.DataFrame) -> pd.Series:
        """Calculate performance score for each cohort"""
        # Normalize metrics (0-100 scale)
        # FCR: Lower is better
        fcr_score = (
            (cohorts['avg_fcr'].max() - cohorts['avg_fcr'])
            / (cohorts['avg_fcr'].max() - cohorts['avg_fcr'].min())
            * 100
        ) if cohorts['avg_fcr'].notna().any() else 50

        # ADG: Higher is better
        adg_score = (
            (cohorts['avg_adg_kg'] - cohorts['avg_adg_kg'].min())
            / (cohorts['avg_adg_kg'].max() - cohorts['avg_adg_kg'].min())
            * 100
        ) if cohorts['avg_adg_kg'].notna().any() else 50

        # Survival: Higher is better
        survival_score = cohorts['survival_rate'] * 100 if cohorts['survival_rate'].notna().any() else 50

        # Weighted average score
        performance_score = (
            fcr_score * 0.4  # FCR is most important
            + adg_score * 0.3
            + survival_score * 0.3
        )

        return performance_score.fillna(50)

    def _calculate_summary(self, cohorts: pd.DataFrame, cohort_list: List[Dict]) -> Dict[str, Any]:
        """Calculate summary statistics"""
        return {
            'total_cohorts': len(cohort_list),
            'total_batches': cohorts['batch_count'].sum(),
            'avg_batches_per_cohort': round(cohorts['batch_count'].mean(), 1),
            'avg_fcr': round(cohorts['avg_fcr'].mean(), 2) if cohorts['avg_fcr'].notna().any() else None,
            'best_fcr': round(cohorts['avg_fcr'].min(), 2) if cohorts['avg_fcr'].notna().any() else None,
            'worst_fcr': round(cohorts['avg_fcr'].max(), 2) if cohorts['avg_fcr'].notna().any() else None,
            'avg_adg_kg': round(cohorts['avg_adg_kg'].mean(), 2) if cohorts['avg_adg_kg'].notna().any() else None,
            'best_adg_kg': round(cohorts['avg_adg_kg'].max(), 2) if cohorts['avg_adg_kg'].notna().any() else None,
            'worst_adg_kg': round(cohorts['avg_adg_kg'].min(), 2) if cohorts['avg_adg_kg'].notna().any() else None,
            'avg_survival_rate': round(cohorts['survival_rate'].mean() * 100, 1) if cohorts['survival_rate'].notna().any() else None,
            'best_survival_rate': round(cohorts['survival_rate'].max() * 100, 1) if cohorts['survival_rate'].notna().any() else None,
            'worst_survival_rate': round(cohorts['survival_rate'].min() * 100, 1) if cohorts['survival_rate'].notna().any() else None,
            'top_performing_cohort': cohort_list[0]['cohort_id'] if cohort_list else None,
        }

    def _feed_adjustment_scenario(self, df: pd.DataFrame, parameters: Dict[str, Any]) -> tuple:
        """Run feed adjustment scenario"""
        adjustment_pct = parameters.get('adjustment_pct', 10)  # Default 10% adjustment

        results = []
        recommendations = []

        for _, row in df.head(10).iterrows():  # Analyze top 10 batches
            original_fcr = row.get('avg_fcr')
            original_adg = row.get('avg_adg_kg')

            if pd.notna(original_fcr) and pd.notna(original_adg):
                # Calculate adjusted metrics
                adjusted_fcr = original_fcr * (1 + adjustment_pct / 100)
                adjusted_adg = original_adg * (1 + adjustment_pct / 100)

                results.append({
                    'batch_id': str(row.get('batch_id', 'unknown')),
                    'scenario': 'feed_adjustment',
                    'adjustment_pct': adjustment_pct,
                    'original_fcr': round(original_fcr, 2),
                    'adjusted_fcr': round(adjusted_fcr, 2),
                    'fcr_change_pct': round(adjusted_fcr / original_fcr * 100 - 100, 1),
                    'original_adg_kg': round(original_adg, 2),
                    'adjusted_adg_kg': round(adjusted_adg, 2),
                    'adg_change_pct': round(adjusted_adg / original_adg * 100 - 100, 1),
                })

        recommendations = [
            f"Feed adjustment of {adjustment_pct}% would change FCR by approximately {adjustment_pct}%",
            "Monitor animal health closely during feed adjustments",
            "Gradual feed changes are recommended over sudden changes",
        ]

        return results, recommendations

    def _fcr_target_scenario(self, df: pd.DataFrame, parameters: Dict[str, Any]) -> tuple:
        """Run FCR target scenario"""
        target_fcr = parameters.get('target_fcr', 1.8)

        results = []
        recommendations = []

        for _, row in df.head(10).iterrows():
            current_fcr = row.get('avg_fcr')
            current_adg = row.get('avg_adg_kg')

            if pd.notna(current_fcr) and pd.notna(current_adg):
                # Calculate required feed adjustment
                feed_adjustment_pct = (target_fcr / current_fcr - 1) * 100
                projected_adg = current_adg * (current_fcr / target_fcr)

                results.append({
                    'batch_id': str(row.get('batch_id', 'unknown')),
                    'scenario': 'fcr_target',
                    'target_fcr': target_fcr,
                    'current_fcr': round(current_fcr, 2),
                    'required_feed_adjustment_pct': round(feed_adjustment_pct, 1),
                    'current_adg_kg': round(current_adg, 2),
                    'projected_adg_kg': round(projected_adg, 2),
                    'adg_improvement_pct': round(projected_adg / current_adg * 100 - 100, 1),
                })

        recommendations = [
            f"To achieve FCR target of {target_fcr}, consider adjusting feed by approximately {round(feed_adjustment_pct, 1)}%",
            "Review feed composition and timing",
            "Monitor environmental factors affecting feed efficiency",
        ]

        return results, recommendations

    def _adg_target_scenario(self, df: pd.DataFrame, parameters: Dict[str, Any]) -> tuple:
        """Run ADG target scenario"""
        target_adg_g = parameters.get('target_adg_g', 30)  # Default 30g

        results = []
        recommendations = []

        for _, row in df.head(10).iterrows():
            current_adg = row.get('avg_adg_kg')
            current_fcr = row.get('avg_fcr')

            if pd.notna(current_adg) and pd.notna(current_fcr):
                # Calculate required feed adjustment
                feed_adjustment_pct = (target_adg_g / current_adg - 1) * 100
                projected_fcr = current_fcr / (target_adg_g / current_adg)

                results.append({
                    'batch_id': str(row.get('batch_id', 'unknown')),
                    'scenario': 'adg_target',
                    'target_adg_g': target_adg_g,
                    'current_adg_kg': round(current_adg, 2),
                    'required_feed_adjustment_pct': round(feed_adjustment_pct, 1),
                    'current_fcr': round(current_fcr, 2),
                    'projected_fcr': round(projected_fcr, 2),
                    'fcr_change_pct': round(projected_fcr / current_fcr * 100 - 100, 1),
                })

        recommendations = [
            f"To achieve ADG target of {target_adg_g}g, consider adjusting feed by approximately {round(feed_adjustment_pct, 1)}%",
            "Ensure adequate nutrition for target growth rates",
            "Monitor animal health and stress levels",
        ]

        return results, recommendations
