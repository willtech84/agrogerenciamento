#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"
BACKEND_URL="${BACKEND_URL:-http://localhost:$BACKEND_PORT}"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "[agro-local] Limpando processos Node antigos..."
if command -v taskkill >/dev/null 2>&1; then
  taskkill //F //IM node.exe >/dev/null 2>&1 || true
else
  pkill -f "node" >/dev/null 2>&1 || true
fi

echo "[agro-local] Instalando dependências do backend..."
cd "$BACKEND_DIR"
npm install --silent

echo "[agro-local] Instalando dependências do frontend..."
cd "$FRONTEND_DIR"
npm install --silent

echo "[agro-local] Iniciando backend na porta $BACKEND_PORT..."
cd "$BACKEND_DIR"
npm start &
BACKEND_PID=$!

echo "[agro-local] Iniciando frontend na porta $FRONTEND_PORT (BACKEND_URL=$BACKEND_URL)..."
cd "$FRONTEND_DIR"
PORT="$FRONTEND_PORT" BACKEND_URL="$BACKEND_URL" npm start &
FRONTEND_PID=$!

sleep 2

echo "[agro-local] Validações rápidas:"
echo "----- http://localhost:$BACKEND_PORT/health -----"
curl -fsS "http://localhost:$BACKEND_PORT/health" || true
echo
echo "----- http://localhost:$FRONTEND_PORT/api/health -----"
curl -fsS "http://localhost:$FRONTEND_PORT/api/health" || true
echo
echo "----- http://localhost:$FRONTEND_PORT/ -----"
curl -fsSI "http://localhost:$FRONTEND_PORT/" | head -n 5 || true
echo

echo "[agro-local] Frontend: http://localhost:$FRONTEND_PORT"
echo "[agro-local] Pressione Ctrl+C para encerrar backend e frontend."

wait "$BACKEND_PID" "$FRONTEND_PID"
