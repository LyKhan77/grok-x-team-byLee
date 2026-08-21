#!/usr/bin/env bash
# Audit hasil compaction Grok dari berkas sesi lokal.
# Membaca ~/.grok/sessions/*/*/compaction_requests/*.json — tidak mengirim request.
#
# Grok memberi batas WALL-CLOCK 300 detik per percobaan dan mencoba 3 kali.
# Kegagalan muncul sebagai: "exceeded wall-clock budget 300s (runaway generation)".
#
#   bash scripts/compaction_audit.sh          # semua sesi
#   bash scripts/compaction_audit.sh <hari>   # mis. 2026-08-21
set -euo pipefail
FILTER="${1:-}"
python3 - "${HOME}/.grok/sessions" "$FILTER" <<'PY'
import json, sys, os, glob, urllib.parse
from collections import Counter
root, filt = sys.argv[1], sys.argv[2]
rows=[]
for f in glob.glob(os.path.join(root,'*','*','compaction_requests','*.json')):
    try: j=json.load(open(f))
    except Exception: continue
    created=j.get('created_at','')
    if filt and not created.startswith(filt): continue
    proj=urllib.parse.unquote(f.split(os.sep)[-4])
    s=j.get('summary') or ''
    det=j.get('attempt_details') or []
    ok=any(a.get('outcome')=='success' for a in det) if det else bool(s)
    rows.append({
        'time': created[:19].replace('T',' '),
        'proj': os.path.basename(proj),
        'attempts': j.get('attempts'),
        'ok': ok,
        'chars': len(s) if isinstance(s,str) else 0,
        'trigger': j.get('trigger'),
        'variant': j.get('prompt_variant'),
        'fails': sum(1 for a in det if a.get('outcome')!='success'),
        'err': (j.get('error') or '')[:60],
    })
if not rows:
    print("Tidak ada catatan compaction" + (f" untuk {filt}" if filt else "") + ".")
    print("Itu kabar baik: berarti ambang belum pernah tersentuh.")
    raise SystemExit
rows.sort(key=lambda r:r['time'])
print(f"{'waktu':<20} {'proyek':<16} {'trig':<6} {'coba':>4} {'gagal':>5} {'ringkasan':>10}  hasil")
print("-"*88)
for r in rows:
    st = 'BERHASIL' if r['ok'] else 'GAGAL'
    tok = f"{r['chars']/3.5:,.0f} tok" if r['chars'] else "-"
    print(f"{r['time']:<20} {r['proj'][:16]:<16} {r['trigger'] or '-':<6} {r['attempts'] or 0:>4} {r['fails']:>5} {tok:>10}  {st}")
    if r['err']: print(f"{'':>20} └─ {r['err']}")
n=len(rows); ok=sum(1 for r in rows if r['ok'])
att=sum(r['attempts'] or 0 for r in rows); bad=sum(r['fails'] for r in rows)
print("-"*88)
print(f"permintaan : {n}  berhasil {ok} ({100*ok/n:.0f}%)")
print(f"percobaan  : {att}  gagal {bad} ({100*bad/att if att else 0:.0f}%)")
sizes=[r['chars']/3.5 for r in rows if r['chars']]
if sizes:
    import statistics as st2
    print(f"panjang ringkasan: median {st2.median(sizes):,.0f} token  (min {min(sizes):,.0f}  maks {max(sizes):,.0f})")
    print(f"  -> TPS minimum agar muat 300 detik: {max(sizes)/300:.1f}")
print("\nTiap percobaan gagal membuang 300 detik. 3 gagal = 15 menit terbuang.")
PY
