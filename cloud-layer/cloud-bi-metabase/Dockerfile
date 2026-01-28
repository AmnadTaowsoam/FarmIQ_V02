FROM metabase/metabase:v0.50.10

# Set environment variables
ENV MB_DB_FILE=/metabase-data/metabase.db
ENV MB_JETTY_HOST=0.0.0.0
ENV MB_JETTY_PORT=3000

# Create data directory
RUN mkdir -p /metabase-data

# Override entrypoint to avoid BusyBox su command issues
# The base image entrypoint may use 'su -j' which BusyBox doesn't support
ENTRYPOINT []

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run Metabase directly with Java
CMD ["java", "-jar", "/app/metabase.jar"]
