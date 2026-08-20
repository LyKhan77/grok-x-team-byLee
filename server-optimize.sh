#!/usr/bin/env bash
# ==============================================================================
# Script: CooperxCompute Launcher — SALINAN REFERENSI
#
# ⚠️  FILE INI TIDAK DIJALANKAN OLEH APA PUN.
#     Runner produksi yang sebenarnya adalah
#       /home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh
#     dijalankan systemd unit `llamacpp.service` (Restart=always, TimeoutStop 90s).
#
#     Ubah config produksi lewat skrip, bukan lewat file ini:
#       scripts/dflash2_promote.sh          — promote DFLASH 2
#       scripts/cooperx_apply_tuning.sh     — ctx / cache-ram / ubatch / mode KV
#       scripts/dflash2_apply_vision_fix.sh — binary ber-patch vision
#       scripts/dflash2_rollback.sh         — kembali ke draft-simple
#
#     File ini adalah cermin dari config produksi per 2026-08-20, disimpan agar
#     isinya terlacak di git. Jaga tetap sinkron saat produksi berubah.
#
# Hardware: 3x RTX 3090 (72 GB) + Intel Core Ultra 7 265
# Target  : Qwen3.8-27B Q8_0 (arch qwen35, hybrid SSM+attention)
# Drafter : Qwen3.8-27B-DFlash2-Q4_K_M (block_size 8, meminjam output.weight target)
# Binary  : build PR #27342 + patch vision z-lab/llama.cpp-fork PR #1 (keduanya
#           BELUM merged upstream — saat merged, rebuild dari master)
#
# Catatan penting:
#   --spec-draft-device WAJIB mencakup semua GPU. Drafter tidak punya
#   output.weight sendiri dan meminjam milik target, yang di bawah
#   --tensor-split 1,1,1 mendarat di CUDA2. Membatasinya ke CUDA0 menyebabkan
#   abort di ggml-backend.cpp:930.
#
#   Sampling mengikuti rekomendasi resmi Qwen3.8 thinking-mode. repeat-penalty
#   di atas 1.0 bekerja setiap langkah dan menolak draft token DFLASH 2.
# ==============================================================================
set -e

cd /home/gspe-ai1/llama.cpp/build/bin
CUDA_VISIBLE_DEVICES=0,1,2 /home/gspe-ai1/llama.cpp-dflash2/build-vfix/bin/llama-server \
  --model /home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf \
  --spec-type draft-dflash \
  --model-draft /home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf \
  --spec-draft-device CUDA0,CUDA1,CUDA2 \
  --spec-draft-ngl 999 \
  --spec-draft-n-max 6 \
  --spec-draft-n-min 2 \
  --cache-ram 0 \
  --repeat-last-n 0 \
  --reasoning-effort xhigh \
  --mmproj /home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf \
  --alias qwen35 \
  --jinja \
  --ctx-size 688128 \
  --n-predict -1 \
  --gpu-layers 999 \
  --tensor-split 1,1,1 \
  --parallel 4 \
  --batch-size 4096 \
  --ubatch-size 1024 \
  --threads 16 \
  --threads-batch 20 \
  --poll 100 \
  --flash-attn on \
  --cache-type-k q4_0 \
  --cache-type-v q4_0 \
  --temp 1.0 \
  --top-p 0.95 \
  --top-k 20 \
  --min-p 0.0 \
  --repeat-penalty 1.0 \
  --presence-penalty 0.0 \
  --host 0.0.0.0 \
  --port 8001
