# .codex/setup.sh
#!/usr/bin/env bash
set -euo pipefail
echo "[SETUP] Instalando deps…"
npm ci --loglevel warn         # ou poetry install, pip, etc.