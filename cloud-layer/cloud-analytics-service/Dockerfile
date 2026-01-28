# Use Python 3.11 slim image
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Upgrade pip with timeout handling (non-blocking if it fails - pip 24.0 is already recent)
RUN pip install --upgrade pip --timeout=120 || echo "pip upgrade failed, continuing with existing version"
RUN pip install --no-cache-dir --timeout=300 -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/api/health || exit 1

CMD ["ddtrace-run", "python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

