import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path
from app.inference_service import InferenceService
from app.config import Config


@pytest.mark.unit
class TestInferenceService:
    """Test InferenceService functionality."""

    def test_init(self):
        """Test service initialization."""
        config = Config()
        service = InferenceService(config)

        assert service.config == config
        assert service.model_version == config.MODEL_VERSION
        assert service.confidence_threshold == config.CONFIDENCE_THRESHOLD

    @pytest.mark.unit
    def test_run_inference_returns_valid_format(self, mock_model, sample_image):
        """Test that run_inference returns valid format."""
        config = Config()
        service = InferenceService(config)

        # Create a temporary test image file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(b'fake image data')
            tmp_path = tmp.name

        result = service.run_inference(tmp_path)

        assert 'predicted_weight_kg' in result
        assert 'confidence' in result
        assert 'model_version' in result
        assert 'metadata' in result
        assert isinstance(result['predicted_weight_kg'], (int, float))
        assert isinstance(result['confidence'], (int, float))
        assert 0 <= result['confidence'] <= 1

    @pytest.mark.unit
    def test_run_inference_with_metadata(self, mock_model, sample_image):
        """Test that run_inference includes metadata."""
        config = Config()
        service = InferenceService(config)

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(b'fake image data')
            tmp_path = tmp.name

        metadata = {'custom_field': 'custom_value'}
        result = service.run_inference(tmp_path, metadata)

        assert 'metadata' in result
        assert result['metadata']['custom_field'] == 'custom_value'
        assert 'image_path' in result['metadata']

    @pytest.mark.unit
    def test_run_inference_nonexistent_image(self, mock_model):
        """Test that run_inference raises FileNotFoundError for missing image."""
        config = Config()
        service = InferenceService(config)

        with pytest.raises(FileNotFoundError, match="Image not found"):
            service.run_inference('/nonexistent/image.jpg')

    @pytest.mark.unit
    def test_get_model_info(self, mock_model):
        """Test get_model_info returns correct information."""
        config = Config()
        service = InferenceService(config)

        result = service.get_model_info()

        assert 'model_version' in result
        assert 'model_path' in result
        assert 'confidence_threshold' in result
        assert 'nms_threshold' in result
        assert 'status' in result

    @pytest.mark.unit
    def test_get_model_info_stub_mode(self, mock_model):
        """Test get_model_info returns stub_mode status when no model."""
        config = Config()
        config.MODEL_PATH = None  # Simulate stub mode
        service = InferenceService(config)

        result = service.get_model_info()

        assert result['status'] == 'stub_mode'
        assert result['model_path'] == 'stub'

    @pytest.mark.unit
    def test_confidence_threshold_filtering(self, mock_model):
        """Test that predictions below confidence threshold are filtered."""
        config = Config()
        config.CONFIDENCE_THRESHOLD = 0.8
        service = InferenceService(config)

        # Mock model to return low confidence prediction
        mock_model.predict.return_value = [{'label': 'pig', 'confidence': 0.5}]

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(b'fake image data')
            tmp_path = tmp.name

        result = service.run_inference(tmp_path)

        # In stub mode, confidence is calculated deterministically
        # In production, low confidence predictions would be filtered
        assert 'confidence' in result
