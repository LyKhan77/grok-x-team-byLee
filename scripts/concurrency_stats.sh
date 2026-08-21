#!/usr/bin/env bash
# Ukur TPS terhadap jumlah slot aktif DAN panjang context, dari journal produksi.
# Tidak mengirim request apa pun — murni membaca yang sudah terjadi.
#
#   bash scripts/concurrency_stats.sh            # sejak hari ini
#   bash scripts/concurrency_stats.sh "13:20"    # sejak jam tertentu
#
# Dipakai untuk menjawab satu pertanyaan: apakah tebing kinerja di atas
# ~128.000 token masih ada setelah pindah dari KV q4_0 ke q8_0?
set -euo pipefail
SINCE="${1:-today}"
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
journalctl -u llamacpp.service --since "$SINCE" --no-pager -o short-unix 2>/dev/null > "$TMP"
[[ -s "$TMP" ]] || { echo "Tidak ada log sejak '$SINCE'."; exit 1; }

python3 - "$TMP" <<'PY'
import re, sys, bisect, statistics as st
from collections import defaultdict
lines = open(sys.argv[1]).read().splitlines()
ev=[]; pend=defaultdict(list); out=[]
for line in lines:
    m=re.match(r'^(\d+\.\d+)', line)
    if not m: continue
    ts=float(m.group(1)); s=re.search(r'id\s+(\d+)', line)
    sid=int(s.group(1)) if s else None
    if 'launch_slot_' in line and sid is not None:
        ev.append((ts,'start',sid)); pend[sid]=[]
    elif sid is not None and re.search(r'n_gen =\s+\d+, tg =', line):
        pend[sid].append((ts, float(re.search(r'tg =\s+([\d.]+)', line).group(1))))
    elif 'release: id' in line and sid is not None:
        n=re.search(r'n_tokens = (\d+)', line)
        if n:
            for ts2,v in pend[sid]: out.append((ts2, v, int(n.group(1))))
        ev.append((ts,'stop',sid)); pend[sid]=[]

if not out:
    print("Belum ada sampel tg. Tunggu beberapa request selesai."); raise SystemExit

ev.sort(); tl=[]; act=set()
for ts,t,s in ev:
    act.add(s) if t=='start' else act.discard(s)
    tl.append((ts, len(act)))
T=[x[0] for x in tl]
def conc(ts):
    i=bisect.bisect_right(T, ts)-1
    return tl[i][1] if i>=0 else 1

BANDS=[(65536,'<64K'),(98304,'64-96K'),(131072,'96-128K'),(163840,'128-160K'),(10**9,'>160K')]
def band(n):
    for lo,lab in BANDS:
        if n < lo: return lab
g=defaultdict(list)
for ts,v,n in out: g[(conc(ts), band(n))].append(v)
order=[b[1] for b in BANDS]

def table(title, mult):
    print(f"\n{title}")
    print(f"{'slot':>5} " + "".join(f"{o:>16}" for o in order))
    print("-"*(5+16*len(order)))
    for c in range(1,5):
        row=f"{c:>5} "
        for o in order:
            v=g.get((c,o),[])
            cell = f"{st.median(v)*(c if mult else 1):6.1f} n={len(v):<4}" if len(v)>=8 else "-"
            row += f"{cell:>16}"
        print(row)

table("TPS median PER USER (dikontrol panjang context)", False)
table("AGREGAT (TPS x jumlah slot)", True)

print("\n--- ringkasan untuk keputusan tebing 128K ---")
for c in (2,3):
    lo=g.get((c,'96-128K'),[]); hi=g.get((c,'128-160K'),[])
    if len(lo)>=8 and len(hi)>=8:
        a,b=st.median(lo),st.median(hi)
        verd = "TEBING MASIH ADA" if b < a*0.5 else ("melandai" if b < a*0.8 else "TIDAK ADA TEBING")
        print(f"  {c} slot: 96-128K = {a:.1f} TPS  ->  128-160K = {b:.1f} TPS  ({100*b/a:.0f}%)  {verd}")
    else:
        print(f"  {c} slot: sampel belum cukup (96-128K n={len(lo)}, 128-160K n={len(hi)}; butuh >=8 masing-masing)")
print("\nKriteria: >128K dinyatakan aman bila TPS-nya >= 50% dari band 96-128K")
print("          DAN nilai absolutnya >= 20 TPS.")
PY
