"""
Forecasting module using statsforecast and Prophet
Supports multiple forecasting methods
"""

import logging
from typing import Any, Dict, List
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from statsforecast import StatsForecast
from statsforecast.models import (
    AutoARIMA,
    AutoETS,
    AutoTheta,
    Naive,
    SeasonalNaive,
)
from prophet import Prophet

logger = logging.getLogger(__name__)


class Forecaster:
    """Time series forecaster for FarmIQ metrics"""

    def __init__(self):
        self.models = {
            'auto_arima': AutoARIMA(season_length=7),
            'auto_ets': AutoETS(season_length=7),
            'auto_theta': AutoTheta(season_length=7),
            'naive': Naive(),
            'seasonal_naive': SeasonalNaive(season_length=7),
        }

    def forecast(
        self,
        df: pd.DataFrame,
        metric: str,
        horizon_days: int = 7,
        method: str = 'auto',
    ) -> Dict[str, Any]:
        """
        Generate forecast for specified metric

        Args:
            df: DataFrame with date and value columns
            metric: Metric name
            horizon_days: Forecast horizon in days
            method: Forecast method ('auto', 'prophet', 'stats')

        Returns:
            Dictionary with forecast, confidence intervals, and model info
        """
        # Prepare data
        df = self._prepare_data(df, metric)

        if len(df) < 14:
            logger.warning(f"Insufficient data for forecasting: {len(df)} points")
            return self._naive_forecast(df, horizon_days)

        try:
            if method == 'prophet':
                return self._prophet_forecast(df, metric, horizon_days)
            elif method == 'stats':
                return self._stats_forecast(df, metric, horizon_days)
            else:  # auto
                # Try statsforecast first, fall back to Prophet
                try:
                    return self._stats_forecast(df, metric, horizon_days)
                except Exception as e:
                    logger.warning(f"Statsforecast failed, trying Prophet: {e}")
                    return self._prophet_forecast(df, metric, horizon_days)

        except Exception as e:
            logger.error(f"Forecasting failed: {e}")
            return self._naive_forecast(df, horizon_days)

    def _prepare_data(self, df: pd.DataFrame, metric: str) -> pd.DataFrame:
        """Prepare data for forecasting"""
        # Ensure date column is datetime
        if 'date' in df.columns:
            df['ds'] = pd.to_datetime(df['date'])
        elif 'kpi_date' in df.columns:
            df['ds'] = pd.to_datetime(df['kpi_date'])

        # Get value column based on metric
        value_col = self._get_value_column(metric)
        if value_col not in df.columns:
            raise ValueError(f"Value column {value_col} not found in data")

        # Remove null values
        df = df[['ds', value_col]].dropna()
        df = df.rename(columns={value_col: 'y'})

        # Sort by date
        df = df.sort_values('ds').reset_index(drop=True)

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
        }
        return mapping.get(metric, metric)

    def _stats_forecast(
        self,
        df: pd.DataFrame,
        metric: str,
        horizon_days: int,
    ) -> Dict[str, Any]:
        """Forecast using statsforecast"""
        # Prepare data for statsforecast
        df_stats = df.copy()
        df_stats['unique_id'] = '1'

        # Create forecaster
        sf = StatsForecast(
            models=list(self.models.values()),
            freq='D',
            n_jobs=-1,
        )

        # Fit and predict
        forecast_df = sf.forecast(df=df_stats, h=horizon_days)

        # Extract forecast
        forecast_list = []
        lower_list = []
        upper_list = []

        for _, row in forecast_df.iterrows():
            forecast_list.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'value': row.get('AutoARIMA', row.get('mean', 0)),
            })
            lower_list.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'value': row.get('AutoARIMA-lo-80', row.get('lo-80', 0)),
            })
            upper_list.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'value': row.get('AutoARIMA-hi-80', row.get('hi-80', 0)),
            })

        return {
            'forecast': forecast_list,
            'confidence_intervals': [
                {'level': 80, 'lower': lower_list, 'upper': upper_list}
            ],
            'model_info': {
                'method': 'statsforecast',
                'models_used': list(self.models.keys()),
                'data_points': len(df),
                'horizon_days': horizon_days,
            },
        }

    def _prophet_forecast(
        self,
        df: pd.DataFrame,
        metric: str,
        horizon_days: int,
    ) -> Dict[str, Any]:
        """Forecast using Prophet"""
        # Create Prophet model
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,  # Not enough data for yearly
            uncertainty_samples=1000,
        )

        # Fit model
        model.fit(df)

        # Create future dataframe
        future = model.make_future_dataframe(periods=horizon_days)

        # Make prediction
        forecast = model.predict(future)

        # Extract forecast
        forecast_list = []
        lower_list = []
        upper_list = []

        for _, row in forecast.tail(horizon_days).iterrows():
            forecast_list.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'value': row['yhat'],
            })
            lower_list.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'value': row['yhat_lower'],
            })
            upper_list.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'value': row['yhat_upper'],
            })

        return {
            'forecast': forecast_list,
            'confidence_intervals': [
                {'level': 80, 'lower': lower_list, 'upper': upper_list}
            ],
            'model_info': {
                'method': 'prophet',
                'data_points': len(df),
                'horizon_days': horizon_days,
                'seasonality': 'daily,weekly',
            },
        }

    def _naive_forecast(
        self,
        df: pd.DataFrame,
        horizon_days: int,
    ) -> Dict[str, Any]:
        """Naive forecast using last value"""
        last_value = df['y'].iloc[-1]
        last_date = df['ds'].iloc[-1]

        forecast_list = []
        lower_list = []
        upper_list = []

        for i in range(1, horizon_days + 1):
            forecast_date = last_date + timedelta(days=i)
            forecast_list.append({
                'date': forecast_date.strftime('%Y-%m-%d'),
                'value': last_value,
            })
            # Simple confidence interval (+/- 10%)
            lower_list.append({
                'date': forecast_date.strftime('%Y-%m-%d'),
                'value': last_value * 0.9,
            })
            upper_list.append({
                'date': forecast_date.strftime('%Y-%m-%d'),
                'value': last_value * 1.1,
            })

        return {
            'forecast': forecast_list,
            'confidence_intervals': [
                {'level': 80, 'lower': lower_list, 'upper': upper_list}
            ],
            'model_info': {
                'method': 'naive',
                'data_points': len(df),
                'horizon_days': horizon_days,
                'note': 'Insufficient data for advanced forecasting',
            },
        }
