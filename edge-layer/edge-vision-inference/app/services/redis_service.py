"""
Redis service for logging errors and progress
"""
import redis
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from app.config import Config

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Connect to Redis server"""
        try:
            redis_url = getattr(Config, 'REDIS_URL', 'redis://localhost:6379')
            
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False
    
    def log_error(self, run_id: int, error_type: str, error_message: str, details: Optional[Dict[str, Any]] = None):
        """Log error to Redis"""
        if not self.is_connected():
            logger.warning("Redis not connected, skipping error log")
            return
        
        try:
            error_data = {
                "run_id": run_id,
                "type": "error",
                "error_type": error_type,
                "error_message": error_message,
                "details": details or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Store in Redis with TTL of 7 days
            key = f"vision_service:error:{run_id}:{datetime.utcnow().timestamp()}"
            self.redis_client.setex(key, 604800, json.dumps(error_data))  # 7 days TTL
            
            # Also add to error list for easy querying
            self.redis_client.lpush("vision_service:errors", key)
            self.redis_client.ltrim("vision_service:errors", 0, 999)  # Keep last 1000 errors
            
            logger.info(f"Error logged to Redis for run_id {run_id}: {error_type}")
            
        except Exception as e:
            logger.error(f"Failed to log error to Redis: {e}")
    
    def log_progress(self, run_id: int, progress: int, message: str, details: Optional[Dict[str, Any]] = None):
        """Log progress to Redis"""
        if not self.is_connected():
            logger.warning("Redis not connected, skipping progress log")
            return
        
        try:
            progress_data = {
                "run_id": run_id,
                "type": "progress",
                "progress": progress,
                "message": message,
                "details": details or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Store in Redis with TTL of 1 day
            key = f"vision_service:progress:{run_id}:{datetime.utcnow().timestamp()}"
            self.redis_client.setex(key, 86400, json.dumps(progress_data))  # 1 day TTL
            
            # Update current progress for this run
            current_key = f"vision_service:current_progress:{run_id}"
            self.redis_client.setex(current_key, 3600, json.dumps(progress_data))  # 1 hour TTL
            
            logger.debug(f"Progress logged to Redis for run_id {run_id}: {progress}% - {message}")
            
        except Exception as e:
            logger.error(f"Failed to log progress to Redis: {e}")
    
    def get_progress(self, run_id: int) -> Optional[Dict[str, Any]]:
        """Get current progress for a run"""
        if not self.is_connected():
            return None
        
        try:
            key = f"vision_service:current_progress:{run_id}"
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to get progress from Redis: {e}")
        
        return None
    
    def get_errors(self, run_id: Optional[int] = None, limit: int = 100) -> list:
        """Get recent errors, optionally filtered by run_id"""
        if not self.is_connected():
            return []
        
        try:
            if run_id:
                # Get errors for specific run
                pattern = f"vision_service:error:{run_id}:*"
                keys = self.redis_client.keys(pattern)
            else:
                # Get recent errors
                keys = self.redis_client.lrange("vision_service:errors", 0, limit - 1)
            
            errors = []
            for key in keys[:limit]:
                data = self.redis_client.get(key)
                if data:
                    errors.append(json.loads(data))
            
            return sorted(errors, key=lambda x: x['timestamp'], reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to get errors from Redis: {e}")
            return []
    
    def clear_run_data(self, run_id: int):
        """Clear all data for a specific run"""
        if not self.is_connected():
            return
        
        try:
            # Clear progress
            current_key = f"vision_service:current_progress:{run_id}"
            self.redis_client.delete(current_key)
            
            # Clear error keys for this run
            pattern = f"vision_service:error:{run_id}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            
            logger.info(f"Cleared Redis data for run_id {run_id}")
            
        except Exception as e:
            logger.error(f"Failed to clear Redis data for run_id {run_id}: {e}")

# Global Redis service instance
redis_service = RedisService()
