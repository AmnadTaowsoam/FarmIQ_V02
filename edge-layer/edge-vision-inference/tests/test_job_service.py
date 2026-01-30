import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime
from app.job_service import JobService
from app.inference_service import InferenceService
from app.db import InferenceDb
from app.config import Config


@pytest.mark.unit
class TestJobService:
    """Test JobService functionality."""

    def test_init(self):
        """Test service initialization."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)

        service = JobService(mock_db, mock_inference_service)

        assert service.db == mock_db
        assert service.inference_service == mock_inference_service
        assert service.jobs == {}

    @pytest.mark.unit
    def test_create_job_returns_job_id(self, sample_job_data):
        """Test create_job returns job with ID."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)

        service = JobService(mock_db, mock_inference_service)

        job = service.create_job(
            tenant_id='tenant-1',
            farm_id='farm-1',
            barn_id='barn-1',
            device_id='device-1',
            media_id='media-1',
            object_key='object-key-1'
        )

        assert 'job_id' in job
        assert job['tenant_id'] == 'tenant-1'
        assert job['farm_id'] == 'farm-1'
        assert job['barn_id'] == 'barn-1'
        assert job['device_id'] == 'device-1'
        assert job['media_id'] == 'media-1'
        assert job['object_key'] == 'object-key-1'
        assert job['status'] == 'pending'
        assert 'created_at' in job
        assert 'updated_at' in job

    @pytest.mark.unit
    def test_create_job_requires_media_id_or_object_key(self, sample_job_data):
        """Test create_job raises ValueError when media_id or object_key is missing."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)

        service = JobService(mock_db, mock_inference_service)

        with pytest.raises(ValueError, match="media_id or object_key is required"):
            service.create_job(
                tenant_id='tenant-1',
                farm_id='farm-1',
                barn_id='barn-1',
                device_id='device-1'
            )

    @pytest.mark.unit
    def test_create_job_generates_unique_job_id(self, sample_job_data):
        """Test create_job generates unique job IDs."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)

        service = JobService(mock_db, mock_inference_service)

        job1 = service.create_job(
            tenant_id='tenant-1',
            farm_id='farm-1',
            barn_id='barn-1',
            device_id='device-1',
            media_id='media-1'
        )

        job2 = service.create_job(
            tenant_id='tenant-1',
            farm_id='farm-1',
            barn_id='barn-1',
            device_id='device-1',
            media_id='media-1'
        )

        assert job1['job_id'] != job2['job_id']

    @pytest.mark.unit
    def test_get_job_returns_job(self, sample_job_data):
        """Test get_job returns job by ID."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)

        service = JobService(mock_db, mock_inference_service)

        job = service.create_job(
            tenant_id='tenant-1',
            farm_id='farm-1',
            barn_id='barn-1',
            device_id='device-1',
            media_id='media-1'
        )

        retrieved_job = service.get_job(job['job_id'])

        assert retrieved_job == job

    @pytest.mark.unit
    def test_get_job_returns_none_for_nonexistent(self, sample_job_data):
        """Test get_job returns None for non-existent job."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)

        service = JobService(mock_db, mock_inference_service)

        retrieved_job = service.get_job('non-existent-job-id')

        assert retrieved_job is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_job_transitions_to_processing(self, sample_job_data):
        """Test job transitions to processing state."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)
        mock_inference_service.run_inference = AsyncMock(return_value={
            'predicted_weight_kg': 10.5,
            'confidence': 0.95,
            'model_version': '1.0.0'
        })
        mock_db.create_inference_result = AsyncMock(return_value='result-1')
        mock_db.create_outbox_event = AsyncMock()
        mock_db.get_inference_results_by_session = AsyncMock(return_value=[])

        service = JobService(mock_db, mock_inference_service)

        job = service.create_job(
            tenant_id='tenant-1',
            farm_id='farm-1',
            barn_id='barn-1',
            device_id='device-1',
            media_id='media-1'
        )

        # Manually add job to service's job store
        service.jobs[job['job_id']] = job

        await service._process_job(job['job_id'])

        assert job['status'] == 'completed'
        assert job['result_id'] == 'result-1'
        assert mock_inference_service.run_inference.called

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_job_completes_with_results(self, sample_job_data):
        """Test job completes with inference results."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)
        mock_inference_service.run_inference = AsyncMock(return_value={
            'predicted_weight_kg': 10.5,
            'confidence': 0.95,
            'model_version': '1.0.0'
        })
        mock_db.create_inference_result = AsyncMock(return_value='result-1')
        mock_db.create_outbox_event = AsyncMock()
        mock_db.get_inference_results_by_session = AsyncMock(return_value=[])

        service = JobService(mock_db, mock_inference_service)

        job = service.create_job(
            tenant_id='tenant-1',
            farm_id='farm-1',
            barn_id='barn-1',
            device_id='device-1',
            media_id='media-1',
            session_id='session-1'
        )

        # Manually add job to service's job store
        service.jobs[job['job_id']] = job

        await service._process_job(job['job_id'])

        assert job['status'] == 'completed'
        assert job['result_id'] == 'result-1'
        assert mock_db.create_inference_result.called
        assert mock_db.create_outbox_event.called

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_job_handles_processing_errors(self, sample_job_data):
        """Test job handles processing errors gracefully."""
        mock_db = MagicMock(spec=InferenceDb)
        mock_inference_service = MagicMock(spec=InferenceService)
        mock_inference_service.run_inference = AsyncMock(side_effect=Exception('Inference failed'))
        mock_db.create_inference_result = AsyncMock()
        mock_db.create_outbox_event = AsyncMock()

        service = JobService(mock_db, mock_inference_service)

        job = service.create_job(
            tenant_id='tenant-1',
            farm_id='farm-1',
            barn_id='barn-1',
            device_id='device-1',
            media_id='media-1'
        )

        # Manually add job to service's job store
        service.jobs[job['job_id']] = job

        await service._process_job(job['job_id'])

        assert job['status'] == 'failed'
        assert 'error' in job
        assert job['error'] == 'Inference failed'
        assert not mock_db.create_inference_result.called
