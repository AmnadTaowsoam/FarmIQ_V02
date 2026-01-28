from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import asyncpg

logger = logging.getLogger(__name__)


class InMemoryMlModelDb:
    def __init__(self):
        self._models: dict[str, dict[str, Any]] = {}
        self._deployments: dict[str, dict[str, Any]] = {}
        self._trainings: dict[str, dict[str, Any]] = {}

    async def connect(self) -> None:
        return None

    async def close(self) -> None:
        return None

    async def ping(self) -> bool:
        return True

    async def ensure_schema(self) -> None:
        return None

    # Model operations
    async def create_model(self, **kwargs) -> None:  # type: ignore[no-untyped-def]
        created_at = kwargs.get("created_at") or datetime.now(tz=timezone.utc)
        row = {
            "id": kwargs["id"],
            "tenant_id": kwargs["tenant_id"],
            "name": kwargs["name"],
            "type": kwargs["type"],
            "description": kwargs["description"],
            "algorithm": kwargs["algorithm"],
            "hyperparameters": kwargs.get("hyperparameters", []),
            "features": kwargs.get("features", []),
            "target_variable": kwargs["target_variable"],
            "status": kwargs.get("status", "draft"),
            "metrics": kwargs.get("metrics", []),
            "metadata": kwargs.get("metadata", {}),
            "training_data_start": kwargs.get("training_data_start"),
            "training_data_end": kwargs.get("training_data_end"),
            "trained_at": kwargs.get("trained_at"),
            "created_at": created_at,
            "updated_at": kwargs.get("updated_at", created_at),
        }
        self._models[row["id"]] = row

    async def get_model(self, *, model_id: str) -> Optional[dict[str, Any]]:
        return self._models.get(model_id)

    async def list_models(
        self,
        *,
        tenant_id: str,
        model_type: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict[str, Any]], int]:
        page = max(1, page)
        limit = max(1, min(limit, 100))
        items = [
            m
            for m in self._models.values()
            if m["tenant_id"] == tenant_id
            and (model_type is None or m["type"] == model_type)
            and (status is None or m["status"] == status)
        ]
        items.sort(key=lambda x: x["created_at"], reverse=True)
        total = len(items)
        offset = (page - 1) * limit
        slice_ = items[offset : offset + limit]
        return slice_, total

    async def update_model(self, *, model_id: str, **kwargs) -> Optional[dict[str, Any]]:
        if model_id not in self._models:
            return None
        model = self._models[model_id]
        for key, value in kwargs.items():
            if value is not None:
                model[key] = value
        model["updated_at"] = datetime.now(tz=timezone.utc)
        return model

    async def delete_model(self, *, model_id: str) -> bool:
        if model_id not in self._models:
            return False
        del self._models[model_id]
        return True

    # Deployment operations
    async def create_deployment(self, **kwargs) -> None:  # type: ignore[no-untyped-def]
        created_at = kwargs.get("created_at") or datetime.now(tz=timezone.utc)
        row = {
            "id": kwargs["id"],
            "tenant_id": kwargs["tenant_id"],
            "model_id": kwargs["model_id"],
            "model_name": kwargs.get("model_name", ""),
            "environment": kwargs["environment"],
            "config": kwargs.get("config", {}),
            "status": kwargs.get("status", "pending"),
            "description": kwargs.get("description"),
            "endpoint_url": kwargs.get("endpoint_url"),
            "deployed_at": kwargs.get("deployed_at"),
            "stopped_at": kwargs.get("stopped_at"),
            "created_at": created_at,
            "updated_at": kwargs.get("updated_at", created_at),
        }
        self._deployments[row["id"]] = row

    async def get_deployment(self, *, deployment_id: str) -> Optional[dict[str, Any]]:
        return self._deployments.get(deployment_id)

    async def list_deployments(
        self,
        *,
        tenant_id: str,
        model_id: Optional[str] = None,
        environment: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict[str, Any]], int]:
        page = max(1, page)
        limit = max(1, min(limit, 100))
        items = [
            d
            for d in self._deployments.values()
            if d["tenant_id"] == tenant_id
            and (model_id is None or d["model_id"] == model_id)
            and (environment is None or d["environment"] == environment)
        ]
        items.sort(key=lambda x: x["created_at"], reverse=True)
        total = len(items)
        offset = (page - 1) * limit
        slice_ = items[offset : offset + limit]
        return slice_, total

    async def update_deployment(self, *, deployment_id: str, **kwargs) -> Optional[dict[str, Any]]:
        if deployment_id not in self._deployments:
            return None
        deployment = self._deployments[deployment_id]
        for key, value in kwargs.items():
            if value is not None:
                deployment[key] = value
        deployment["updated_at"] = datetime.now(tz=timezone.utc)
        return deployment

    async def delete_deployment(self, *, deployment_id: str) -> bool:
        if deployment_id not in self._deployments:
            return False
        del self._deployments[deployment_id]
        return True

    # Training operations
    async def create_training(self, **kwargs) -> None:  # type: ignore[no-untyped-def]
        created_at = kwargs.get("created_at") or datetime.now(tz=timezone.utc)
        row = {
            "id": kwargs["id"],
            "model_id": kwargs["model_id"],
            "tenant_id": kwargs["tenant_id"],
            "training_data_start": kwargs["training_data_start"],
            "training_data_end": kwargs["training_data_end"],
            "validation_split": kwargs.get("validation_split", 0.2),
            "hyperparameters": kwargs.get("hyperparameters", []),
            "status": kwargs.get("status", "queued"),
            "started_at": kwargs.get("started_at"),
            "completed_at": kwargs.get("completed_at"),
            "metrics": kwargs.get("metrics", []),
            "error": kwargs.get("error"),
            "created_at": created_at,
        }
        self._trainings[row["id"]] = row

    async def get_training(self, *, training_id: str) -> Optional[dict[str, Any]]:
        return self._trainings.get(training_id)


class MlModelDb:
    def __init__(self, database_url: str):
        self._database_url = database_url
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(dsn=self._database_url, min_size=1, max_size=10)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def ping(self) -> bool:
        try:
            assert self._pool is not None
            async with self._pool.acquire() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception:
            return False

    async def ensure_schema(self) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            # Models table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ml_model (
                  id TEXT PRIMARY KEY,
                  tenant_id TEXT NOT NULL,
                  name TEXT NOT NULL,
                  type TEXT NOT NULL,
                  description TEXT NOT NULL,
                  algorithm TEXT NOT NULL,
                  hyperparameters JSONB NOT NULL DEFAULT '[]'::jsonb,
                  features JSONB NOT NULL DEFAULT '[]'::jsonb,
                  target_variable TEXT NOT NULL,
                  status TEXT NOT NULL DEFAULT 'draft',
                  metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
                  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                  training_data_start TIMESTAMPTZ NULL,
                  training_data_end TIMESTAMPTZ NULL,
                  trained_at TIMESTAMPTZ NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ml_model_tenant_idx
                  ON ml_model(tenant_id);
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ml_model_tenant_type_status_idx
                  ON ml_model(tenant_id, type, status);
                """
            )

            # Deployments table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ml_deployment (
                  id TEXT PRIMARY KEY,
                  tenant_id TEXT NOT NULL,
                  model_id TEXT NOT NULL REFERENCES ml_model(id) ON DELETE CASCADE,
                  model_name TEXT NOT NULL,
                  environment TEXT NOT NULL,
                  config JSONB NOT NULL DEFAULT '{}'::jsonb,
                  status TEXT NOT NULL DEFAULT 'pending',
                  description TEXT NULL,
                  endpoint_url TEXT NULL,
                  deployed_at TIMESTAMPTZ NULL,
                  stopped_at TIMESTAMPTZ NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ml_deployment_tenant_idx
                  ON ml_deployment(tenant_id);
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ml_deployment_model_idx
                  ON ml_deployment(model_id);
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ml_deployment_tenant_env_idx
                  ON ml_deployment(tenant_id, environment);
                """
            )

            # Trainings table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ml_training (
                  id TEXT PRIMARY KEY,
                  model_id TEXT NOT NULL REFERENCES ml_model(id) ON DELETE CASCADE,
                  tenant_id TEXT NOT NULL,
                  training_data_start TIMESTAMPTZ NOT NULL,
                  training_data_end TIMESTAMPTZ NOT NULL,
                  validation_split DOUBLE PRECISION NOT NULL DEFAULT 0.2,
                  hyperparameters JSONB NOT NULL DEFAULT '[]'::jsonb,
                  status TEXT NOT NULL DEFAULT 'queued',
                  started_at TIMESTAMPTZ NULL,
                  completed_at TIMESTAMPTZ NULL,
                  metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
                  error TEXT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ml_training_model_idx
                  ON ml_training(model_id);
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ml_training_tenant_idx
                  ON ml_training(tenant_id);
                """
            )

    # Model operations
    async def create_model(
        self,
        *,
        id: str,
        tenant_id: str,
        name: str,
        type: str,
        description: str,
        algorithm: str,
        hyperparameters: list[dict[str, Any]],
        features: list[str],
        target_variable: str,
        status: str,
        metrics: list[dict[str, Any]],
        metadata: dict[str, Any],
        training_data_start: Optional[datetime],
        training_data_end: Optional[datetime],
        trained_at: Optional[datetime],
    ) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ml_model
                  (id, tenant_id, name, type, description, algorithm,
                   hyperparameters, features, target_variable, status,
                   metrics, metadata, training_data_start, training_data_end, trained_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15)
                """,
                id,
                tenant_id,
                name,
                type,
                description,
                algorithm,
                json.dumps(hyperparameters),
                json.dumps(features),
                target_variable,
                status,
                json.dumps(metrics),
                json.dumps(metadata),
                training_data_start,
                training_data_end,
                trained_at,
            )

    async def get_model(self, *, model_id: str) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                  id, tenant_id, name, type, description, algorithm,
                  hyperparameters, features, target_variable, status,
                  metrics, metadata, training_data_start, training_data_end,
                  trained_at, created_at, updated_at
                FROM ml_model
                WHERE id = $1
                """,
                model_id,
            )
            return dict(row) if row else None

    async def list_models(
        self,
        *,
        tenant_id: str,
        model_type: Optional[str],
        status: Optional[str],
        page: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int]:
        assert self._pool is not None
        page = max(1, page)
        limit = max(1, min(limit, 100))
        offset = (page - 1) * limit

        where_clauses = ["tenant_id = $1"]
        params = [tenant_id]
        param_idx = 2

        if model_type:
            where_clauses.append(f"type = ${param_idx}")
            params.append(model_type)
            param_idx += 1

        if status:
            where_clauses.append(f"status = ${param_idx}")
            params.append(status)
            param_idx += 1

        where_clause = " AND ".join(where_clauses)

        async with self._pool.acquire() as conn:
            total = await conn.fetchval(
                f"""
                SELECT COUNT(*)
                FROM ml_model
                WHERE {where_clause}
                """,
                *params,
            )

            rows = await conn.fetch(
                f"""
                SELECT
                  id, tenant_id, name, type, description, algorithm,
                  hyperparameters, features, target_variable, status,
                  metrics, metadata, training_data_start, training_data_end,
                  trained_at, created_at, updated_at
                FROM ml_model
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
                """,
                *params,
                limit,
                offset,
            )
            return [dict(r) for r in rows], int(total or 0)

    async def update_model(
        self,
        *,
        model_id: str,
        name: Optional[str],
        description: Optional[str],
        hyperparameters: Optional[list[dict[str, Any]]],
        features: Optional[list[str]],
        tags: Optional[list[str]],
        status: Optional[str],
    ) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        updates = []
        params = []
        param_idx = 1

        if name is not None:
            updates.append(f"name = ${param_idx}")
            params.append(name)
            param_idx += 1

        if description is not None:
            updates.append(f"description = ${param_idx}")
            params.append(description)
            param_idx += 1

        if hyperparameters is not None:
            updates.append(f"hyperparameters = ${param_idx}::jsonb")
            params.append(json.dumps(hyperparameters))
            param_idx += 1

        if features is not None:
            updates.append(f"features = ${param_idx}::jsonb")
            params.append(json.dumps(features))
            param_idx += 1

        if tags is not None:
            updates.append(f"metadata = jsonb_set(metadata, '{{tags}}', ${param_idx}::jsonb)")
            params.append(json.dumps(tags))
            param_idx += 1

        if status is not None:
            updates.append(f"status = ${param_idx}")
            params.append(status)
            param_idx += 1

        updates.append(f"updated_at = ${param_idx}")
        params.append(datetime.now(tz=timezone.utc))
        param_idx += 1

        params.append(model_id)

        if not updates:
            return await self.get_model(model_id=model_id)

        async with self._pool.acquire() as conn:
            result = await conn.execute(
                f"""
                UPDATE ml_model
                SET {', '.join(updates)}
                WHERE id = ${param_idx}
                RETURNING id
                """,
                *params,
            )

            if result == "UPDATE 0":
                return None

            return await self.get_model(model_id=model_id)

    async def delete_model(self, *, model_id: str) -> bool:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM ml_model WHERE id = $1
                """,
                model_id,
            )
            return result == "DELETE 1"

    # Deployment operations
    async def create_deployment(
        self,
        *,
        id: str,
        tenant_id: str,
        model_id: str,
        model_name: str,
        environment: str,
        config: dict[str, Any],
        status: str,
        description: Optional[str],
    ) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ml_deployment
                  (id, tenant_id, model_id, model_name, environment, config, status, description)
                VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
                """,
                id,
                tenant_id,
                model_id,
                model_name,
                environment,
                json.dumps(config),
                status,
                description,
            )

    async def get_deployment(self, *, deployment_id: str) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                  id, tenant_id, model_id, model_name, environment,
                  config, status, description, endpoint_url,
                  deployed_at, stopped_at, created_at, updated_at
                FROM ml_deployment
                WHERE id = $1
                """,
                deployment_id,
            )
            return dict(row) if row else None

    async def list_deployments(
        self,
        *,
        tenant_id: str,
        model_id: Optional[str],
        environment: Optional[str],
        page: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int]:
        assert self._pool is not None
        page = max(1, page)
        limit = max(1, min(limit, 100))
        offset = (page - 1) * limit

        where_clauses = ["tenant_id = $1"]
        params = [tenant_id]
        param_idx = 2

        if model_id:
            where_clauses.append(f"model_id = ${param_idx}")
            params.append(model_id)
            param_idx += 1

        if environment:
            where_clauses.append(f"environment = ${param_idx}")
            params.append(environment)
            param_idx += 1

        where_clause = " AND ".join(where_clauses)

        async with self._pool.acquire() as conn:
            total = await conn.fetchval(
                f"""
                SELECT COUNT(*)
                FROM ml_deployment
                WHERE {where_clause}
                """,
                *params,
            )

            rows = await conn.fetch(
                f"""
                SELECT
                  id, tenant_id, model_id, model_name, environment,
                  config, status, description, endpoint_url,
                  deployed_at, stopped_at, created_at, updated_at
                FROM ml_deployment
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
                """,
                *params,
                limit,
                offset,
            )
            return [dict(r) for r in rows], int(total or 0)

    async def update_deployment(
        self,
        *,
        deployment_id: str,
        config: Optional[dict[str, Any]],
        description: Optional[str],
        status: Optional[str],
        endpoint_url: Optional[str],
        deployed_at: Optional[datetime],
        stopped_at: Optional[datetime],
    ) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        updates = []
        params = []
        param_idx = 1

        if config is not None:
            updates.append(f"config = ${param_idx}::jsonb")
            params.append(json.dumps(config))
            param_idx += 1

        if description is not None:
            updates.append(f"description = ${param_idx}")
            params.append(description)
            param_idx += 1

        if status is not None:
            updates.append(f"status = ${param_idx}")
            params.append(status)
            param_idx += 1

        if endpoint_url is not None:
            updates.append(f"endpoint_url = ${param_idx}")
            params.append(endpoint_url)
            param_idx += 1

        if deployed_at is not None:
            updates.append(f"deployed_at = ${param_idx}")
            params.append(deployed_at)
            param_idx += 1

        if stopped_at is not None:
            updates.append(f"stopped_at = ${param_idx}")
            params.append(stopped_at)
            param_idx += 1

        updates.append(f"updated_at = ${param_idx}")
        params.append(datetime.now(tz=timezone.utc))
        param_idx += 1

        params.append(deployment_id)

        if not updates:
            return await self.get_deployment(deployment_id=deployment_id)

        async with self._pool.acquire() as conn:
            result = await conn.execute(
                f"""
                UPDATE ml_deployment
                SET {', '.join(updates)}
                WHERE id = ${param_idx}
                RETURNING id
                """,
                *params,
            )

            if result == "UPDATE 0":
                return None

            return await self.get_deployment(deployment_id=deployment_id)

    async def delete_deployment(self, *, deployment_id: str) -> bool:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM ml_deployment WHERE id = $1
                """,
                deployment_id,
            )
            return result == "DELETE 1"

    # Training operations
    async def create_training(
        self,
        *,
        id: str,
        model_id: str,
        tenant_id: str,
        training_data_start: datetime,
        training_data_end: datetime,
        validation_split: float,
        hyperparameters: list[dict[str, Any]],
        status: str,
    ) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ml_training
                  (id, model_id, tenant_id, training_data_start, training_data_end,
                   validation_split, hyperparameters, status)
                VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
                """,
                id,
                model_id,
                tenant_id,
                training_data_start,
                training_data_end,
                validation_split,
                json.dumps(hyperparameters),
                status,
            )

    async def get_training(self, *, training_id: str) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                  id, model_id, tenant_id, training_data_start, training_data_end,
                  validation_split, hyperparameters, status, started_at,
                  completed_at, metrics, error, created_at
                FROM ml_training
                WHERE id = $1
                """,
                training_id,
            )
            return dict(row) if row else None
