#!/usr/bin/env bash
# FASE 1 — naikkan context 131K -> 168K per user, tetap 3 slot.
#
#   --ctx-size    393216 -> 516096      3 x 172.032
#   --override-kv 131072 -> 172032
#
# Semua parameter lain TIDAK disentuh: parallel 3, n-max 5, KV q8_0,
# cache-ram 16384. Satu variabel per langkah.
#
# Prediksi VRAM 59.597 MiB = 80,8%. Ini PREDIKSI dengan galat diketahui:
# `base` diperlakukan konstan, padahal compute buffer kemungkinan ikut tumbuh
# saat ctx per slot naik. Prediksi sebelumnya meleset 6,4 poin ke arah aman.
# WAJIB diverifikasi setelah start; bila >84%, jalankan --rollback.
#
# Tujuan pengukuran: memunculkan sampel context 128-160K supaya pertanyaan
# "apakah tebing 128K masih ada setelah pindah ke KV q8_0" bisa dijawab.
# Selama plafon 131K, sampel itu mustahil ada.
#
#   --dry-run   tampilkan diff saja
#   --rollback  kembali ke 131K
set -euo pipefail
RUN=/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh
MODE=apply
[[ "${1:-}" == "--dry-run"  ]] && MODE=dry
[[ "${1:-}" == "--rollback" ]] && MODE=rollback
[[ -f "$RUN" ]] || { echo "FATAL: $RUN tidak ada"; exit 1; }

TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT; cp "$RUN" "$TMP"
set_flag() {
  local f="$1" v="$2"
  grep -qE -- "^\s*$f " "$TMP" || { echo "  ! flag $f tidak ada — dilewati" >&2; return; }
  sed -i -E "s|^(\s*)$f [^ \\\\]*|\1$f $v|" "$TMP"
}

if [[ "$MODE" == rollback ]]; then
  set_flag "--ctx-size" 393216
  set_flag "--override-kv" "qwen35.context_length=int:131072"
else
  set_flag "--ctx-size" 516096
  set_flag "--override-kv" "qwen35.context_length=int:172032"
fi

echo "=== diff ==="; diff -u "$RUN" "$TMP" || true; echo "============"
bash -n "$TMP" || { echo "FATAL: hasil transform tidak valid"; exit 1; }
n_cont=$(grep -c '\\$' "$TMP"); n_line=$(wc -l < "$TMP")
[[ $n_cont -eq $((n_line-3)) ]] || { echo "FATAL: rantai baris rusak ($n_cont/$n_line)"; exit 1; }
echo "rantai baris utuh: $n_cont penerus / $n_line baris"

# konsistensi: ctx-size harus tepat 3 x override-kv
CTX=$(grep -oE -- '--ctx-size [0-9]+' "$TMP" | awk '{print $2}')
OKV=$(grep -oE -- 'context_length=int:[0-9]+' "$TMP" | cut -d: -f2)
PAR=$(grep -oE -- '--parallel [0-9]+' "$TMP" | awk '{print $2}')
echo "cek: ctx-size $CTX = parallel $PAR x $OKV ?"
[[ $((PAR*OKV)) -eq $CTX ]] || { echo "FATAL: tidak konsisten ($PAR x $OKV = $((PAR*OKV)))"; exit 1; }
echo "  ✔ konsisten"

[[ "$MODE" == dry ]] && { echo "DRY-RUN: tidak ada yang ditulis."; exit 0; }
diff -q "$RUN" "$TMP" >/dev/null && { echo "Sudah sesuai."; exit 0; }
BAK="${RUN}.bak.$(date +%Y%m%d-%H%M%S)"
cp "$RUN" "$BAK"; cat "$TMP" > "$RUN"; chmod +x "$RUN"
echo "OK: diperbarui (backup: $BAK)"
cat <<'NEXT'

Berikutnya:
  1) sudo /usr/local/bin/llamacpp-safe-restart.sh
  2) VERIFIKASI VRAM — batalkan bila > 84%:
     nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits \
       | awk '{s+=$1} END {printf "%.1f%%\n", s*100/73728}'
  3) Tiap mesin dev: git pull && bash scripts/grok_client_patch.sh
  4) Setelah beberapa jam pemakaian:
     bash scripts/concurrency_stats.sh "<jam restart>"
NEXT
