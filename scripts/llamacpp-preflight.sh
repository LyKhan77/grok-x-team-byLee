#!/usr/bin/env bash
# Dipanggil systemd sebagai ExecStartPre. Gagal di sini = server tidak pernah start,
# jadi config rusak tidak berubah menjadi crashloop yang menggilas GPU.
set -euo pipefail
RUN="${1:-/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh}"

[[ -x "$RUN" ]] || { echo "preflight: $RUN tidak ada / tidak executable"; exit 1; }
bash -n "$RUN" || { echo "preflight: sintaks run-qwen.sh rusak"; exit 1; }

# setiap path setelah --model / --model-draft / --mmproj harus ada
grep -oE -- '--(model|model-draft|mmproj) +[^ \\]+' "$RUN" | awk '{print $2}' | while read -r f; do
  [[ -f "$f" ]] || { echo "preflight: file model hilang: $f"; exit 1; }
done

BIN=$(grep -oE '/[^ ]*/llama-server' "$RUN" | head -1)
[[ -x "$BIN" ]] || { echo "preflight: binary tidak ada: $BIN"; exit 1; }

echo "preflight: OK"
