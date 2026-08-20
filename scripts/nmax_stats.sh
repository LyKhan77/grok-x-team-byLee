#!/usr/bin/env bash
# ==============================================================================
# Statistik spekulatif dari beban NYATA, tanpa mengirim request apa pun.
# Membaca print_timing llama-server dari journal, dikelompokkan per nilai n-max.
#
#   bash scripts/nmax_stats.sh            # sejak hari ini
#   bash scripts/nmax_stats.sh "-2h"      # 2 jam terakhir
#   bash scripts/nmax_stats.sh "16:40"    # sejak jam tertentu
#
# Kenapa ini lebih baik dari benchmark sintetis: tidak ada kontaminasi antrean,
# dan yang terukur adalah kondisi kerja sesungguhnya.
# ==============================================================================
SINCE="${1:-today}"
journalctl -u llamacpp.service --no-pager --since "$SINCE" 2>/dev/null \
  | sed 's/^.*run-qwen.sh\[[0-9]*\]: //' \
  | grep -E "n_max=|draft acceptance|\| +eval time =" \
  | python3 -c '
import re, sys
cur = None
g = {}
pend = {}
for l in sys.stdin:
    m = re.search(r"n_max=(\d+)", l)
    if m:
        cur = int(m.group(1)); g.setdefault(cur, []); continue
    if cur is None: continue
    t = re.search(r"task (\d+)", l)
    if not t: continue
    k = t.group(1)
    if re.search(r"\|\s+eval time", l) and "prompt eval" not in l:
        e = re.search(r"/ *(\d+) tokens \( *[\d.]+ ms per token, *([\d.]+) tokens", l)
        if e: pend[k] = {"gen": int(e.group(1)), "tps": float(e.group(2))}
    elif "draft acceptance" in l:
        a = re.search(r"= ([\d.]+) \(.*mean len = *([\d.]+)", l)
        if a and k in pend:
            r = pend.pop(k); r["acc"] = float(a.group(1)); r["mlen"] = float(a.group(2))
            if r["gen"] >= 40: g[cur].append(r)

print("%6s%7s%10s%12s%10s%10s" % ("n-max","n req","mean_len","acceptance","TPS med","TPS p90"))
print("-" * 55)
for n in sorted(g):
    rs = g[n]
    if not rs:
        print(f"{n:>6}{0:>7}   (tidak ada request)"); continue
    ml = sorted(x["mlen"] for x in rs); ac = sorted(x["acc"] for x in rs); tp = sorted(x["tps"] for x in rs)
    med = lambda a: a[len(a)//2]
    p90 = lambda a: a[min(len(a)-1, int(len(a)*0.9))]
    print(f"{n:>6}{len(rs):>7}{sum(ml)/len(ml):>10.2f}{sum(ac)/len(ac):>12.3f}{med(tp):>10.1f}{p90(tp):>10.1f}")
print()
print("mean_len = token diterima per verification pass -> penggerak utama TPS")
print("TPS median dipakai, bukan rata-rata, karena beban produksi sangat skewed")
'
