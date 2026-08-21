#!/usr/bin/env bash
# Selaraskan ~/.grok/config.toml mesin dev dengan server CooperxCompute.
# Idempoten, membuat backup, tidak butuh sudo, tidak butuh pull repo.
#   bash grok_client_patch.sh            # terapkan
#   bash grok_client_patch.sh --dry-run  # lihat diff saja
set -euo pipefail
# Temukan config.toml. Grok CLI menyimpannya di profil pengguna OS, yang TIDAK
# sama dengan $HOME ketika skrip dijalankan lewat WSL (bash dari PowerShell) —
# di sana $HOME adalah /home/<user> milik WSL, bukan C:\Users\<user>.
find_cfg() {
  local c
  [[ -n "${GROK_CONFIG:-}" ]] && { echo "$GROK_CONFIG"; return; }
  for c in "$HOME/.grok/config.toml" \
           "${USERPROFILE:-}/.grok/config.toml"; do
    [[ -n "$c" && -f "$c" ]] && { echo "$c"; return; }
  done
  # WSL (/mnt/c) dan Git Bash (/c) -> profil Windows.
  # Bisa cocok dengan lebih dari satu profil; menambal yang salah lebih buruk
  # daripada gagal, jadi ambiguitas dilaporkan alih-alih ditebak.
  local -a hits=()
  for c in /mnt/c/Users/*/.grok/config.toml /c/Users/*/.grok/config.toml; do
    [[ -f "$c" ]] && hits+=("$c")
  done
  if (( ${#hits[@]} == 1 )); then echo "${hits[0]}"; return; fi
  if (( ${#hits[@]} > 1 )); then
    { echo "AMBIGU: ditemukan ${#hits[@]} config di profil Windows:"
      printf '  %s\n' "${hits[@]}"
      echo "Pilih salah satu secara eksplisit:"
      echo "  GROK_CONFIG=<salah satu di atas> bash $0"
    } >&2
    return 2
  fi
  return 1
}

rc=0; CFG="$(find_cfg)" || rc=$?
(( rc == 2 )) && exit 1
if [[ -z "$CFG" || ! -f "$CFG" ]]; then
  echo "Tidak menemukan config.toml. Lokasi yang dicari:"
  echo "  \$GROK_CONFIG                       = ${GROK_CONFIG:-(tidak diset)}"
  echo "  \$HOME/.grok/config.toml            = $HOME/.grok/config.toml"
  echo "  \$USERPROFILE/.grok/config.toml     = ${USERPROFILE:-(tidak diset)}/.grok/config.toml"
  echo "  /mnt/c/Users/*/.grok/config.toml    (WSL)"
  echo "  /c/Users/*/.grok/config.toml        (Git Bash)"
  echo
  echo "Bila memakai WSL/Git Bash di Windows, tunjuk langsung ke profil Windows:"
  echo "  GROK_CONFIG=/mnt/c/Users/<nama>/.grok/config.toml bash $0"
  echo "Bila memang belum pernah setup, jalankan setup.ps1 atau setup.sh dulu."
  exit 1
fi
echo "Config: $CFG"

TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
cp "$CFG" "$TMP"

# 1. context window: 128K, selaras --ctx-size 393216 / 3 slot
sed -i -E 's/^([[:space:]]*context_window[[:space:]]*=[[:space:]]*)[0-9]+/\1131072/' "$TMP"
# 2. plafon output: 65536 membuat auto-compact mustahil terpicu (akar compaction failed)
sed -i -E 's/^([[:space:]]*(max_tokens|max_output_tokens|max_completion_tokens)[[:space:]]*=[[:space:]]*)[0-9]+/\112288/' "$TMP"
# 3. sampling: samakan PENUH dengan mode thinking resmi Qwen3.8 yang dipakai
#    server: temp 1.0, top_p 0.95, top_k 20, min_p 0.0, repeat 1.0, presence 0.0
sed -i -E 's/^([[:space:]]*temperature[[:space:]]*=[[:space:]]*).*/\11.0/' "$TMP"
sed -i -E 's/^([[:space:]]*top_p[[:space:]]*=[[:space:]]*).*/\10.95/' "$TMP"
# min_p/repeat_penalty/presence_penalty di luar nilai resmi thinking-mode Qwen3.8
# akan MENIMPA setelan server, karena parameter sampling dari klien menang pada
# API OpenAI-compatible. repeat_penalty 1.1 + presence_penalty 0.1 khususnya
# menekan penalaran panjang — persis yang tidak diinginkan pada reasoning xhigh.
sed -i -E 's/^([[:space:]]*min_p[[:space:]]*=[[:space:]]*).*/\10.0/' "$TMP"
sed -i -E 's/^([[:space:]]*repeat_penalty[[:space:]]*=[[:space:]]*).*/\11.0/' "$TMP"
sed -i -E 's/^([[:space:]]*presence_penalty[[:space:]]*=[[:space:]]*).*/\10.0/' "$TMP"
sed -i -E 's/^([[:space:]]*top_k[[:space:]]*=[[:space:]]*).*/\120/' "$TMP"
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
