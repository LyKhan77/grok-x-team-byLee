#!/usr/bin/env bash
# ==============================================================================
# CooperxCompute — Langkah 1 tuning (dynamic KV pool + parameter default Qwen)
#
#   arg 1: --ctx-size pool  (default 655360)
#   arg 2: --cache-ram MiB  (default 24576)
#
# Perubahan terhadap config produksi:
#   1. --kv-unified          Pool KV bersama. n_ctx_seq = n_ctx (server meng-cap ke
#                            n_ctx_train = 262.144 per user). Tanpa ini,
#                            try_clear_idle_slots() di server-context.cpp:1612
#                            langsung return -> slot kosong menyandera VRAM.
#   2. --cache-ram N         Slot idle digusur ke prompt cache RAM, bukan hilang.
#                            Saat user kembali, prompt dipulihkan tanpa prefill ulang.
#   3. --spec-draft-n-max 4  Dari 7. Acceptance terukur ~3,0, jadi men-draft 7 token
#                            membuang komputasi verifikasi -- dan pemborosan itu
#                            berlipat di bawah konkurensi.
#   4. Sampling default Qwen3.8 thinking-mode: temp 1.0 / top-p 0.95 / top-k 20 /
#                            min-p 0 / presence 0 / repeat 1.0 (mati).
#                            repeat-penalty 1.10 bekerja tiap langkah dan menolak
#                            draft token DFLASH 2.
#   5. Hapus --spec-draft-type-k/v (terbukti tidak berefek pada cache drafter dflash).
#
# Restart terpisah:  sudo systemctl restart llamacpp.service
# Rollback:          bash scripts/dflash2_rollback.sh
# ==============================================================================
set -euo pipefail

RUNNER="${RUNNER:-/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh}"
BACKUP="${BACKUP:-/home/gspe-ai1/llama.cpp/build/bin/run-qwen.pre-tuning.bak.sh}"
CTX="${1:-655360}"
CRAM="${2:-24576}"

[ -f "$RUNNER" ] || { echo "ERROR: runner tidak ditemukan: $RUNNER"; exit 1; }
[ -f "$BACKUP" ] || cp "$RUNNER" "$BACKUP"

RUNNER="$RUNNER" CTX="$CTX" CRAM="$CRAM" python3 - <<'PY'
import os
runner, ctx, cram = os.environ["RUNNER"], os.environ["CTX"], os.environ["CRAM"]

# nilai baru untuk flag yang sudah ada
REPLACE = {
    "--ctx-size":          f"--ctx-size {ctx}",
    "--spec-draft-n-max":  "--spec-draft-n-max 4",
    "--temp":              "--temp 1.0",
    "--top-p":             "--top-p 0.95",
    "--top-k":             "--top-k 20",
    "--min-p":             "--min-p 0.0",
    "--presence-penalty":  "--presence-penalty 0.0",
    "--repeat-penalty":    "--repeat-penalty 1.0",
}
# flag yang dibuang seluruhnya
DROP = ("--spec-draft-type-k", "--spec-draft-type-v",
        "--kv-unified", "--cache-ram", "--repeat-last-n", "--reasoning-effort")
# flag baru, disisipkan setelah --spec-draft-n-min
INSERT = [f"--kv-unified", f"--cache-ram {cram}", "--repeat-last-n 0",
          "--reasoning-effort xhigh"]

out, anchored = [], False
for ln in open(runner, encoding="utf-8").read().split("\n"):
    s = ln.strip()
    if any(s.startswith(d) for d in DROP):
        continue
    for k, v in REPLACE.items():
        if s.startswith(k + " ") or s == k or s.startswith(k + "="):
            ln = f"  {v} \\"
            break
    out.append(ln)
    if s.startswith("--spec-draft-n-min"):
        anchored = True
        out.extend(f"  {f} \\" for f in INSERT)

if not anchored:
    raise SystemExit("ERROR: baris --spec-draft-n-min tidak ditemukan; runner tak dikenali")
open(runner, "w", encoding="utf-8").write("\n".join(out))
PY

echo "run-qwen.sh diperbarui (pool ctx=$CTX, cache-ram=${CRAM} MiB). Perubahan:"
diff "$BACKUP" "$RUNNER" || true
echo
echo "Restart dengan:  sudo systemctl restart llamacpp.service"
