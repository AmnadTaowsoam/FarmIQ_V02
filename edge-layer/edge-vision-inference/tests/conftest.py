import pytest
from unittest.mock import MagicMock
import numpy as np


@pytest.fixture
def mock_model():
    """Mock ML model for testing."""
    model = MagicMock()
    model.predict.return_value = [{'label': 'pig', 'confidence': 0.95}]
    return model


@pytest.fixture
def sample_image():
    """Sample test image."""
    return np.zeros((640, 480, 3), dtype=np.uint8)


@pytest.fixture
def sample_job_data():
    """Sample job data for testing."""
    return {
        'tenant_id': 'tenant-1',
        'image_url': 'http://example.com/image.jpg',
    }
