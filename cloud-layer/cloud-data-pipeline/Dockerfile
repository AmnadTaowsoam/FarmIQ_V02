FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# libpq-dev provides pg_config needed to build psycopg2 from source
# gcc and python3-dev are needed for building Python packages
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy dbt project
COPY . .

# Create logs and target directories before switching to non-root user
RUN mkdir -p /app/logs /app/target

# Install dbt packages (dbt-utils, etc.)
# Note: dbt deps may show warnings/errors with protobuf 5.x but packages still install
RUN dbt deps || echo "dbt deps completed with warnings (packages may still be installed)"

# Create non-root user and ensure directories are writable
RUN useradd -m -u 1000 dbtuser && \
    chown -R dbtuser:dbtuser /app && \
    chmod -R 755 /app/logs /app/target
USER dbtuser

# Health check - use dbt version command
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD dbt --version || exit 1

# Default command - keep container alive with a simple HTTP server
# This container serves as a dbt runtime environment that Airflow can execute commands in
# The HTTP server provides a simple health endpoint
CMD ["python", "-m", "http.server", "8000"]
