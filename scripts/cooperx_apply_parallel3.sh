#!/usr/bin/env bash
# Terapkan arsitektur serving "parallel 3 @ 131K" pada run-qwen.sh.
#
#   --parallel        4 -> 3        3 slot adalah agregat terukur terbaik (48,8 TPS)
#   --ctx-size   688128 -> 393216   3 x 131.072
#   --spec-draft-n-max 7 -> 5       memangkas 2,0 GiB bidang state SSM
#   --cache-type-k/v  q4_0 -> q8_0  KV 8-bit; anggaran datang dari slot yang dikurangi
#   --cache-ram       0 -> 16384    NYALAKAN prompt cache (lihat catatan di bawah)
#   --override-kv  172032 -> 131072
#
# Mengapa cache-ram wajib: 2,2% request menyumbang 72,3% beban prefill karena
# sesi yang tergusur harus diproses ulang dari nol. Turun ke 3 slot dengan 4
# developer MEMPERBANYAK penggusuran, jadi prompt cache bukan opsional lagi.
# RAM tersedia 43 GiB; satu context 131K q8_0 = 4,25 GiB.
#
# Prediksi VRAM 58,8 GiB = 81,7%. Ini PREDIKSI, wajib diverifikasi setelah start.
#
#   --dry-run   tampilkan diff saja
#   --rollback  kembali ke parallel 4 @ 168K, n-max 7, q4_0, cache-ram 0
set -euo pipefail
RUN=/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh
MODE=apply
[[ "${1:-}" == "--dry-run"  ]] && MODE=dry
[[ "${1:-}" == "--rollback" ]] && MODE=rollback
[[ -f "$RUN" ]] || { echo "FATAL: $RUN tidak ada"; exit 1; }

TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT; cp "$RUN" "$TMP"

set_flag() {  # set_flag <nama-flag> <nilai>
  local f="$1" v="$2"
  if grep -qE -- "^\s*$f " "$TMP"; then
    sed -i -E "s|^(\s*)$f [^ \\\\]*|\1$f $v|" "$TMP"
  else
    echo "  ! flag $f tidak ditemukan — dilewati" >&2
  fi
}

if [[ "$MODE" == rollback ]]; then
  set_flag "--parallel" 4
  set_flag "--ctx-size" 688128
  set_flag "--spec-draft-n-max" 7
  set_flag "--cache-type-k" q4_0
  set_flag "--cache-type-v" q4_0
  set_flag "--cache-ram" 0
  set_flag "--override-kv" "qwen35.context_length=int:172032"
else
  set_flag "--parallel" 3
  set_flag "--ctx-size" 393216
  set_flag "--spec-draft-n-max" 5
  set_flag "--cache-type-k" q8_0
  set_flag "--cache-type-v" q8_0
  set_flag "--cache-ram" 16384
  set_flag "--override-kv" "qwen35.context_length=int:131072"
fi

echo "=== diff ==="
diff -u "$RUN" "$TMP" || true
echo "============"

bash -n "$TMP" || { echo "FATAL: hasil transform tidak valid secara sintaks"; exit 1; }
n_cont=$(grep -c '\\$' "$TMP"); n_line=$(wc -l < "$TMP")
echo "backslash penerus: $n_cont / $n_line baris"
[[ $n_cont -eq $((n_line-3)) ]] || { echo "FATAL: rantai baris rusak"; exit 1; }

[[ "$MODE" == dry ]] && { echo "DRY-RUN: tidak ada yang ditulis."; exit 0; }
diff -q "$RUN" "$TMP" >/dev/null && { echo "Sudah sesuai."; exit 0; }

BAK="${RUN}.bak.$(date +%Y%m%d-%H%M%S)"
cp "$RUN" "$BAK"; cat "$TMP" > "$RUN"; chmod +x "$RUN"
echo "OK: diperbarui (backup: $BAK)"
echo
echo "Berikutnya:  sudo /usr/local/bin/llamacpp-safe-restart.sh"
echo "Lalu VERIFIKASI VRAM <= 84%:"
echo "  nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits | awk '{s+=\$1} END {printf \"%.1f%%\\n\", s*100/73728}'"
