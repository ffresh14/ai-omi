#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/api"
VENV_PYTHON="$ROOT_DIR/.venv/bin/python"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5500}"
MODE="${1:-full}"

usage() {
  cat <<EOF
Usage: ./start_ecg_app.sh [full|backend|frontend]

Modes:
  full      Start backend + frontend (default)
  backend   Start FastAPI only
  frontend  Start static frontend only

Optional environment variables:
  BACKEND_HOST, BACKEND_PORT, FRONTEND_HOST, FRONTEND_PORT
EOF
}

is_port_in_use() {
  local port="$1"
  ss -ltn "( sport = :${port} )" | grep -q ":${port}"
}

if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "Missing virtualenv python at: $VENV_PYTHON"
  echo "Create it first, then install backend deps."
  exit 1
fi

if [[ "$MODE" != "full" && "$MODE" != "backend" && "$MODE" != "frontend" ]]; then
  usage
  exit 1
fi

start_backend() {
  if is_port_in_use "$BACKEND_PORT"; then
    echo "Port ${BACKEND_PORT} is already in use. Stop the existing backend first."
    exit 1
  fi

  echo "Starting backend on http://127.0.0.1:${BACKEND_PORT} ..."
  (
    cd "$API_DIR"
    exec "$VENV_PYTHON" -m uvicorn main:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT"
  ) &
  BACKEND_PID=$!
}

start_frontend() {
  if is_port_in_use "$FRONTEND_PORT"; then
    echo "Port ${FRONTEND_PORT} is already in use. Stop the existing frontend server first."
    exit 1
  fi

  echo "Starting frontend on http://${FRONTEND_HOST}:${FRONTEND_PORT}/index.html ..."
  echo "Frontend uses API base from app.js default: http://127.0.0.1:${BACKEND_PORT}"
  (
    cd "$ROOT_DIR"
    exec "$VENV_PYTHON" -m http.server "$FRONTEND_PORT" --bind "$FRONTEND_HOST"
  ) &
  FRONTEND_PID=$!
}

BACKEND_PID=""
FRONTEND_PID=""

if [[ "$MODE" == "full" || "$MODE" == "backend" ]]; then
  start_backend
fi

if [[ "$MODE" == "full" || "$MODE" == "frontend" ]]; then
  start_frontend
fi

cleanup() {
  echo "Stopping services..."
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM
if [[ -n "$BACKEND_PID" && -n "$FRONTEND_PID" ]]; then
  wait "$BACKEND_PID" "$FRONTEND_PID"
elif [[ -n "$BACKEND_PID" ]]; then
  wait "$BACKEND_PID"
elif [[ -n "$FRONTEND_PID" ]]; then
  wait "$FRONTEND_PID"
fi
