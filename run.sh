#!/usr/bin/env bash
# Runs both sites locally with hot reload: save a file, the page updates.
#   PT → http://localhost:3000    EN → http://localhost:3001
# Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")"

for port in 3000 3001; do
  if lsof -ti tcp:$port -sTCP:LISTEN >/dev/null; then
    echo "Port $port is already in use — is ./run.sh running in another terminal?" >&2
    exit 1
  fi
done

command -v pnpm >/dev/null || corepack enable
[ -d node_modules ] || pnpm install

trap 'kill 0' EXIT
pnpm dev &
pnpm dev:en &

until curl -s -o /dev/null http://localhost:3000; do sleep 0.5; done
open http://localhost:3000

wait
