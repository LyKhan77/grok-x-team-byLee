#!/usr/bin/env bash
# ==============================================================================
# Script: High-Concurrency Multi-User Server Launcher for Team
# ==============================================================================
set -e

# Model & Path
MODEL_PATH="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf"
MMPROJ_PATH="/home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf"
BIN_PATH="/home/gspe-ai1/llama.cpp/build/bin/llama-server"

# Parameter Multi-User Concurrency
# --parallel 4: Mengizinkan 4 request/developer aktif bersamaan
# -fa: Flash Attention (Menghemat VRAM KV Cache secara signifikan)
# --cont-batching: Continuous batching untuk throughput maksimal
# --tensor-split 1,1,1: Distribusi seimbang di 3x GPU RTX 3090

echo "Memulai llama-server High-Concurrency Multi-User..."

CUDA_VISIBLE_DEVICES=0,1,2 $BIN_PATH \
  --model "$MODEL_PATH" \
  --mmproj "$MMPROJ_PATH" \
  --alias qwen35 \
  --jinja \
  --ctx-size 131072 \
  --gpu-layers 999 \
  --tensor-split 1,1,1 \
  --parallel 4 \
  --batch-size 2048 \
  --ubatch-size 512 \
  --threads 16 \
  --flash-attn \
  --host 0.0.0.0 \
  --port 8001
