#!/usr/bin/env bash
# Rollback CooperxCompute ke config known-good (draft-simple + ctx 524288, VRAM 47.8 GB).
set -euo pipefail
RUNNER="/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh"
BACKUP="/home/gspe-ai1/llama.cpp/build/bin/run-qwen.pre-dflash2.bak.sh"
[ -f "$BACKUP" ] || { echo "ERROR: backup tidak ada: $BACKUP"; exit 1; }
cp "$BACKUP" "$RUNNER"
sed -i 's|--ctx-size [0-9]*|--ctx-size 524288|' "$RUNNER"
echo "run-qwen.sh dikembalikan ke config known-good."
grep -nE "llama-server|spec-type|model-draft|ctx-size|n-max" "$RUNNER"
echo
echo "Restart dengan:  sudo systemctl restart llamacpp.service"
