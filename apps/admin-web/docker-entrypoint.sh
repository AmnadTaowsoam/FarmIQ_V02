#!/bin/sh
set -e

echo "[Entrypoint] Starting entrypoint script..."

# Always install/update dependencies when package.json is mounted
# This ensures dependencies are always in sync with the mounted package.json
if [ -f "/app/package.json" ]; then
  echo "[Entrypoint] package.json found, checking dependencies..."
  
  # Check if critical dependencies exist
  MISSING_DEPS=false
  if [ ! -d "/app/node_modules/lucide-react" ]; then
    echo "[Entrypoint] Missing dependency: lucide-react"
    MISSING_DEPS=true
  fi
  if [ ! -d "/app/node_modules/@tanstack/react-query" ]; then
    echo "[Entrypoint] Missing dependency: @tanstack/react-query"
    MISSING_DEPS=true
  fi
  if [ ! -d "/app/node_modules/date-fns" ]; then
    echo "[Entrypoint] Missing dependency: date-fns"
    MISSING_DEPS=true
  fi
  
  # Check if node_modules is empty or missing critical deps
  # Also check if package.json is newer than node_modules (when mounted)
  PACKAGE_JSON_MTIME=$(stat -c %Y /app/package.json 2>/dev/null || echo "0")
  NODE_MODULES_MTIME=$(stat -c %Y /app/node_modules 2>/dev/null || echo "0")
  
  if [ ! -d "/app/node_modules" ] || [ ! "$(ls -A /app/node_modules 2>/dev/null)" ] || [ "$MISSING_DEPS" = "true" ] || [ "$PACKAGE_JSON_MTIME" -gt "$NODE_MODULES_MTIME" ]; then
    echo "[Entrypoint] Installing/updating dependencies..."
    npm cache clean --force
    npm install
    echo "[Entrypoint] Dependencies installed successfully"
  else
    echo "[Entrypoint] Dependencies are present, skipping install"
  fi
else
  echo "[Entrypoint] WARNING: package.json not found!"
fi

# Execute the command
echo "[Entrypoint] Executing command: $@"
exec "$@"
