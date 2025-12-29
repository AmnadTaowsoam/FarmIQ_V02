"""Database connection and schema management."""
import asyncpg
import logging
from typing import Optional, List, Dict, Any
from app.config import Config

logger = logging.getLogger(__name__)


class InferenceDb:
    """Database connection and operations for inference service."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Create connection pool."""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            logger.info("Database connection pool created")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            raise
    
    async def close(self):
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    async def ensure_schema(self):
        """Ensure database tables exist."""
        async with self.pool.acquire() as conn:
            # Needed for gen_random_uuid()
            await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

            # Create inference_results table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS inference_results (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id VARCHAR(255) NOT NULL,
                    farm_id VARCHAR(255) NOT NULL,
                    barn_id VARCHAR(255) NOT NULL,
                    device_id VARCHAR(255) NOT NULL,
                    session_id VARCHAR(255),
                    media_id VARCHAR(255),
                    predicted_weight_kg DECIMAL(10, 2),
                    predicted_size VARCHAR(255),
                    confidence DECIMAL(5, 4),
                    model_version VARCHAR(50) NOT NULL,
                    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    metadata JSONB
                )
            """)

            # Backfill column for older deployments where inference_results existed without event_id.
            await conn.execute("""
                ALTER TABLE inference_results
                ADD COLUMN IF NOT EXISTS event_id UUID
            """)

            await conn.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_inference_results_tenant_event
                ON inference_results(tenant_id, event_id)
            """)
            
            # Create indexes
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_inference_results_tenant_session 
                ON inference_results(tenant_id, session_id)
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_inference_results_tenant_device_occurred 
                ON inference_results(tenant_id, device_id, occurred_at DESC)
            """)
            
            logger.info("Database schema ensured")
    
    async def ping(self) -> bool:
        """Check database connectivity."""
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database ping failed: {e}")
            return False
    
    async def create_inference_result(
        self,
        result_id: str,
        tenant_id: str,
        farm_id: str,
        barn_id: str,
        device_id: str,
        session_id: Optional[str],
        media_id: Optional[str],
        predicted_weight_kg: Optional[float],
        confidence: Optional[float],
        model_version: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create inference result and return ID."""
        async with self.pool.acquire() as conn:
            inserted = await conn.fetchval("""
                INSERT INTO inference_results (
                    id, event_id, tenant_id, farm_id, barn_id, device_id, session_id, media_id,
                    predicted_weight_kg, confidence, model_version, metadata
                ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO NOTHING
                RETURNING id
            """, result_id, result_id, tenant_id, farm_id, barn_id, device_id, session_id, media_id,
                predicted_weight_kg, confidence, model_version, metadata)
            if inserted:
                return str(inserted)
            existing = await conn.fetchval("SELECT id FROM inference_results WHERE id = $1::uuid", result_id)
            return str(existing)
    
    async def get_inference_result(self, result_id: str) -> Optional[Dict[str, Any]]:
        """Get inference result by ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM inference_results WHERE id = $1
            """, result_id)
            if row:
                return dict(row)
            return None
    
    async def get_inference_results_by_session(
        self, session_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get inference results by session ID."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT * FROM inference_results 
                WHERE session_id = $1 
                ORDER BY occurred_at DESC 
                LIMIT $2
            """, session_id, limit)
            return [dict(row) for row in rows]
    
    async def create_outbox_event(
        self,
        event_id: str,
        tenant_id: str,
        event_type: str,
        payload: Dict[str, Any],
        trace_id: str,
        farm_id: Optional[str] = None,
        barn_id: Optional[str] = None,
        device_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> str:
        """Create outbox event."""
        import json
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO sync_outbox (
                    id, tenant_id, farm_id, barn_id, device_id, session_id,
                    event_type, payload_json, trace_id
                ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
            """, event_id, tenant_id, farm_id, barn_id, device_id, session_id,
                event_type, json.dumps(payload), trace_id)
            return str(event_id)
