# High-Performance Inference Server (CPU-only version for Docker compatibility)
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

# Create directories for models and artifacts
RUN mkdir -p /models /artifacts /metrics

# Expose HTTP port (gRPC and metrics ports can be added if needed)
EXPOSE 5139

# Health check - use curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5139/health || exit 1

# Start inference server (CPU mode)
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5139"]
