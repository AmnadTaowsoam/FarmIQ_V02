"""Database connection and queries for Advanced Analytics Service"""

import logging
from typing import List, Optional

import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import pandas as pd

from app.config import Settings

logger = logging.getLogger(__name__)


class AnalyticsDb:
    """Database connection for analytics data"""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self._engine = None
        self._session_factory = None
        self._pool = None

    async def connect(self):
        """Create database connection pool"""
        self._pool = await asyncpg.create_pool(self.database_url)
        logger.info("Database connection pool created")

    async def close(self):
        """Close database connection pool"""
        if self._pool:
            await self._pool.close()
            logger.info("Database connection pool closed")

    async def ping(self) -> bool:
        """Check database connectivity"""
        try:
            async with self._pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database ping failed: {e}")
            return False

    async def get_kpi_history(
        self,
        tenant_id: str,
        farm_id: Optional[str] = None,
        barn_id: str = None,
        batch_id: Optional[str] = None,
        metric: str = "all",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> pd.DataFrame:
        """Fetch KPI history from database"""
        query = """
            SELECT
                tenant_id,
                farm_id,
                barn_id,
                batch_id,
                kpi_date as date,
                animal_count,
                avg_weight_kg,
                biomass_kg,
                total_feed_kg,
                fcr,
                adg_kg,
                sgr_pct,
                weight_gain_kg
            FROM fact_daily_kpi
            WHERE tenant_id = $1
        """
        params = [tenant_id]
        param_idx = 2

        if farm_id:
            query += f" AND farm_id = ${param_idx}"
            params.append(farm_id)
            param_idx += 1

        if barn_id:
            query += f" AND barn_id = ${param_idx}"
            params.append(barn_id)
            param_idx += 1

        if batch_id:
            query += f" AND batch_id = ${param_idx}"
            params.append(batch_id)
            param_idx += 1

        if start_date:
            query += f" AND kpi_date >= ${param_idx}"
            params.append(start_date)
            param_idx += 1

        if end_date:
            query += f" AND kpi_date <= ${param_idx}"
            params.append(end_date)
            param_idx += 1

        query += " ORDER BY kpi_date ASC"

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame([dict(row) for row in rows])

        # Filter by metric if specified
        if metric != "all":
            value_col = self._get_value_column(metric)
            if value_col in df.columns:
                df = df[['date', value_col]].dropna(subset=[value_col])
            else:
                return pd.DataFrame()

        return df

    async def get_cohort_data(
        self,
        tenant_id: str,
        farm_id: Optional[str] = None,
        barn_id: Optional[str] = None,
        cohort_by: str = "batch_start_date",
    ) -> pd.DataFrame:
        """Fetch cohort data from database"""
        query = """
            SELECT
                tenant_id,
                farm_id,
                barn_id,
                batch_id,
                batch_start_date,
                batch_end_date,
                days_in_batch,
                avg_fcr,
                avg_adg_kg,
                avg_sgr_pct,
                survival_rate,
                total_feed_kg,
                total_weight_gain_kg,
                mortality_rate
            FROM fact_batch_cohort
            WHERE tenant_id = $1
        """
        params = [tenant_id]
        param_idx = 2

        if farm_id:
            query += f" AND farm_id = ${param_idx}"
            params.append(farm_id)
            param_idx += 1

        if barn_id:
            query += f" AND barn_id = ${param_idx}"
            params.append(barn_id)
            param_idx += 1

        query += " ORDER BY batch_start_date DESC"

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        if not rows:
            return pd.DataFrame()

        return pd.DataFrame([dict(row) for row in rows])

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
