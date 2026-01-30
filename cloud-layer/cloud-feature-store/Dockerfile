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

# Expose Feast UI port (matching docker-compose.yml)
EXPOSE 5137

# Health check - use curl instead of Python requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5137/health || exit 1

# Start Feast UI server with correct port
CMD ["python", "-m", "feast", "ui", "--host", "0.0.0.0", "--port", "5137"]
