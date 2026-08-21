#!/usr/bin/env bash
# Selaraskan ~/.grok/config.toml mesin dev dengan server CooperxCompute.
# Idempoten, membuat backup, tidak butuh sudo, tidak butuh pull repo.
#   bash grok_client_patch.sh            # terapkan
#   bash grok_client_patch.sh --dry-run  # lihat diff saja
set -euo pipefail
CFG="${GROK_CONFIG:-$HOME/.grok/config.toml}"
[[ -f "$CFG" ]] || { echo "Tidak ada $CFG — jalankan setup.sh dulu."; exit 1; }

TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
cp "$CFG" "$TMP"

# 1. context window: 128K, selaras --ctx-size 393216 / 3 slot
sed -i -E 's/^([[:space:]]*context_window[[:space:]]*=[[:space:]]*)[0-9]+/\1131072/' "$TMP"
# 2. plafon output: 65536 membuat auto-compact mustahil terpicu (akar compaction failed)
sed -i -E 's/^([[:space:]]*(max_tokens|max_output_tokens|max_completion_tokens)[[:space:]]*=[[:space:]]*)[0-9]+/\112288/' "$TMP"
# 3. sampling: samakan dengan mode thinking resmi Qwen3.8 yang dipakai server
sed -i -E 's/^([[:space:]]*temperature[[:space:]]*=[[:space:]]*).*/\11.0/' "$TMP"
sed -i -E 's/^([[:space:]]*top_p[[:space:]]*=[[:space:]]*).*/\10.95/' "$TMP"
# 4. label yang menyesatkan -> 128K
sed -i -E 's/Monster Context Window/Context Window/g; s/[0-9]+K (Dedicated|Monster Context Window|Context Window)/128K \1/g' "$TMP"

echo "=== perubahan ==="
if diff -u "$CFG" "$TMP"; then echo "(sudah selaras, tidak ada yang diubah)"; fi
echo "================="
[[ "${1:-}" == "--dry-run" ]] && { echo "DRY-RUN: tidak ada yang ditulis."; exit 0; }
diff -q "$CFG" "$TMP" >/dev/null && { echo "Sudah selaras."; exit 0; }

BAK="$CFG.bak.$(date +%Y%m%d-%H%M%S)"
cp "$CFG" "$BAK"; cat "$TMP" > "$CFG"
echo "OK: $CFG diperbarui (backup: $BAK)"
echo "Mulai sesi Grok BARU agar config terbaca ulang."
