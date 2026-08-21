#!/usr/bin/env bash
# Restart llamacpp.service hanya saat semua slot idle.
#
#   sudo /home/gspe-ai1/project/gspexgrok-agent/scripts/llamacpp-safe-restart.sh
#
# Opsi:
#   --wait N    detik maksimum menunggu idle (default 900)
#   --force     restart segera tanpa menunggu idle (memutus request berjalan)
set -euo pipefail

WAIT=900; FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --wait)  WAIT="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) echo "opsi tidak dikenal: $1"; exit 2 ;;
  esac
done

PORT=8001
busy_count() {
  curl -s --max-time 5 "http://127.0.0.1:$PORT/slots" 2>/dev/null \
    | python3 -c 'import json,sys; print(sum(1 for x in json.load(sys.stdin) if x.get("is_processing")))' 2>/dev/null \
    || echo -1        # -1 = tidak bisa dibaca (server mati/tidak sehat)
}

if [[ $FORCE -eq 0 ]]; then
  echo "Menunggu semua slot idle (maks ${WAIT}s)..."
  deadline=$(( $(date +%s) + WAIT ))
  while :; do
    b=$(busy_count)
    if [[ "$b" == "0" ]]; then echo "Idle. Melanjutkan restart."; break; fi
    if [[ "$b" == "-1" ]]; then echo "Server tidak merespons — restart langsung."; break; fi
    if [[ $(date +%s) -ge $deadline ]]; then
      echo "BATAL: masih $b slot sibuk setelah ${WAIT}s. Tidak ada yang diubah."
      echo "       Gunakan --force jika memang ingin memutus request berjalan."
      exit 1
    fi
    sleep 5
  done
fi

echo "Restarting llamacpp.service ..."
systemctl restart llamacpp.service

echo "Menunggu health OK (maks 180s)..."
deadline=$(( $(date +%s) + 180 ))
while :; do
  if curl -s --max-time 5 "http://127.0.0.1:$PORT/health" 2>/dev/null | grep -q '"ok"'; then
    echo "SEHAT. Server siap."
    nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits \
      | awk '{s+=$1} END {printf "VRAM: %d MiB (%.1f%%)\n", s, s*100/73728}'
    exit 0
  fi
  if ! systemctl is-active --quiet llamacpp.service; then
    echo "GAGAL: service tidak aktif. 20 baris log terakhir:"
    journalctl -u llamacpp.service -n 20 --no-pager
    exit 1
  fi
  [[ $(date +%s) -ge $deadline ]] && { echo "TIMEOUT: belum sehat setelah 180s."; exit 1; }
  sleep 5
done
