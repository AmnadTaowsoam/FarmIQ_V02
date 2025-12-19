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
            
            # Create indexes
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_inference_results_tenant_session 
                ON inference_results(tenant_id, session_id)
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_inference_results_tenant_device_occurred 
                ON inference_results(tenant_id, device_id, occurred_at DESC)
            """)
            
            # Create outbox table (if not exists - shared with other services)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sync_outbox (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id VARCHAR(255) NOT NULL,
                    farm_id VARCHAR(255),
                    barn_id VARCHAR(255),
                    device_id VARCHAR(255),
                    session_id VARCHAR(255),
                    event_type VARCHAR(255) NOT NULL,
                    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    trace_id VARCHAR(255),
                    payload_json JSONB NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    attempt_count INTEGER NOT NULL DEFAULT 0,
                    last_attempt_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT unique_tenant_event UNIQUE (tenant_id, id)
                )
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_attempt 
                ON sync_outbox(status, last_attempt_at ASC)
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_sync_outbox_tenant_occurred 
                ON sync_outbox(tenant_id, occurred_at DESC)
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
            result_id = await conn.fetchval("""
                INSERT INTO inference_results (
                    tenant_id, farm_id, barn_id, device_id, session_id, media_id,
                    predicted_weight_kg, confidence, model_version, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            """, tenant_id, farm_id, barn_id, device_id, session_id, media_id,
                predicted_weight_kg, confidence, model_version, metadata)
            return str(result_id)
    
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
            event_id = await conn.fetchval("""
                INSERT INTO sync_outbox (
                    tenant_id, farm_id, barn_id, device_id, session_id,
                    event_type, payload_json, trace_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            """, tenant_id, farm_id, barn_id, device_id, session_id,
                event_type, json.dumps(payload), trace_id)
            return str(event_id)

