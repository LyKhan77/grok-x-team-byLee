#!/usr/bin/env bash
# ==============================================================================
# Promote DFLASH 2 ke produksi (CooperxCompute).
#
# Mengubah /home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh agar:
#   - memakai binary hasil build PR #27342 (/home/gspe-ai1/llama.cpp-dflash2)
#   - memakai drafter DFlash2 (--spec-type draft-dflash, --spec-draft-n-max 7)
#   - opsional menaikkan --ctx-size (arg pertama, default tetap 524288)
#
# CATATAN: server dikelola systemd unit `llamacpp.service` (Restart=always).
# Cara benar menghentikannya adalah `sudo systemctl stop llamacpp.service`.
# Skrip ini HANYA menulis config; restart dilakukan terpisah agar sadar-downtime.
# ==============================================================================
set -euo pipefail

RUNNER="/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh"
BACKUP="/home/gspe-ai1/llama.cpp/build/bin/run-qwen.pre-dflash2.bak.sh"
NEWBIN="/home/gspe-ai1/llama.cpp-dflash2/build/bin/llama-server"
DRAFT="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf"
CTX="${1:-524288}"

[ -x "$NEWBIN" ] || { echo "ERROR: binary DFlash2 tidak ditemukan: $NEWBIN"; exit 1; }
[ -f "$DRAFT" ]  || { echo "ERROR: drafter tidak ditemukan: $DRAFT"; exit 1; }
[ -f "$BACKUP" ] || cp "$RUNNER" "$BACKUP"

sed -i \
  -e "s|^CUDA_VISIBLE_DEVICES=0,1,2 ./llama-server|CUDA_VISIBLE_DEVICES=0,1,2 $NEWBIN|" \
  -e 's|--spec-type draft-simple|--spec-type draft-dflash|' \
  -e "s|--model-draft .*|--model-draft $DRAFT \\\\|" \
  -e 's|--spec-draft-n-max 8|--spec-draft-n-max 7|' \
  -e "s|--ctx-size [0-9]*|--ctx-size $CTX|" \
  "$RUNNER"

echo "run-qwen.sh diperbarui (ctx=$CTX). Perubahan:"
diff "$BACKUP" "$RUNNER" || true
echo
echo "Restart dengan:  sudo systemctl restart llamacpp.service"
