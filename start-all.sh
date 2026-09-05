#!/usr/bin/env bash
# Start the three backend services and the three frontends.
# Use this as a single dev entrypoint. Run with:  bash start-all.sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ---- backend ----
(cd backend && [ -d node_modules ] || npm install)
(cd backend && npm run dev:all) &
BACKEND_PID=$!

# ---- frontends ----
(cd frontend && [ -d node_modules ] || npm install)
(cd frontend && npm run dev) &

(cd frontend-restaurant && [ -d node_modules ] || npm install) || true
(cd frontend-restaurant && npm run dev) &

(cd frontend-storefront && [ -d node_modules ] || npm install) || true
(cd frontend-storefront && npm run dev) &

trap "echo 'Stopping…'; kill $BACKEND_PID 2>/dev/null || true" SIGINT SIGTERM
wait
