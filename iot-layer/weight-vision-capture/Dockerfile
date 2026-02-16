FROM python:3.11-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxrender1 \
    libxext6 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/iot-layer/weight-vision-capture

COPY weight-vision-capture/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY weight-vision-capture /workspace/iot-layer/weight-vision-capture
COPY camera-config /workspace/iot-layer/camera-config

CMD ["python", "run_service.py"]
