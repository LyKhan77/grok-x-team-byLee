#!/usr/bin/env bash
# ==============================================================================
# Runner: Fase 3 — Multi-User Concurrency & Stress Testing Suite
# Output: Seluruh laporan & log disimpan di test/results/
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENDPOINT="${1:-http://127.0.0.1:8001/v1}"
OUTPUT_DIR="${SCRIPT_DIR}/results"

echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}   🚀 GSPExGrok Agent Concurrency & Multi-User Stress Test       ${NC}"
echo -e "${CYAN}=================================================================${NC}\n"

# 1. Pastikan folder output test/results tersedia
mkdir -p "$OUTPUT_DIR"

# 2. Cek Konektivitas ke Llama-server
HEALTH_URL="${ENDPOINT%/v1}/health"
echo -e "${YELLOW}1. Memeriksa status inference server: ${HEALTH_URL}...${NC}"

if curl -s --connect-timeout 5 "$HEALTH_URL" | grep -q "ok"; then
    echo -e "${GREEN}✔ Server online & berstatus OK!${NC}\n"
else
    echo -e "${RED}✖ Error: Server tidak merespon di ${HEALTH_URL}.${NC}"
    echo -e "${YELLOW}Pastikan llama-server sedang aktif (jalankan ./server-optimize.sh).${NC}"
    exit 1
fi

# 3. Jalankan Pengujian Konkurensi Python (1, 2, 4 Stream)
echo -e "${YELLOW}2. Menjalankan matriks pengujian beban paralel (1, 2, 4 Stream)...${NC}"
python3 "${SCRIPT_DIR}/benchmark_concurrency.py" \
    --endpoint "$ENDPOINT" \
    --model "qwen35" \
    --concurrency 1 2 4 \
    --max-tokens 512 \
    --temperature 0.7 \
    --output-dir "$OUTPUT_DIR"

echo -e "${GREEN}✔ Seluruh pengujian berhasil diselesaikan!${NC}"
echo -e "Laporan lengkap dapat dibaca di: ${CYAN}${OUTPUT_DIR}/benchmark_report.md${NC}\n"
