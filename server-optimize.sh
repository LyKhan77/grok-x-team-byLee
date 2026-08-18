#!/usr/bin/env bash
# ==============================================================================
# Script: High-Concurrency Multi-User Server Launcher for Team (5 Developers)
# ==============================================================================
set -e

# Model & Path
MODEL_PATH="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf"
MMPROJ_PATH="/home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf"
BIN_PATH="/home/gspe-ai1/llama.cpp/build/bin/llama-server"

# Parameter Multi-User Concurrency & Long-Task
# --parallel 5: Mengizinkan 5 request/developer aktif bersamaan (Zero queue wait)
# --n-predict -1: Unlimited output generation (dibatasi oleh context window)
# --flash-attn: Flash Attention untuk efisiensi VRAM KV-Cache
# --cache-type-k q8_0 --cache-type-v q8_0: Kuantisasi KV-Cache hemat 50% memori VRAM
# --tensor-split 1,1,1: Distribusi seimbang di 3x GPU RTX 3090

echo "Memulai llama-server High-Concurrency Multi-User (5 Devs & Long-Task Ready)..."

CUDA_VISIBLE_DEVICES=0,1,2 $BIN_PATH \
  --model "$MODEL_PATH" \
  --mmproj "$MMPROJ_PATH" \
  --alias qwen35 \
  --jinja \
  --ctx-size 131072 \
  --n-predict -1 \
  --gpu-layers 999 \
  --tensor-split 1,1,1 \
  --parallel 5 \
  --batch-size 2048 \
  --ubatch-size 512 \
  --threads 16 \
  --flash-attn on \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 \
  --host 0.0.0.0 \
  --port 8001
