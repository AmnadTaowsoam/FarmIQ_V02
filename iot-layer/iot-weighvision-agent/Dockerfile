# Dockerfile for IoT WeighVision Agent
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create buffer directory
RUN mkdir -p /tmp/weighvision/buffer

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Create non-root user for running the application
RUN useradd -m -u 1000 weighvision && \
    chown -R weighvision:weighvision /app /tmp/weighvision

# Switch to non-root user
USER weighvision

# Default command
CMD ["python", "-m", "app.main", "--mode", "continuous"]
