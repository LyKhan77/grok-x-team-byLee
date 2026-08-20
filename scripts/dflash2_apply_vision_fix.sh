#!/usr/bin/env bash
# ==============================================================================
# Memasang binary llama-server ber-patch perbaikan vision DFLASH 2.
#
# MASALAH: request multimodal ke produksi mengembalikan
#   HTTP 500 {"error":{"message":"decode() failed: failed to process speculative batch"}}
# Terverifikasi langsung di server ini pada 2026-08-20 dengan gambar uji 64x64.
# Error identik dengan laporan Shamish di ggml-org/llama.cpp#27342.
#
# PENYEBAB: target Qwen3.8 memakai M-RoPE. Baris embedding dari chunk gambar mtmd
# membawa posisi non-linear yang tidak dapat disimpan draft cache 1D DFlash, sehingga
# injeksi KV drafter gagal.
#
# PERBAIKAN: z-lab/llama.cpp-fork PR #1 -- "dflash: zero-fill draft-cache holes left
# by mtmd chunks and reused prefixes". 1 file, +74/-5, diterapkan bersih ke
# common/speculative.cpp pada pr-27342 @ 5ecbe1ac1.
# Patch tersimpan di scripts/dflash2_vision_fix.patch untuk provenance.
#
# STATUS UPSTREAM: PR masih open, belum merged. Saat sudah merged, rebuild dari
# master dan kembalikan BIN_PATH ke lokasi standar.
#
# Restart terpisah:  sudo systemctl restart llamacpp.service
# ==============================================================================
set -euo pipefail

RUNNER="${RUNNER:-/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh}"
OLD="/home/gspe-ai1/llama.cpp-dflash2/build/bin/llama-server"
NEW="/home/gspe-ai1/llama.cpp-dflash2/build-vfix/bin/llama-server"

[ -x "$NEW" ] || { echo "ERROR: binary ber-patch tidak ditemukan: $NEW"; exit 1; }
grep -q "$OLD" "$RUNNER" || { echo "ERROR: runner tidak menunjuk ke $OLD -- sudah dipasang?"; exit 1; }

sed -i "s|$OLD|$NEW|" "$RUNNER"
echo "run-qwen.sh diarahkan ke binary ber-patch vision."
grep -nE "llama-server" "$RUNNER"
echo
echo "Restart:  sudo systemctl restart llamacpp.service"
echo "Rollback: sed -i 's|$NEW|$OLD|' $RUNNER  && sudo systemctl restart llamacpp.service"
