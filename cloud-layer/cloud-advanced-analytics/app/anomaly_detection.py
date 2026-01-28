"""
Anomaly detection module
Supports Z-score, IQR, and Isolation Forest methods
"""

import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from scipy import stats

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """Anomaly detector for FarmIQ metrics"""

    def __init__(self):
        self.methods = {
            'zscore': self._detect_zscore,
            'iqr': self._detect_iqr,
            'isolation_forest': self._detect_isolation_forest,
        }

    def detect(
        self,
        df: pd.DataFrame,
        metric: str,
        method: str = 'zscore',
        threshold: float = 3.0,
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalies in time series data

        Args:
            df: DataFrame with date and value columns
            metric: Metric name
            method: Detection method ('zscore', 'iqr', 'isolation_forest')
            threshold: Threshold for anomaly detection

        Returns:
            List of anomaly records
        """
        # Prepare data
        df = self._prepare_data(df, metric)

        if len(df) < 10:
            logger.warning(f"Insufficient data for anomaly detection: {len(df)} points")
            return []

        try:
            detect_fn = self.methods.get(method, self._detect_zscore)
            anomalies = detect_fn(df, threshold)

            logger.info(
                f"Detected {len(anomalies)} anomalies using {method}",
                extra={"metric": metric, "method": method},
            )

            return anomalies

        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
            return []

    def _prepare_data(self, df: pd.DataFrame, metric: str) -> pd.DataFrame:
        """Prepare data for anomaly detection"""
        # Ensure date column is datetime
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
        elif 'kpi_date' in df.columns:
            df['date'] = pd.to_datetime(df['kpi_date'])

        # Get value column based on metric
        value_col = self._get_value_column(metric)
        if value_col not in df.columns:
            raise ValueError(f"Value column {value_col} not found in data")

        # Remove null values
        df = df[['date', value_col]].dropna().copy()
        df = df.rename(columns={value_col: 'value'})

        # Sort by date
        df = df.sort_values('date').reset_index(drop=True)

        return df

    def _get_value_column(self, metric: str) -> str:
        """Map metric to value column"""
        mapping = {
            'weight': 'avg_weight_kg',
            'fcr': 'fcr',
            'adg': 'adg_kg',
            'sgr': 'sgr_pct',
            'feed': 'total_feed_kg',
            'biomass': 'biomass_kg',
            'temperature': 'avg_value',
            'humidity': 'avg_value',
        }
        return mapping.get(metric, metric)

    def _detect_zscore(
        self,
        df: pd.DataFrame,
        threshold: float = 3.0,
    ) -> List[Dict[str, Any]]:
        """Detect anomalies using Z-score method"""
        # Calculate Z-scores
        mean = df['value'].mean()
        std = df['value'].std()

        if std == 0:
            return []

        df['zscore'] = (df['value'] - mean) / std

        # Find anomalies
        anomalies = df[np.abs(df['zscore']) > threshold]

        return [
            {
                'date': row['date'].strftime('%Y-%m-%d'),
                'value': row['value'],
                'zscore': row['zscore'],
                'severity': 'high' if abs(row['zscore']) > threshold * 1.5 else 'medium',
                'method': 'zscore',
            }
            for _, row in anomalies.iterrows()
        ]

    def _detect_iqr(
        self,
        df: pd.DataFrame,
        threshold: float = 1.5,
    ) -> List[Dict[str, Any]]:
        """Detect anomalies using IQR method"""
        # Calculate IQR
        Q1 = df['value'].quantile(0.25)
        Q3 = df['value'].quantile(0.75)
        IQR = Q3 - Q1

        if IQR == 0:
            return []

        # Define bounds
        lower_bound = Q1 - threshold * IQR
        upper_bound = Q3 + threshold * IQR

        # Find anomalies
        anomalies = df[
            (df['value'] < lower_bound) | (df['value'] > upper_bound)
        ]

        return [
            {
                'date': row['date'].strftime('%Y-%m-%d'),
                'value': row['value'],
                'lower_bound': lower_bound,
                'upper_bound': upper_bound,
                'deviation': row['value'] - df['value'].mean(),
                'severity': 'high' if abs(row['value'] - df['value'].mean()) > 2 * IQR else 'medium',
                'method': 'iqr',
            }
            for _, row in anomalies.iterrows()
        ]

    def _detect_isolation_forest(
        self,
        df: pd.DataFrame,
        threshold: float = 0.1,
    ) -> List[Dict[str, Any]]:
        """Detect anomalies using Isolation Forest"""
        # Prepare features
        X = df[['value']].values

        # Create time-based features
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['rolling_mean_7'] = df['value'].rolling(window=7, min_periods=1).mean()
        df['rolling_std_7'] = df['value'].rolling(window=7, min_periods=1).std()

        # Fill NaN values
        df = df.fillna(method='ffill').fillna(method='bfill')

        # Prepare features
        features = [
            'value',
            'day_of_week',
            'day_of_month',
            'rolling_mean_7',
            'rolling_std_7',
        ]
        X = df[features].values

        # Fit Isolation Forest
        iso_forest = IsolationForest(
            contamination=threshold,
            random_state=42,
            n_estimators=100,
        )
        df['anomaly_score'] = iso_forest.fit_predict(X)
        df['anomaly'] = iso_forest.decision_function(X)

        # Find anomalies (anomaly_score == -1)
        anomalies = df[df['anomaly_score'] == -1]

        return [
            {
                'date': row['date'].strftime('%Y-%m-%d'),
                'value': row['value'],
                'anomaly_score': row['anomaly'],
                'rolling_mean': row['rolling_mean_7'],
                'severity': 'high' if row['anomaly'] < -0.15 else 'medium',
                'method': 'isolation_forest',
            }
            for _, row in anomalies.iterrows()
        ]

    def detect_drift(
        self,
        df: pd.DataFrame,
        metric: str,
        window_size: int = 30,
    ) -> Dict[str, Any]:
        """
        Detect data drift using statistical tests

        Args:
            df: DataFrame with date and value columns
            metric: Metric name
            window_size: Size of rolling window for comparison

        Returns:
            Dictionary with drift detection results
        """
        df = self._prepare_data(df, metric)

        if len(df) < window_size * 2:
            return {
                'drift_detected': False,
                'reason': 'Insufficient data for drift detection',
            }

        # Split into reference and current windows
        reference = df.iloc[-(window_size * 2) : -window_size]
        current = df.iloc[-window_size:]

        # Perform KS test
        ks_statistic, ks_pvalue = stats.ks_2samp(
            reference['value'],
            current['value'],
        )

        # Perform Mann-Whitney U test
        u_statistic, u_pvalue = stats.mannwhitneyu(
            reference['value'],
            current['value'],
            alternative='two-sided',
        )

        # Determine if drift detected
        drift_detected = ks_pvalue < 0.05 or u_pvalue < 0.05

        return {
            'drift_detected': drift_detected,
            'ks_statistic': ks_statistic,
            'ks_pvalue': ks_pvalue,
            'u_statistic': u_statistic,
            'u_pvalue': u_pvalue,
            'reference_mean': reference['value'].mean(),
            'current_mean': current['value'].mean(),
            'mean_change_pct': (
                (current['value'].mean() - reference['value'].mean())
                / reference['value'].mean() * 100
                if reference['value'].mean() != 0
                else 0
            ),
            'reason': (
                'Statistical significant change detected'
                if drift_detected
                else 'No significant drift detected'
            ),
        }
