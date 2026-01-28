# Feature Store Service (Feast)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY feature_store/ ./feature_store/

# Create directories for feature store
RUN mkdir -p /data/features /data/registry

# Set environment variables
ENV FEAST_REGISTRY_PATH=/data/registry
ENV FEAST_DATA_PATH=/data/features

# Expose Feast UI port
EXPOSE 6566

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:6566/health')"

# Start Feast UI server
CMD ["python", "-m", "feast", "ui", "--host", "0.0.0.0", "--port", "6566"]
