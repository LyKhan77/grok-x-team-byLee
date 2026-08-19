#!/usr/bin/env bash
# ==============================================================================
# Script: High-Capacity & Speculative Accelerated Server Launcher (35–45+ TPS)
# Hardware: 3x NVIDIA GeForce RTX 3090 (72 GB VRAM) + Intel Core Ultra 7 265
# Foundation: Qwen 3.8 / 2.5 27B Q8_0 + Qwen 2.5 Coder 0.5B Draft Model
# Total Context: 262,144 (2 Slots x 131,072 Dedicated Context)
# ==============================================================================
set -e

# Model & Paths
MODEL_PATH="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf"
DRAFT_PATH="/home/gspe-ai1/models/qwen38-27b/Qwen2.5-Coder-0.5B-Q8_0.gguf"
MMPROJ_PATH="/home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf"
BIN_PATH="/home/gspe-ai1/llama.cpp/build/bin/llama-server"

echo "Memulai llama-server Speculative Accelerated (Target: 35–45+ TPS, 128K Dedicated Context)..."

CUDA_VISIBLE_DEVICES=0,1,2 $BIN_PATH \
  --model "$MODEL_PATH" \
  --spec-type draft-simple \
  --model-draft "$DRAFT_PATH" \
  --spec-draft-n-max 6 \
  --spec-draft-n-min 2 \
  --spec-draft-ngl 999 \
  --mmproj "$MMPROJ_PATH" \
  --alias qwen35 \
  --jinja \
  --ctx-size 262144 \
  --n-predict -1 \
  --gpu-layers 999 \
  --tensor-split 1,1,1 \
  --parallel 2 \
  --batch-size 4096 \
  --ubatch-size 1024 \
  --threads 16 \
  --threads-batch 20 \
  --poll 100 \
  --flash-attn on \
  --cache-type-k q4_0 \
  --cache-type-v q4_0 \
  --spec-draft-type-k q4_0 \
  --spec-draft-type-v q4_0 \
  --temp 0.70 \
  --top-p 0.85 \
  --top-k 20 \
  --min-p 0.05 \
  --repeat-penalty 1.10 \
  --presence-penalty 0.1 \
  --host 0.0.0.0 \
  --port 8001
