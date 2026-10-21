#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 Thesio — Governed Autonomous AI Research Studio"
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ "$USE_LOCAL_LLM" = "true" ] || [ -z "$GEMMA_API_KEY" ]; then
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "✅ Local Ollama is active on http://localhost:11434"
  else
    echo "⚠️ Starting Ollama service in background..."
    ollama serve >/dev/null 2>&1 &
    sleep 2
  fi
fi

PYTHON_BIN="python3"
if [ -f "$ROOT_DIR/venv/bin/python3" ]; then
  PYTHON_BIN="$ROOT_DIR/venv/bin/python3"
fi

if lsof -i :8000 >/dev/null 2>&1; then
  echo "✅ FastAPI Backend is already running on http://localhost:8000"
else
  echo "⚡ Launching FastAPI Backend on port 8000..."
  $PYTHON_BIN -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload >/dev/null 2>&1 &
  sleep 1
fi

APP_PORT="${PORT:-8080}"
echo "=========================================================="
echo "🎯 Starting Thesio Dashboard on port $APP_PORT"
echo "=========================================================="

npx vite --host 0.0.0.0 --port "$APP_PORT"

