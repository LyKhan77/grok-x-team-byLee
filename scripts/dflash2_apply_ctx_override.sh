#!/usr/bin/env bash
# Terapkan dua perubahan pada launcher produksi run-qwen.sh:
#   1. --override-kv qwen35.context_length=int:172032  (168K) -> klien (Grok CLI)
#      membaca n_ctx_train yang benar, sehingga auto-compact terpicu tepat waktu.
#   2. --spec-draft-n-max 7  (dari 6) -> uji apakah mean_len naik >5%.
#
# Idempoten: aman dijalankan berulang. Membuat backup bertimestamp.
# Pakai --dry-run untuk melihat diff tanpa mengubah apa pun.
# Pakai --rollback untuk kembali ke n-max 6 tanpa override-kv.
set -euo pipefail

RUN=/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh
CTX_OVERRIDE='  --override-kv qwen35.context_length=int:172032 \'
MODE=apply
[[ "${1:-}" == "--dry-run" ]] && MODE=dry
[[ "${1:-}" == "--rollback" ]] && MODE=rollback

[[ -f "$RUN" ]] || { echo "FATAL: $RUN tidak ada"; exit 1; }

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
cp "$RUN" "$TMP"

if [[ "$MODE" == rollback ]]; then
  sed -i '/--override-kv qwen35.context_length/d' "$TMP"
  sed -i 's|--spec-draft-n-max [0-9]*|--spec-draft-n-max 6|' "$TMP"
else
  # 1. sisipkan override-kv tepat sebelum baris --model (hanya jika belum ada)
  if ! grep -q -- '--override-kv qwen35.context_length' "$TMP"; then
    CTX_OVERRIDE="$CTX_OVERRIDE" awk '
      !done && /^  --model \/home/ { print ENVIRON["CTX_OVERRIDE"]; done=1 }
      { print }
    ' "$TMP" > "$TMP.new" && mv "$TMP.new" "$TMP"
  fi
  # 2. n-max 6 -> 7
  sed -i 's|--spec-draft-n-max [0-9]*|--spec-draft-n-max 7|' "$TMP"
fi

echo "=== diff yang akan diterapkan ==="
if diff -u "$RUN" "$TMP"; then
  echo "(tidak ada perubahan — konfigurasi sudah sesuai)"
fi
echo "================================="

if [[ "$MODE" == dry ]]; then
  echo "DRY-RUN: tidak ada yang diubah."
  exit 0
fi

if diff -q "$RUN" "$TMP" >/dev/null; then
  echo "Sudah sesuai, tidak perlu restart."
  exit 0
fi

BAK="${RUN}.bak.$(date +%Y%m%d-%H%M%S)"
cp "$RUN" "$BAK"
cat "$TMP" > "$RUN"
chmod +x "$RUN"
echo "OK: $RUN diperbarui (backup: $BAK)"
echo
echo "Langkah berikutnya (butuh sudo):"
echo "  sudo systemctl restart llamacpp.service"
