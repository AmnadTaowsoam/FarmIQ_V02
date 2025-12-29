"""Inference service for running ML models."""
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from app.config import Config

logger = logging.getLogger(__name__)


class InferenceService:
    """Service for running inference on images."""
    
    def __init__(self, config: Config):
        self.config = config
        self.model_version = config.MODEL_VERSION
        self.confidence_threshold = config.CONFIDENCE_THRESHOLD
    
    async def run_inference(
        self,
        image_path: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run inference on an image.
        
        MVP: Returns stub/deterministic output.
        In production, this would load and run the actual ML model.
        
        Args:
            image_path: Path to the image file
            metadata: Optional metadata about the image
            
        Returns:
            Dictionary with inference results including:
            - predicted_weight_kg: Predicted weight in kg
            - confidence: Confidence score (0-1)
            - model_version: Version of the model used
            - metadata: Additional inference metadata
        """
        # Check if image exists
        image_file = Path(image_path)
        if not image_file.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        # MVP: Return deterministic stub output
        # In production, this would:
        # 1. Load the model from MODEL_PATH
        # 2. Preprocess the image
        # 3. Run inference
        # 4. Post-process results
        
        logger.info(f"Running inference (stub mode) model_version={self.model_version}")
        
        # Stub output - deterministic based on file size and name
        file_size = image_file.stat().st_size
        # Simple deterministic calculation for MVP
        predicted_weight = float(file_size % 1000) / 100.0  # 0-9.99 kg
        confidence = min(0.95, 0.5 + (file_size % 100) / 200.0)  # 0.5-0.95
        
        result = {
            "predicted_weight_kg": round(predicted_weight, 2),
            "confidence": round(confidence, 4),
            "model_version": self.model_version,
            "metadata": {
                "image_path": str(image_path),
                "file_size_bytes": file_size,
                "stub_mode": True,
                **(metadata or {})
            }
        }
        
        logger.info(f"Inference completed model_version={self.model_version}")
        return result
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about available models."""
        return {
            "model_version": self.model_version,
            "model_path": self.config.MODEL_PATH or "stub",
            "confidence_threshold": self.config.CONFIDENCE_THRESHOLD,
            "nms_threshold": self.config.NMS_THRESHOLD,
            "status": "ready" if self.config.MODEL_PATH else "stub_mode"
        }
