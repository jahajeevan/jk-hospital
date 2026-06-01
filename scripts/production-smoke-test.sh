#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:5001}"
OLLAMA_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-gemma3:4b}"

echo "Checking backend health: ${BASE_URL}/api/health"
curl -fsS "${BASE_URL}/api/health" >/dev/null
echo "OK backend health"

echo "Checking versioned health: ${BASE_URL}/api/v1/health/live"
curl -fsS "${BASE_URL}/api/v1/health/live" >/dev/null
echo "OK versioned health"

echo "Checking AI config: ${BASE_URL}/api/ai/config"
curl -fsS "${BASE_URL}/api/ai/config" >/dev/null
echo "OK AI config"

echo "Checking Ollama model: ${OLLAMA_URL}/api/generate"
curl -fsS "${OLLAMA_URL%/}/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"Reply OK only.\",\"stream\":false}" >/dev/null
echo "OK Ollama"

echo "Checking AI symptom routing"
curl -fsS "${BASE_URL}/api/ai/symptom-route" \
  -H "Content-Type: application/json" \
  -d '{"symptoms":"chest pain and shortness of breath"}' >/dev/null
echo "OK AI symptom routing"

echo "Production smoke test passed"
