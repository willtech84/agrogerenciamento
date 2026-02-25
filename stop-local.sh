#!/usr/bin/env bash
set -euo pipefail

echo "[agro-local] Encerrando processos Node..."
if command -v taskkill >/dev/null 2>&1; then
  taskkill //F //IM node.exe >/dev/null 2>&1 || true
else
  pkill -f "node" >/dev/null 2>&1 || true
fi

echo "[agro-local] Portas monitoradas após limpeza:"
if command -v netstat >/dev/null 2>&1; then
  netstat -ano 2>/dev/null | (grep -E ':3000|:3001|:4000' || true)
fi
