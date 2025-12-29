#!/usr/bin/env bash
set -euo pipefail

MIN_NODE_MAJOR=18

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "${node_major}" -lt "${MIN_NODE_MAJOR}" ]; then
  echo "Node.js ${MIN_NODE_MAJOR}+ is required. Found v$(node -v)." >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "corepack not found; please install Node.js with Corepack support." >&2
  exit 1
fi

corepack enable >/dev/null 2>&1 || true

echo "Installing dependencies with retry-safe settings..."
pnpm install

echo ""
echo "Next steps:"
echo "  pnpm dev"
echo "  open http://localhost:5142"
