FROM eclipse-mosquitto:2.0

COPY mosquitto.conf /mosquitto/config/mosquitto.conf

EXPOSE 1883

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD mosquitto_sub -h localhost -t '$$SYS/health' -C 1 || exit 1
