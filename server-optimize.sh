#!/usr/bin/env bash
# ==============================================================================
# Script: CooperxCompute High-Capacity & DFLASH 2 Speculative Acceleration Launcher
# Architecture: CooperAgent (4 Slots x 256K Context = 1,048,576 Total Tokens)
# Hardware: 3x NVIDIA GeForce RTX 3090 (72 GB VRAM) + Intel Core Ultra 7 265
#
# ⚠️ SALINAN REFERENSI. Runner produksi yang sebenarnya adalah
#    /home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh, dijalankan systemd unit
#    `llamacpp.service` (Restart=always). Ubah config produksi lewat
#    scripts/dflash2_promote.sh, bukan lewat file ini.
# Foundation: Qwen3.8-27B Q8_0 (hybrid SSM/Attention, full_attention_interval=4)
# Drafter:    incoai/Qwen3.8-27B-DFlash2 Q4_K_M (block-diffusion, block_size=8)
#
# Catatan VRAM (terukur, bukan estimasi kasar):
#   - Target hanya punya 16 dari 64 layer ber-KV cache (hybrid SSM) -> 18 KiB/token @ q4_0
#     => 1.048.576 ctx  = 18.0 GiB KV
#   - Drafter DFlash2 memakai SWA window 2048 pada semua 5 layer => KV ~0.17 GiB saja
#   - Proyeksi total pada 1M ctx ~51.5 GiB / 72 GiB (BELUM terukur di GPU)
# ==============================================================================
set -e

# Model & Paths
MODEL_PATH="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf"
DRAFT_PATH="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf"
MMPROJ_PATH="/home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf"
# Binary dengan dukungan DFlash 2 (build llama.cpp PR #27342)
BIN_PATH="/home/gspe-ai1/llama.cpp-dflash2/build/bin/llama-server"

# Context: default 524288 (4 x 128K). Naikkan ke 1048576 (4 x 256K) setelah
# VRAM DFLASH 2 terukur nyata. n_ctx_train model = 262144.
CTX_SIZE="${CTX_SIZE:-524288}"

echo "Memulai CooperxCompute llama-server + DFLASH 2 (ctx=${CTX_SIZE}, 4 slot, 3x RTX 3090)..."

CUDA_VISIBLE_DEVICES=0,1,2 $BIN_PATH \
  --model "$MODEL_PATH" \
  --spec-type draft-dflash \
  --model-draft "$DRAFT_PATH" \
  --spec-draft-device CUDA0 \
  --spec-draft-ngl 999 \
  --spec-draft-n-max 7 \
  --spec-draft-n-min 2 \
  --mmproj "$MMPROJ_PATH" \
  --alias qwen35 \
  --jinja \
  --ctx-size "$CTX_SIZE" \
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
  --temp 0.70 \
  --top-p 0.85 \
  --top-k 20 \
  --min-p 0.05 \
  --repeat-penalty 1.10 \
  --presence-penalty 0.1 \
  --host 0.0.0.0 \
  --port 8001
