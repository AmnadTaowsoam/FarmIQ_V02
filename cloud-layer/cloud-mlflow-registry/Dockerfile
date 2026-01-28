# MLflow Model Registry Service
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create directories for MLflow artifacts
RUN mkdir -p /mlflow/artifacts /mlflow/db

# Set environment variables
ENV MLFLOW_TRACKING_URI=postgresql://farmiq:farmiq_dev@postgres:5432/mlflow_registry
ENV MLFLOW_ARTIFACT_ROOT=/mlflow/artifacts
ENV MLFLOW_BACKEND_STORE_URI=postgresql://farmiq:farmiq_dev@postgres:5432/mlflow_registry
ENV MLFLOW_DEFAULT_ARTIFACT_ROOT=s3://mlflow-artifacts

# Expose MLflow UI port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Start MLflow server
CMD ["mlflow", "server", \
     "--backend-store-uri", "postgresql://farmiq:farmiq_dev@postgres:5432/mlflow_registry", \
     "--default-artifact-root", "/mlflow/artifacts", \
     "--host", "0.0.0.0", \
     "--port", "5000", \
     "--gunicorn-workers", "4"]
