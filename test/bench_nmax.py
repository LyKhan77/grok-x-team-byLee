#!/usr/bin/env python3
"""
Benchmark terkontrol untuk sweep --spec-draft-n-max pada CooperxCompute.

Berbeda dari sampel trafik produksi (variansi 5-70 TPS), benchmark ini memakai
prompt tetap, max_tokens tetap, dan tingkat konkurensi tetap, lalu mengambil
angka OTORITATIF dari print_timing server (decode TPS murni dan draft acceptance),
bukan dari latensi end-to-end klien.

Hanya stdlib -- tidak butuh httpx.
"""
import argparse, json, re, subprocess, sys, threading, time, urllib.request

PROMPTS = [
    "Write a Python class implementing an LRU cache with O(1) get and put. Include type hints and a docstring. Only output code.",
    "Write a Rust function that parses a semver string into (major, minor, patch) with error handling. Only output code.",
    "Write a TypeScript debounce function with correct `this` binding and cancel support. Include JSDoc. Only output code.",
    "Write a SQL query that finds the top 5 customers by total order value in the last 90 days, with a CTE. Only output SQL.",
]

def one_request(url, model, prompt, max_tokens, out, idx):
    body = json.dumps({"model": model,
                       "messages": [{"role": "user", "content": prompt}],
                       "max_tokens": max_tokens}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    t0 = time.time()
    try:
        r = json.load(urllib.request.urlopen(req, timeout=900))
        out[idx] = {"ok": True, "elapsed": time.time() - t0,
                    "tokens": r.get("usage", {}).get("completion_tokens", 0)}
    except Exception as e:
        out[idx] = {"ok": False, "error": f"{type(e).__name__}: {e}"}

def journal_since(ts):
    """Ambil print_timing dari journal sejak timestamp -- angka otoritatif server."""
    try:
        raw = subprocess.run(["journalctl", "-u", "llamacpp.service", "--no-pager",
                              "--since", ts, "-o", "cat"],
                             capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return []
    recs = {}
    for line in raw.split("\n"):
        m = re.search(r"task (\d+)", line)
        if not m:
            continue
        k = m.group(1)
        if re.search(r"\|\s+eval time", line) and "prompt eval" not in line:
            g = re.search(r"/ *(\d+) tokens \( *[\d.]+ ms per token, *([\d.]+) tokens per second", line)
            if g:
                recs.setdefault(k, {})["gen"] = int(g.group(1))
                recs[k]["tps"] = float(g.group(2))
        elif "draft acceptance" in line:
            g = re.search(r"= ([\d.]+) \( *(\d+) accepted / *(\d+) generated\), mean len = *([\d.]+)", line)
            if g:
                recs.setdefault(k, {})["acc"] = float(g.group(1))
                recs[k]["mlen"] = float(g.group(4))
    return [v for v in recs.values() if "tps" in v and v.get("gen", 0) >= 50]

def run_tier(url, model, conc, max_tokens, reps):
    results = []
    for rep in range(reps):
        out = [None] * conc
        ths = [threading.Thread(target=one_request,
                                args=(url, model, PROMPTS[(rep * conc + i) % len(PROMPTS)],
                                      max_tokens, out, i))
               for i in range(conc)]
        t0 = time.time()
        for t in ths: t.start()
        for t in ths: t.join()
        wall = time.time() - t0
        ok = [o for o in out if o and o["ok"]]
        results.append({"wall": wall,
                        "tokens": sum(o["tokens"] for o in ok),
                        "failed": conc - len(ok)})
        time.sleep(2)
    return results

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="http://127.0.0.1:8001/v1/chat/completions")
    p.add_argument("--model", default="qwen35")
    p.add_argument("--concurrency", nargs="+", type=int, default=[1, 2, 4])
    p.add_argument("--max-tokens", type=int, default=400)
    p.add_argument("--reps", type=int, default=2)
    p.add_argument("--label", default="run")
    p.add_argument("--json-out", default=None)
    a = p.parse_args()

    start_ts = subprocess.run(["date", "+%Y-%m-%d %H:%M:%S"],
                              capture_output=True, text=True).stdout.strip()
    time.sleep(1)
    report = {"label": a.label, "max_tokens": a.max_tokens, "tiers": {}}
    print(f"\n=== BENCHMARK: {a.label} ===")
    print(f"{'konkurensi':>11}{'agregat t/s':>14}{'per-stream':>12}{'gagal':>7}")
    for c in a.concurrency:
        rs = run_tier(a.url, a.model, c, a.max_tokens, a.reps)
        tot_tok = sum(r["tokens"] for r in rs)
        tot_wall = sum(r["wall"] for r in rs)
        failed = sum(r["failed"] for r in rs)
        agg = tot_tok / tot_wall if tot_wall else 0
        report["tiers"][str(c)] = {"aggregate_tps": round(agg, 2),
                                   "per_stream_tps": round(agg / c, 2),
                                   "tokens": tot_tok, "failed": failed}
        print(f"{c:>11}{agg:>14.1f}{agg/c:>12.1f}{failed:>7}")

    time.sleep(3)
    recs = journal_since(start_ts)
    if recs:
        tps = [r["tps"] for r in recs]
        ml = [r["mlen"] for r in recs if "mlen" in r]
        acc = [r["acc"] for r in recs if "acc" in r]
        report["server_side"] = {
            "n": len(recs),
            "decode_tps_mean": round(sum(tps) / len(tps), 2),
            "decode_tps_max": round(max(tps), 2),
            "mean_len_mean": round(sum(ml) / len(ml), 2) if ml else None,
            "acceptance_mean": round(sum(acc) / len(acc), 3) if acc else None,
        }
        s = report["server_side"]
        print(f"\n  print_timing server (n={s['n']}):")
        print(f"    decode TPS  rata2 {s['decode_tps_mean']}  max {s['decode_tps_max']}")
        print(f"    mean_len    {s['mean_len_mean']}   acceptance {s['acceptance_mean']}")
    else:
        print("\n  (print_timing tidak terbaca dari journal)")

    if a.json_out:
        with open(a.json_out, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n  hasil -> {a.json_out}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
