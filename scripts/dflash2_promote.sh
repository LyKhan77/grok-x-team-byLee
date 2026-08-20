#!/usr/bin/env bash
# ==============================================================================
# Promote DFLASH 2 ke produksi (CooperxCompute).
#
# Menulis ulang /home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh agar:
#   - memakai binary hasil build PR #27342 (/home/gspe-ai1/llama.cpp-dflash2)
#   - memakai drafter DFlash2 (--spec-type draft-dflash, --spec-draft-n-max 7)
#   - memberi konteks drafter akses ke SEMUA GPU (--spec-draft-device CUDA0,CUDA1,CUDA2)
#   - arg 1: --ctx-size          (default 524288)
#   - arg 2: tipe KV drafter     (f16 | q4_0 | q8_0, default f16)
#
# KENAPA semua GPU: drafter DFlash2 tidak punya output.weight/tok_embd sendiri
# (tensor non-blok-nya hanya enc.output_norm, fc, output_norm, selector_*), jadi ia
# MEMINJAM milik target. Dengan --tensor-split 1,1,1 output.weight target mendarat di
# CUDA2; kalau konteks drafter dipaku ke CUDA0 saja, ggml-backend.cpp:930 abort dengan
#   "pre-allocated tensor (output.weight) in a buffer (CUDA2) that cannot run the operation"
#
# KENAPA tipe KV drafter penting: DFlash 2 biasa (bukan DSpark) TIDAK memakai cache
# berjendela. llama-model.cpp memakai llama_kv_cache_iswa hanya bila dsv4_hc_mult > 0,
# selebihnya fallthrough ke KV ukuran penuh n_ctx_seq; metadata
# dflash.attention.sliding_window = 2048 diabaikan untuk varian ini. Drafter memakan
# 5*2*8*128*sizeof(type) per token = 20 KiB/token @ F16 (10.0 GiB @ 524288,
# 20.0 GiB @ 1048576). Dengan q4_0 turun jadi 2.8 / 5.6 GiB — SYARAT untuk 4 x 256K.
#
# CATATAN: server dikelola systemd unit `llamacpp.service` (Restart=always).
# Skrip ini HANYA menulis config; restart dilakukan terpisah agar sadar-downtime:
#   sudo systemctl restart llamacpp.service
# ==============================================================================
set -euo pipefail

RUNNER="${RUNNER:-/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh}"
BACKUP="${BACKUP:-/home/gspe-ai1/llama.cpp/build/bin/run-qwen.pre-dflash2.bak.sh}"
NEWBIN="/home/gspe-ai1/llama.cpp-dflash2/build/bin/llama-server"
DRAFT="/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf"
CTX="${1:-524288}"
DKV="${2:-f16}"

[ -x "$NEWBIN" ] || { echo "ERROR: binary DFlash2 tidak ditemukan: $NEWBIN"; exit 1; }
[ -f "$DRAFT" ]  || { echo "ERROR: drafter tidak ditemukan: $DRAFT"; exit 1; }
[ -f "$BACKUP" ] || cp "$RUNNER" "$BACKUP"
case "$DKV" in f16|q4_0|q8_0) ;; *) echo "ERROR: tipe KV drafter tak dikenal: $DKV"; exit 1;; esac

RUNNER="$RUNNER" NEWBIN="$NEWBIN" DRAFT="$DRAFT" CTX="$CTX" DKV="$DKV" python3 - <<'PY'
import os, re
runner, newbin, draft = os.environ["RUNNER"], os.environ["NEWBIN"], os.environ["DRAFT"]
ctx, dkv = os.environ["CTX"], os.environ["DKV"]

lines = open(runner, encoding="utf-8").read().split("\n")
out, seen_nmin = [], False
for ln in lines:
    s = ln.strip()
    # buang flag tipe KV drafter lama supaya tidak menumpuk saat dijalankan ulang
    if s.startswith("--spec-draft-type-k") or s.startswith("--spec-draft-type-v"):
        continue
    if s.startswith("CUDA_VISIBLE_DEVICES=") and "llama-server" in s:
        ln = re.sub(r"(CUDA_VISIBLE_DEVICES=\S+)\s+\S*llama-server", r"\1 " + newbin, ln)
    elif s.startswith("--spec-type"):
        ln = "  --spec-type draft-dflash \\"
    elif s.startswith("--model-draft"):
        ln = f"  --model-draft {draft} \\"
    elif s.startswith("--spec-draft-device"):
        ln = "  --spec-draft-device CUDA0,CUDA1,CUDA2 \\"
    elif s.startswith("--spec-draft-n-max"):
        ln = "  --spec-draft-n-max 7 \\"
    elif s.startswith("--ctx-size"):
        ln = f"  --ctx-size {ctx} \\"
    out.append(ln)
    if s.startswith("--spec-draft-n-min"):
        seen_nmin = True
        out.append(f"  --spec-draft-type-k {dkv} \\")
        out.append(f"  --spec-draft-type-v {dkv} \\")

if not seen_nmin:
    raise SystemExit("ERROR: baris --spec-draft-n-min tidak ditemukan; runner tak dikenali")

open(runner, "w", encoding="utf-8").write("\n".join(out))
PY

echo "run-qwen.sh diperbarui (ctx=$CTX, draft-KV=$DKV). Perubahan:"
diff "$BACKUP" "$RUNNER" || true
echo
echo "Restart dengan:  sudo systemctl restart llamacpp.service"
