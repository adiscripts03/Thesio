#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 ResearchBuddy — Powered by Local Gemma 4 12B"
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Check / Start Local Ollama if configured
if [ "$USE_LOCAL_LLM" = "true" ] || [ -z "$GROQ_API_KEY" ]; then
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "✅ Local Ollama is active on http://localhost:11434"
  else
    echo "⚠️ Starting Ollama service in background..."
    ollama serve >/dev/null 2>&1 &
    sleep 2
  fi
fi

# 2. Check / Start Python Backend on port 8000
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

echo "=========================================================="
echo "🎯 Starting ResearchBuddy Dashboard on http://localhost:5173"
echo "=========================================================="

npm run dev
