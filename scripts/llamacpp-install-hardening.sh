#!/usr/bin/env bash
# Pasang pengerasan systemd untuk llamacpp.service. Butuh sudo.
# TIDAK merestart server — perubahan berlaku pada restart berikutnya.
#   --uninstall  kembalikan konfigurasi sebelumnya
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Jalankan dengan sudo."; exit 1; }

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DROPIN=/etc/systemd/system/llamacpp.service.d/override.conf
BAK="${DROPIN}.bak"

if [[ "${1:-}" == "--uninstall" ]]; then
  [[ -f "$BAK" ]] || { echo "Tidak ada backup di $BAK"; exit 1; }
  cp "$BAK" "$DROPIN"; systemctl daemon-reload
  echo "Dikembalikan dari $BAK. Berlaku pada restart berikutnya."; exit 0
fi

# 1. salin skrip ke luar repo agar tidak hilang saat ganti branch
install -m 755 "$SRC_DIR/llamacpp-preflight.sh"    /usr/local/bin/llamacpp-preflight.sh
install -m 755 "$SRC_DIR/llamacpp-safe-restart.sh" /usr/local/bin/llamacpp-safe-restart.sh
echo "✔ skrip terpasang di /usr/local/bin"

# 2. preflight harus lolos SEKARANG, sebelum jadi gerbang start
if ! /usr/local/bin/llamacpp-preflight.sh; then
  echo "✘ BATAL: preflight gagal pada config saat ini. Drop-in tidak dipasang."
  exit 1
fi
echo "✔ preflight lolos pada config produksi"

# 3. backup lalu pasang drop-in
if [[ -f "$DROPIN" && ! -f "$BAK" ]]; then
  cp "$DROPIN" "$BAK"; echo "✔ backup: $BAK"
elif [[ -f "$BAK" ]]; then
  echo "✔ backup asli sudah ada, dipertahankan: $BAK"
fi
install -m 644 "$SRC_DIR/systemd/override.conf" "$DROPIN"
systemctl daemon-reload
echo "✔ drop-in terpasang, daemon-reload selesai"

# 4. verifikasi unit valid dan properti benar-benar berubah
systemd-analyze verify llamacpp.service 2>&1 | grep -v '^$' || true
echo "--- properti efektif ---"
systemctl show llamacpp.service -p StartLimitBurst -p StartLimitIntervalUSec \
  -p TimeoutStopUSec -p ExecStartPre -p Environment
echo
echo "Server TIDAK direstart. Pengerasan aktif pada restart berikutnya."
echo "Restart aman:  sudo /usr/local/bin/llamacpp-safe-restart.sh"
