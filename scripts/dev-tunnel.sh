#!/usr/bin/env bash
# Runs the Vite dev server on port 5176 and exposes it at
# https://unibusdev.hejieming.com through the "unibusdev" Cloudflare tunnel.
set -euo pipefail

PORT=5176
CONFIG="$HOME/.cloudflared/config-unibus.yml"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed (brew install cloudflared)" >&2
  exit 1
fi

if [ ! -f "$CONFIG" ]; then
  echo "Missing tunnel config: $CONFIG" >&2
  exit 1
fi

pids=()
cleanup() {
  trap - INT TERM EXIT
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

npx vite --port "$PORT" --strictPort &
pids+=($!)

cloudflared tunnel --config "$CONFIG" run &
pids+=($!)

# Exit as soon as either process dies so the other gets torn down.
# (`wait -n` is unavailable on macOS' bash 3.2, so poll instead.)
while :; do
  for pid in "${pids[@]}"; do
    kill -0 "$pid" 2>/dev/null || exit 1
  done
  sleep 1
done
