from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Optional

import httpx

from app.config import Settings
from app.db import AnalyticsDb

logger = logging.getLogger(__name__)


class FeedingKpiService:
    def __init__(self, db: AnalyticsDb, settings: Settings):
        self.db = db
        self.settings = settings
        self.feed_service_url = settings.feed_service_url or "http://cloud-feed-service:5130"
        self.barn_records_service_url = settings.barn_records_service_url or "http://cloud-barn-records-service:3000"
        self.weighvision_readmodel_url = settings.weighvision_readmodel_url or "http://cloud-weighvision-readmodel:3000"

    async def get_weight_aggregates(
        self,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        start: date,
        end: date,
    ) -> dict[date, dict[str, Any]]:
        """Fetch weight aggregates from weighvision-readmodel or barn-records fallback."""
        result: dict[date, dict[str, Any]] = {}

        # Try weighvision-readmodel first
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                params = {
                    "tenant_id": tenant_id,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                }
                if farm_id:
                    params["farm_id"] = farm_id
                if barn_id:
                    params["barn_id"] = barn_id
                if batch_id:
                    params["batch_id"] = batch_id

                resp = await client.get(
                    f"{self.weighvision_readmodel_url}/api/v1/weighvision/weight-aggregates",
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and "items" in data:
                        for item in data["items"]:
                            date_str = item.get("date") or item.get("record_date")
                            if not date_str:
                                continue
                            try:
                                record_date = datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
                            except (ValueError, AttributeError):
                                # Try parsing as date string directly
                                from datetime import datetime as dt
                                try:
                                    record_date = dt.strptime(date_str, "%Y-%m-%d").date()
                                except ValueError:
                                    continue
                            result[record_date] = {
                                "avg_weight_kg": item.get("avg_weight_kg"),
                                "p10": item.get("p10") or item.get("p10_weight_kg"),
                                "p50": item.get("p50") or item.get("p50_weight_kg"),
                                "p90": item.get("p90") or item.get("p90_weight_kg"),
                                "sample_count": item.get("sample_count", 0),
                                "quality_pass_rate": item.get("quality_pass_rate", 1.0),
                                "source": "weighvision",
                            }
                    return result
        except Exception as e:
            logger.warning(f"Failed to fetch from weighvision-readmodel: {e}")

        # Fallback to barn-records daily counts
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                params = {
                    "tenant_id": tenant_id,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                }
                if farm_id:
                    params["farm_id"] = farm_id
                if barn_id:
                    params["barn_id"] = barn_id
                if batch_id:
                    params["batch_id"] = batch_id

                resp = await client.get(
                    f"{self.barn_records_service_url}/api/v1/barn-records/daily-counts",
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and "items" in data:
                        for item in data["items"]:
                            date_str = item.get("recordDate") or item.get("record_date")
                            if not date_str:
                                continue
                            try:
                                record_date = datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
                            except (ValueError, AttributeError):
                                # Try parsing as date string directly
                                from datetime import datetime as dt
                                try:
                                    record_date = dt.strptime(date_str, "%Y-%m-%d").date()
                                except ValueError:
                                    continue
                            if record_date not in result:
                                result[record_date] = {
                                    "avg_weight_kg": item.get("averageWeightKg") or item.get("avg_weight_kg"),
                                    "source": "barn_records",
                                }
        except Exception as e:
            logger.warning(f"Failed to fetch from barn-records: {e}")

        return result

    async def get_feed_intake(
        self,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        start: date,
        end: date,
    ) -> dict[date, float]:
        """Fetch feed intake records and aggregate by date."""
        result: dict[date, float] = {}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                params = {
                    "tenantId": tenant_id,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                }
                if farm_id:
                    params["farmId"] = farm_id
                if barn_id:
                    params["barnId"] = barn_id
                if batch_id:
                    params["batchId"] = batch_id

                resp = await client.get(
                    f"{self.feed_service_url}/api/v1/feed/intake-records",
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and "items" in data:
                        for item in data["items"]:
                            occurred_at_str = item.get("occurredAt") or item.get("occurred_at")
                            if not occurred_at_str:
                                continue
                            try:
                                occurred_at = datetime.fromisoformat(occurred_at_str.replace("Z", "+00:00"))
                                record_date = occurred_at.date()
                            except (ValueError, AttributeError):
                                continue
                            quantity_kg = float(item.get("quantityKg") or item.get("quantity_kg") or 0)
                            result[record_date] = result.get(record_date, 0) + quantity_kg
        except Exception as e:
            logger.warning(f"Failed to fetch feed intake: {e}")

        return result

    async def get_daily_counts(
        self,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        start: date,
        end: date,
    ) -> dict[date, dict[str, Any]]:
        """Fetch daily counts (animal count, mortality, etc.) from barn-records."""
        result: dict[date, dict[str, Any]] = {}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                params = {
                    "tenant_id": tenant_id,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                }
                if farm_id:
                    params["farm_id"] = farm_id
                if barn_id:
                    params["barn_id"] = barn_id
                if batch_id:
                    params["batch_id"] = batch_id

                resp = await client.get(
                    f"{self.barn_records_service_url}/api/v1/barn-records/daily-counts",
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and "items" in data:
                        for item in data["items"]:
                            date_str = item.get("recordDate") or item.get("record_date")
                            if not date_str:
                                continue
                            try:
                                record_date = datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
                            except (ValueError, AttributeError):
                                # Try parsing as date string directly
                                from datetime import datetime as dt
                                try:
                                    record_date = dt.strptime(date_str, "%Y-%m-%d").date()
                                except ValueError:
                                    continue
                            result[record_date] = {
                                "animal_count": item.get("animalCount") or item.get("animal_count"),
                                "mortality_count": item.get("mortalityCount") or item.get("mortality_count") or 0,
                                "cull_count": item.get("cullCount") or item.get("cull_count") or 0,
                            }
        except Exception as e:
            logger.warning(f"Failed to fetch daily counts: {e}")

        return result

    async def compute_kpi_for_date(
        self,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        target_date: date,
        weight_data: dict[date, dict[str, Any]],
        feed_data: dict[date, float],
        daily_counts: dict[date, dict[str, Any]],
    ) -> Optional[dict[str, Any]]:
        """Compute KPI for a single date."""
        weight_info = weight_data.get(target_date, {})
        feed_kg = feed_data.get(target_date, 0)
        counts = daily_counts.get(target_date, {})

        animal_count = counts.get("animal_count")
        avg_weight_kg = weight_info.get("avg_weight_kg")

        if not animal_count or animal_count <= 0:
            return None

        if not avg_weight_kg or avg_weight_kg <= 0:
            avg_weight_kg = None

        # Compute biomass
        biomass_kg = None
        if avg_weight_kg and animal_count:
            biomass_kg = avg_weight_kg * animal_count

        # Compute weight gain (need previous day)
        weight_gain_kg = None
        from datetime import timedelta
        prev_date = target_date - timedelta(days=1)
        if prev_date:
            prev_weight = weight_data.get(prev_date, {}).get("avg_weight_kg")
            if prev_weight and avg_weight_kg:
                prev_biomass = prev_weight * animal_count
                if biomass_kg:
                    weight_gain_kg = biomass_kg - prev_biomass

        # Compute FCR
        fcr = None
        if weight_gain_kg and weight_gain_kg > 0 and feed_kg > 0:
            fcr = feed_kg / weight_gain_kg

        # Compute ADG (Average Daily Gain) in grams
        adg_kg = None
        if weight_gain_kg and animal_count:
            adg_kg = (weight_gain_kg / animal_count) * 1000  # Convert to grams

        # Compute SGR (Specific Growth Rate) in percent
        sgr_pct = None
        if avg_weight_kg and prev_weight and prev_weight > 0:
            import math

            days = 1
            sgr_pct = ((math.log(avg_weight_kg) - math.log(prev_weight)) / days) * 100

        # Flags
        intake_missing_flag = feed_kg == 0
        weight_missing_flag = avg_weight_kg is None
        quality_flag = not (intake_missing_flag or weight_missing_flag)

        return {
            "tenant_id": tenant_id,
            "farm_id": farm_id,
            "barn_id": barn_id,
            "batch_id": batch_id,
            "date": target_date,
            "animal_count": animal_count,
            "avg_weight_kg": avg_weight_kg,
            "biomass_kg": biomass_kg,
            "weight_gain_kg": weight_gain_kg,
            "total_feed_kg": feed_kg,
            "fcr": fcr,
            "adg_kg": adg_kg,
            "sgr_pct": sgr_pct,
            "intake_missing_flag": intake_missing_flag,
            "weight_missing_flag": weight_missing_flag,
            "quality_flag": quality_flag,
        }

    async def upsert_kpi(self, kpi_data: dict[str, Any]) -> None:
        """Upsert KPI record into feeding_kpi_daily table."""
        assert self.db._pool is not None
        async with self.db._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO feeding_kpi_daily (
                  tenant_id, farm_id, barn_id, batch_id, date,
                  animal_count, avg_weight_kg, biomass_kg, weight_gain_kg,
                  total_feed_kg, fcr, adg_kg, sgr_pct,
                  intake_missing_flag, weight_missing_flag, quality_flag,
                  updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
                ON CONFLICT (tenant_id, barn_id, batch_id, date) DO UPDATE
                SET
                  animal_count = EXCLUDED.animal_count,
                  avg_weight_kg = EXCLUDED.avg_weight_kg,
                  biomass_kg = EXCLUDED.biomass_kg,
                  weight_gain_kg = EXCLUDED.weight_gain_kg,
                  total_feed_kg = EXCLUDED.total_feed_kg,
                  fcr = EXCLUDED.fcr,
                  adg_kg = EXCLUDED.adg_kg,
                  sgr_pct = EXCLUDED.sgr_pct,
                  intake_missing_flag = EXCLUDED.intake_missing_flag,
                  weight_missing_flag = EXCLUDED.weight_missing_flag,
                  quality_flag = EXCLUDED.quality_flag,
                  updated_at = now()
                """,
                kpi_data["tenant_id"],
                kpi_data["farm_id"],
                kpi_data["barn_id"],
                kpi_data["batch_id"],
                kpi_data["date"],
                kpi_data["animal_count"],
                kpi_data["avg_weight_kg"],
                kpi_data["biomass_kg"],
                kpi_data["weight_gain_kg"],
                kpi_data["total_feed_kg"],
                kpi_data["fcr"],
                kpi_data["adg_kg"],
                kpi_data["sgr_pct"],
                kpi_data["intake_missing_flag"],
                kpi_data["weight_missing_flag"],
                kpi_data["quality_flag"],
            )

    async def get_kpi_series(
        self,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        start: date,
        end: date,
    ) -> list[dict[str, Any]]:
        """Get KPI series from materialized table."""
        assert self.db._pool is not None
        where = ["tenant_id = $1", "barn_id = $2", "date >= $3", "date <= $4"]
        args: list[Any] = [tenant_id, barn_id, start, end]
        idx = 5

        if farm_id:
            where.append(f"farm_id = ${idx}")
            args.append(farm_id)
            idx += 1
        if batch_id:
            where.append(f"batch_id = ${idx}")
            args.append(batch_id)
            idx += 1

        sql = f"""
          SELECT
            date, animal_count, avg_weight_kg, biomass_kg, weight_gain_kg,
            total_feed_kg, fcr, adg_kg, sgr_pct,
            intake_missing_flag, weight_missing_flag, quality_flag
          FROM feeding_kpi_daily
          WHERE {" AND ".join(where)}
          ORDER BY date ASC
        """

        async with self.db._pool.acquire() as conn:
            rows = await conn.fetch(sql, *args)

        return [
            {
                "recordDate": str(row["date"]),
                "animalCount": row["animal_count"],
                "avgWeightKg": row["avg_weight_kg"],
                "biomassKg": row["biomass_kg"],
                "weightGainKg": row["weight_gain_kg"],
                "totalFeedKg": row["total_feed_kg"],
                "fcr": row["fcr"],
                "adgG": row["adg_kg"],
                "sgrPct": row["sgr_pct"],
                "intakeMissingFlag": row["intake_missing_flag"],
                "weightMissingFlag": row["weight_missing_flag"],
                "qualityFlag": row["quality_flag"],
            }
            for row in rows
        ]

