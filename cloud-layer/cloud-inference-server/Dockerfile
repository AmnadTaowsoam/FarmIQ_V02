# High-Performance Inference Server (Triton)
FROM nvcr.io/nvidia/tritonserver:24.08-py3

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create directories for models and artifacts
RUN mkdir -p /models /artifacts /metrics

# Expose Triton ports
EXPOSE 8000 8001 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/v2/health/ready

# Start Triton Inference Server
CMD ["tritonserver", \
     "--model-repository=/models", \
     "--http-port=8000", \
     "--grpc-port=8001", \
     "--metrics-port=8002", \
     "--log-verbose=1", \
     "--exit-on-error=false"]
