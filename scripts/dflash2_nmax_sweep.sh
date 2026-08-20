#!/usr/bin/env bash
# ==============================================================================
# Sweep --spec-draft-n-max untuk CooperxCompute.
#
# KENAPA: n-max diturunkan 7 -> 4 saat acceptance rate masih 0,26-0,43. Setelah
# sampling diselaraskan ke rekomendasi Qwen, acceptance naik ke 0,70-0,82 dan
# mean_len terukur (4,27) mentok tepat di plafon yang dipaksakan n-max 4.
# Optimumnya kemungkinan bergeser kembali ke atas.
#
# Model prediksi (overhead ~40 ms/pass, tervalidasi silang dengan rig lain):
#   n-max 4  -> mean_len 3,80  ->  70,6 TPS   (terukur)
#   n-max 6  -> mean_len ~4,80 ->  89,2 TPS   (ekstrapolasi)
#   n-max 7  -> mean_len ~5,40 -> 100,4 TPS   (ekstrapolasi, kemungkinan optimistis --
#              biaya verifikasi 8 token vs 5 per pass TIDAK dimodelkan)
#
# HARUS dijalankan dengan sudo karena melakukan systemctl restart:
#   sudo bash scripts/dflash2_nmax_sweep.sh [nilai...]      (default: 4 6 7)
#
# Butuh JENDELA HENING -- setiap restart membuang prompt cache developer, dan
# proses lama menunggu generasi aktif selesai (TimeoutStopUSec=1min 30s).
# ==============================================================================
set -uo pipefail

RUNNER="/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh"
REPO="/home/gspe-ai1/project/gspexgrok-agent"
OUTDIR="$REPO/test/results"
BENCH="$REPO/test/bench_nmax.py"
VALUES=("${@:-}"); [ -z "${VALUES[0]:-}" ] && VALUES=(4 6 7)
ORIG=$(grep -oE '\-\-spec-draft-n-max [0-9]+' "$RUNNER" | grep -oE '[0-9]+')

[ "$(id -u)" -eq 0 ] || { echo "ERROR: jalankan dengan sudo (perlu systemctl restart)"; exit 1; }
[ -f "$BENCH" ] || { echo "ERROR: benchmark tidak ditemukan: $BENCH"; exit 1; }
mkdir -p "$OUTDIR"

echo "n-max awal: $ORIG   |   akan diuji: ${VALUES[*]}"
echo "Setiap langkah: ubah config -> restart -> tunggu sehat -> benchmark"
echo

restore() {
  echo; echo ">>> Mengembalikan n-max ke $ORIG"
  sed -i "s|--spec-draft-n-max [0-9]*|--spec-draft-n-max $ORIG|" "$RUNNER"
  systemctl restart llamacpp.service
  echo ">>> Dikembalikan. Verifikasi manual: systemctl status llamacpp.service"
}
trap restore INT TERM

for N in "${VALUES[@]}"; do
  echo "=============================================================="
  echo ">>> n-max = $N"
  sed -i "s|--spec-draft-n-max [0-9]*|--spec-draft-n-max $N|" "$RUNNER"
  systemctl restart llamacpp.service

  for i in $(seq 1 40); do
    curl -sf -m 5 http://127.0.0.1:8001/health >/dev/null 2>&1 && break
    sleep 5
  done
  if ! curl -sf -m 5 http://127.0.0.1:8001/health >/dev/null 2>&1; then
    echo "!!! server tidak sehat pada n-max=$N -- dilewati"
    continue
  fi
  ACT=$(journalctl -u llamacpp.service --no-pager --since "-3min" 2>/dev/null | grep -oE 'n_max=[0-9]+' | tail -1)
  VRAM=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits | paste -sd+ | bc)
  echo ">>> sehat. server melaporkan $ACT | VRAM ${VRAM} MiB"

  python3 "$BENCH" --label "n-max=$N" --concurrency 1 2 4 --reps 2 \
          --json-out "$OUTDIR/bench_nmax_${N}.json"
  echo "{\"vram_mib\": $VRAM}" > "$OUTDIR/bench_nmax_${N}.vram.json"
done

trap - INT TERM
restore
[ -n "${SUDO_USER:-}" ] && chown -R "$SUDO_USER":"$SUDO_USER" "$OUTDIR" 2>/dev/null
echo
echo "=============================================================="
echo "Selesai. Hasil di $OUTDIR/bench_nmax_*.json"
