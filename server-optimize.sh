#!/usr/bin/env bash
# ==============================================================================
# Script: High-Capacity Server Launcher (128K Dedicated Context per Dev)
# Total Context: 262,144 (2 Slots x 131,072 tokens)
# Hybrid Sampling: Min-P 0.05, Repeat Penalty 1.10, Top-K 20, Top-P 0.85
# ==============================================================================
set -e

# Model & Path
MODEL_PATH="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf"
MMPROJ_PATH="/home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf"
BIN_PATH="/home/gspe-ai1/llama.cpp/build/bin/llama-server"

# Parameter Server 128K Dedicated Context & Hybrid Sampling
# --ctx-size 262144: 262K total context
# --parallel 2: 131,072 tokens (128K) dedicated per developer slot
# --n-predict -1: Unlimited output generation
# --flash-attn on: Flash Attention untuk efisiensi VRAM KV-Cache
# --cache-type-k q8_0 --cache-type-v q8_0: Kuantisasi KV-Cache hemat 50% memori VRAM
# --temp 0.70 --top-p 0.85 --top-k 20 --min-p 0.05: Anti-halusinasi & thinking straight
# --repeat-penalty 1.10 --presence-penalty 0.1: Anti-looping proses CoT

echo "Memulai llama-server High-Capacity (128K Dedicated Context & Auto-Compact Ready)..."

CUDA_VISIBLE_DEVICES=0,1,2 $BIN_PATH \
  --model "$MODEL_PATH" \
  --mmproj "$MMPROJ_PATH" \
  --alias qwen35 \
  --jinja \
  --ctx-size 262144 \
  --n-predict -1 \
  --gpu-layers 999 \
  --tensor-split 1,1,1 \
  --parallel 2 \
  --batch-size 2048 \
  --ubatch-size 512 \
  --threads 16 \
  --flash-attn on \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 \
  --temp 0.70 \
  --top-p 0.85 \
  --top-k 20 \
  --min-p 0.05 \
  --repeat-penalty 1.10 \
  --presence-penalty 0.1 \
  --host 0.0.0.0 \
  --port 8001
