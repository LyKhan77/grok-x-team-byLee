# Session State — `dev-tuf`

> Diperbarui: 2026-08-20T17:00+07:00  ·  Context: — (sesi agent, bukan slot inferensi)
> Standar: [`.agents/rules/05-cooperx-memory.md`](../../rules/05-cooperx-memory.md)

## Session Intent
Integrasi DFLASH 2 ke CooperxCompute, mencakup akuisisi drafter, build engine, promote ke produksi, perbaikan vision, penyelarasan config klien, penegakan kepatuhan harness, dan tuning throughput. Detail arsitektural dinaikkan ke [`session_state.md`](../session_state.md).

## Files Modified
- `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh` — diubah — verifikasi: PASS (live, 8001 HEALTHY)
- `server-optimize.sh` — diubah — verifikasi: PASS (diff baris flag identik dengan produksi)
- `scripts/nmax_stats.sh` — diubah — verifikasi: PASS (fallback CURRENT_NMAX diperbaiki, mengembalikan data pada rentang tanpa penanda)
- `scripts/dflash2_nmax_sweep.sh` — diubah — verifikasi: PASS (bash -n)
- `scripts/dflash2_promote.sh` — dibuat — verifikasi: PASS (dry-run, idempoten)
- `scripts/cooperx_apply_tuning.sh` — dibuat — verifikasi: PASS (dry-run, idempoten)
- `scripts/dflash2_apply_vision_fix.sh` — dibuat — verifikasi: PASS (dry-run)
- `scripts/dflash2_rollback.sh` — dibuat — verifikasi: PASS (dipakai 2x saat insiden)
- `scripts/dflash2_vision_fix.patch` — dibuat — verifikasi: PASS (git apply bersih)
- `scripts/hooks/pre-commit` — diubah — verifikasi: PASS (menolak & meloloskan pada kedua jalur)
- `test/bench_nmax.py` — dibuat — verifikasi: PARSIAL (parser PASS; benchmark tidak valid di bawah beban)
- `.agents/rules/05-cooperx-memory.md` — diubah — verifikasi: BELUM (dokumen)
- `.agents/skills/checkpoint/SKILL.md` — dibuat — verifikasi: BELUM (dokumen)
- `.agents/memory/sessions/_template.md` — dibuat — verifikasi: BELUM (dokumen)
- `~/.grok/config.toml` — diubah — verifikasi: PASS (TOML valid)
- `config.default.toml`, `setup.sh`, `setup.ps1` — diubah — verifikasi: PASS (TOML/bash valid)
- `dashboard/src/lib/llama-poller.ts` — diubah — verifikasi: BELUM (guard belum diuji saat restart)
- `dashboard/src/app/api/telemetry/live/route.ts` — diubah — verifikasi: PASS (hot-reload, nilai benar)

## Key Decisions
- **`--spec-draft-device` semua GPU** — alasan: drafter tidak punya `output.weight` sendiri, meminjam milik target yang di bawah `--tensor-split` mendarat di CUDA2. Tanpa ini abort di `ggml-backend.cpp:930`.
- **Alokasi statis, bukan `--kv-unified`** — alasan: unified dinamis tetapi tidak adil (tanpa cap per-slot), dan terukur 94% VRAM + latensi kolaps (16 token = 35,4 detik).
- **Sampling ke default Qwen** — alasan: `repeat-penalty 1.10` bekerja setiap langkah dan menolak draft token; acceptance naik ~2x setelah dimatikan.
- **4×168K, bukan 4×256K** — alasan: KV drafter DFlash 20 KiB/token F16 tidak bisa dikuantisasi (`--spec-draft-type-k/v` terbukti diabaikan), sehingga 1M butuh 20 GiB hanya untuk drafter.
- **Q6_K tidak dipasang** — alasan: bobot hanya 26% dari waktu per pass, prediksi +6% saja. File disimpan sebagai opsi.

## Milestone / ToDo
- [x] Phase 1 — akuisisi & verifikasi drafter (SHA256, tokenizer, arsitektur)
- [x] Phase 2a — build llama.cpp PR #27342
- [x] Phase 2b — validasi terisolasi (acceptance 5,46)
- [x] Phase 2c — promote produksi (berhasil percobaan ke-2)
- [x] Perbaikan vision (di luar plan) — HTTP 500 → jawaban benar
- [x] Penyelarasan config klien — akar compaction failed
- [x] Kepatuhan harness 3 lapis
- [x] Task 2e — sinkronisasi `server-optimize.sh`
- [~] Phase 3 — benchmark; sweep gagal, diganti pengukuran beban nyata
- [ ] Phase 4 — verifikasi telemetry formal
- [ ] Phase 5.1 — dokumentasi modul DFLASH 2 di ARCHITECTURE/AGENTS
- [ ] Phase 5.3 — push ke `origin/main`

## Active Task
Mengumpulkan sampel n-max 6 dari beban nyata. Pengukuran pertama (18 request, tim baru restart sesi):

| | n-max 4 | n-max 6 |
| :--- | ---: | ---: |
| mean_len | 3,21 | **3,91** (+22%) |
| acceptance | 0,553 | 0,485 |
| TPS median | 13,7 | **25,6** (+87%) |
| TPS p90 | 22,1 | 30,3 |

⚠️ Perancu: tim me-restart sesi sehingga context jauh lebih kecil (26K, 67K) dibanding baseline (~113K); context kecil lebih cepat. `mean_len` adalah sinyal lebih bersih karena minim dipengaruhi ukuran context. Butuh lebih banyak sampel sebelum menyimpulkan.

## Next Steps
1. Kumpulkan ≥30 request pada n-max 6, lalu `bash scripts/nmax_stats.sh "16:45"` untuk memutuskan 4 vs 6.
2. Phase 5.1 — dokumentasi modul DFLASH 2 di ARCHITECTURE.md dan AGENTS.md.
3. Push 13 commit dari `feat/dflash2-speculative-acceleration`.

## Blockers
(teratasi 2026-08-20 ~16:45 — tim sudah restart sesi Grok; dev 1 mulai baru, dev 2 resume. Sesi yang di-resume membawa riwayat ~108K sehingga mulai dekat plafon, tetapi config barunya termuat sehingga compaction kini berfungsi.)

*Riwayat:* Sesi Grok yang berjalan masih memegang `context_window = 262144` dari sebelum config diperbarui, sehingga ambang compaction (235K) tidak akan pernah tercapai dan sesi tumbuh sampai plafon slot 172.032. Pada context >60K, TPS rata-rata jatuh ke 9,5 versus 23,5 di bawah 5K. **Selama ini belum diperbaiki, perbandingan n-max akan tenggelam dalam noise.** Perbaikannya di luar kendali server — setiap developer harus restart sesinya sendiri.

## 2026-08-21 — override-kv 168K + n-max 7 + pengerasan restart

**Status:** diterapkan ke produksi, server sehat, VRAM 83,2% (band 80–84% terpenuhi).

Perubahan `run-qwen.sh` (backup: `run-qwen.sh.bak.20260821-085652`):
- `+ --override-kv qwen35.context_length=int:172032` — agar klien (Grok CLI) membaca
  `n_ctx_train` = 168K, bukan 262K, sehingga auto-compact terpicu tepat waktu.
- `--spec-draft-n-max 6 → 7` — uji apakah `mean_len` naik >5% dari baseline 4,07.

**Baseline pembanding n-max 6:** 39 request, mean_len 4,07, acceptance 0,512,
TPS median 27,3. Putusan: pertahankan n-max 7 bila mean_len ≥ 4,27; jika tidak,
`./scripts/dflash2_apply_ctx_override.sh --rollback`.

**Belum terverifikasi:** apakah Grok CLI benar-benar menampilkan 168K. Log server
tidak mencetak `n_ctx_train` pada verbositas ini — hanya terlihat dari sisi klien.

**Temuan:** drop-in `/etc/systemd/system/llamacpp.service.d/override.conf` berisi
`CUDA_VISIBLE_DEVICES=0,1` (sisa konfigurasi lama, 2 GPU). Tidak berbahaya sekarang
karena `run-qwen.sh` menimpanya inline dengan `0,1,2`, tapi jadi jebakan kalau prefix
inline itu suatu saat dihapus. `StartLimitIntervalSec=10s` juga membuat batas
crashloop efektif tak terbatas — load butuh ~40s, jadi burst 5/10s mustahil tercapai.

## Files Modified
- /home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh
- /home/gspe-ai1/project/gspexgrok-agent/scripts/dflash2_apply_ctx_override.sh (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/llamacpp-safe-restart.sh (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/llamacpp-preflight.sh (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/systemd/override.conf (baru, belum dipasang)

### Pengerasan systemd — installer siap, menunggu sudo user

`sudo` di sesi agen minta password, jadi pemasangan dilakukan user.
Installer: `scripts/llamacpp-install-hardening.sh` (idempoten, `--uninstall` tersedia).

**Koreksi rancangan:** drop-in versi pertama menunjuk `ExecStartPre` ke dalam repo
git. Checkout branch lain akan menghapus skrip dari disk → `ExecStartPre` gagal →
server tidak mau start. Gerbang keamanan berubah jadi mode kegagalan baru.
Diperbaiki: skrip dipasang ke `/usr/local/bin`, di luar kendali git.

Installer menolak memasang drop-in bila preflight gagal pada config saat ini,
sehingga tidak mungkin memasang gerbang yang langsung memblokir start.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/scripts/llamacpp-install-hardening.sh (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/systemd/override.conf
- /home/gspe-ai1/project/gspexgrok-agent/scripts/llamacpp-preflight.sh

### Pengerasan systemd — TERPASANG & terverifikasi (2026-08-21 09:16)

StartLimitIntervalUSec 10s→10min, Burst 5→3, TimeoutStopUSec 2min,
ExecStartPre=/usr/local/bin/llamacpp-preflight.sh, Environment kosong.
Backup config lama: /etc/systemd/system/llamacpp.service.d/override.conf.bak
Server tidak terganggu (daemon-reload saja); uptime proses tetap dari 08:58,
ketiga GPU aktif via prefix inline run-qwen.sh.

Efek samping menguntungkan: dengan Environment kosong, jika prefix inline
CUDA_VISIBLE_DEVICES suatu saat terhapus, llama.cpp jatuh ke default semua GPU
(0,1,2) — bukan 2 GPU lalu OOM seperti sebelumnya.

**Belum teruji:** gerbang ExecStartPre belum pernah benar-benar dieksekusi karena
server belum restart sejak pemasangan. Uji nyata pertama = restart berikutnya.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/scripts/llamacpp-safe-restart.sh

### Koreksi: Grok CLI tidak membaca n_ctx_train dari server

Grok CLI TIDAK pernah memanggil `/props` (tidak ada rujukan di repo). Ia membaca
`context_window` dari `~/.grok/config.toml` di masing-masing mesin. Tampilan 172K
di terminal server berasal dari commit b8eccdd yang memperbarui file lokal mesin
itu — bukan dari `--override-kv`. Override-kv tetap benar untuk klien yang memang
bertanya ke server, tapi bukan pengungkit untuk kasus Grok CLI.

Konsekuensi: mesin dev lain masih `context_window = 262144` DAN
`max_tokens = 65536` — yang terakhir adalah akar compaction failed, jadi masalahnya
bukan sekadar angka tampilan. Commit b8eccdd hanya ada di branch fitur yang belum
di-push, sehingga dev tidak bisa pull. Solusi tanpa push: scripts/grok_client_patch.sh

### n-max 7: aturan putusan pra-daftar GAGAL, hasil terkonfound

n-max 7: 94 req, mean_len 3.81, acceptance 0.401, TPS med 30.3, p90 37.5
n-max 6: 39 req, mean_len 4.07, acceptance 0.512, TPS med 27.3, p90 34.8

mean_len = acceptance x n_max + 1 (terverifikasi pada kedua baris). n-max 7
menerima LEBIH SEDIKIT token per pass -> metrik drafter memburuk 6,4%.
TPS naik, tapi kedua pengukuran beban kerjanya berbeda (94 vs 39 req, waktu dan
mix tugas berbeda), jadi kenaikan TPS tidak bisa diatribusikan ke n-max 7.
Aturan pra-daftar (pertahankan bila mean_len >= 4.27) tidak terpenuhi.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh (baru)

### Analisis kuantisasi (2026-08-21) — docs/plans/quantization_decision.md

Fakta arsitektur terverifikasi dari metadata GGUF: qwen35 DENSE (bukan MoE),
65 blok, full_attention_interval 4 -> 16 layer KV, head_count_kv 4,
key_length/value_length 256. KV/token: q4_0 18 KiB, q5_1 24, q8_0 34, f16 64.

Distribusi context NYATA (309 req): median 75.156, p90 152.440, p99 171.943.
Jauh lebih panjang dari asumsi riset Perplexity (32-64K).

Temuan pokok: bobot mendominasi bandwidth 10:1 terhadap KV bahkan di p90 152K.
Jadi kuantisasi bobot = pengungkit kecepatan; kuantisasi KV = pengungkit kualitas
yang dibatasi VRAM, bukan bandwidth. Q8_0 + KV berkualitas TIDAK MUAT di 72 GiB
pada 168K x 4 (97,8%).

Perkiraan lama "bobot 13,8 ms = 26% dari pass" DIBATALKAN — tidak konsisten
dengan 27,1 GiB / 900 GB/s = ~32 ms.

Rencana bertahap: (1) Q8_0 -> UD-Q6_K (file sudah ada, 20,5 GiB, belum terpakai),
(2) headroom dipakai untuk KV q4_0 -> q5_1, (3) baru pertimbangkan Q4_K_M + q8_0.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/docs/plans/quantization_decision.md (baru)

### Analisis multi-stream (2026-08-21) — docs/plans/multistream_scaling.md

Prefill 670 t/s = 17,6% waktu server; decode 23 t/s = 82,4%. Tokenization BUKAN
masalah; prioritas = arsitektur serving.

TPS/user dikontrol context (32-128K): 1 slot 40,4 | 2 slot 22,5 | 3 slot 16,2.
Agregat 40,4 -> 45,0 -> 48,8 (batching lemah). Sel runtuh: 3 slot @ >128K = 1,5 TPS.
CV naik 0,33 -> 0,59 -> 0,79 -> 0,90.

Mekanisme dari source: need_n_rs_seq() = draft.n_max (common/common.h:386);
cache RS alokasi n_stream*(1+n_rs_seq) bidang (llama-kv-cache-dsv4.cpp:912);
snapshot per langkah ~ n_rs_seq*n_seqs (:815). State SSM 147 MiB/sequence
(49 layer x 6144 x 128 x 4B) -> par4 n7 = 4,6 GiB.

Konsekuensi penting: menurunkan --parallel membebaskan KV cukup untuk membeli
q8_0 TANPA menurunkan bobot. par2 n7 Q8_0 q8_0 @168K = 79,1%. Ini membalik
kesimpulan memo kuantisasi.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/docs/plans/multistream_scaling.md (baru)

### Adendum multi-stream: q5_1 mustahil, prompt cache mati (2026-08-21)

q5_1 TIDAK tersedia: build-vfix pakai GGML_CUDA_FA_ALL_QUANTS=OFF, flash-attn
hanya f16/f16, q4_0/q4_0, q8_0/q8_0, bf16/bf16. Pilihan KV nyata: q4_0 atau q8_0.

Distribusi prefill: median 238 token (reuse KV bekerja baik), tapi 8 request
(2,2%) dengan prefill >20K menyumbang 72,3% total prefill; maks 151.712 token.
Penyebab: --cache-ram 0 mematikan prompt cache, sesi tergusur hilang total.
Turun ke 3 slot memperbanyak penggusuran -> cache-ram wajib dinyalakan.
RAM tersedia 43 GiB; 16 GiB cukup untuk 3-4 sesi.

Rekomendasi final: par3, ctx-size 393216 (131.072/user), n-max 5, KV q8_0,
cache-ram 16384 -> 81,7% VRAM. Bobot tetap Q8_0.

Ambang handover harus turun 88% (151.388) -> 80% dari 131.072 (104.858).
Compaction lambat KARENA dipicu di 151K, tepat di zona 1,5 TPS.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/docs/plans/multistream_scaling.md

### Harness direvisi untuk 131K (2026-08-21)

Rules 05-cooperx-memory.md: n_ctx 172.032 -> 131.072, ambang 88% -> 80%
(104.858 token). Alasan bukan VRAM melainkan pengukuran: >128K pada 3 slot = 1,5 TPS,
dan ambang lama memicu compaction tepat di zona itu.

Bagian baru yang diadaptasi:
- §9 Rantai Sesi (Hermes) — header Induk/Alasan, rantai tidak boleh putus
- §10 Compact di batas tugas (Command Code) — ambang = jaring pengaman, bukan jadwal;
  metrik kesehatan = proporsi handover beralasan `task-boundary`
- §11 Stabilitas prefix — urutan context stabil-di-atas/volatil-di-bawah, karena
  2,2% request menyumbang 72,3% prefill akibat prefix hilang
- §12 Batas keras memori (Hermes) — gagal-berisik, DILARANG memangkas diam-diam

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/.agents/rules/05-cooperx-memory.md
- /home/gspe-ai1/project/gspexgrok-agent/.agents/memory/sessions/_template.md
- /home/gspe-ai1/project/gspexgrok-agent/scripts/cooperx_apply_parallel3.sh (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh

### Deploy parallel 3 BERHASIL + perbaikan klien Windows (2026-08-21 12:xx)

Server live terverifikasi: parallel 3, ctx-size 393216, n_ctx/slot 131072,
n-max 5, KV q8_0/q8_0, cache-ram 16384, override-kv 131072.
VRAM 55.517 MiB = 75,3%. Prediksi saya 81,7% — MELESET 6,4 poin (4,7 GiB).
Sebab: saya asumsikan overhead non-SSM 16,4 GiB konstan saat slot turun 4->3,
padahal drafter-KV dan compute buffer ikut menyusut.

Headroom 8,7% JANGAN dipakai menaikkan ctx kembali ke 168K — penurunan ke 131K
didorong throughput terukur (>128K = 1,5 TPS pada 3 slot), bukan VRAM.

Dua kegagalan di mesin dev Windows, keduanya diperbaiki:
1. CRLF — repo tak punya .gitattributes, Git Windows autocrlf mengubah *.sh
   sehingga `set -euo pipefail\r` ditolak. Diperbaiki dengan .gitattributes
   (*.sh eol=lf). Berkas repo sendiri sudah LF; konversi terjadi di klien.
2. `bash` dari PowerShell memanggil WSL, yang $HOME-nya /home/<user> dan BUKAN
   profil Windows tempat Grok CLI menyimpan config. grok_client_patch.sh kini
   mendeteksi GROK_CONFIG -> $HOME -> $USERPROFILE -> /mnt/c/Users/* -> /c/Users/*,
   dan GAGAL-BERISIK bila cocok lebih dari satu profil (menambal config user
   yang salah lebih buruk daripada gagal).

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/.gitattributes (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh

### Celah sampling di mesin dev tertutup (2026-08-21)

Patch pertama menyelaraskan context_window/max_tokens/temperature/top_p, tetapi
MELEWATKAN min_p, repeat_penalty, presence_penalty. Mesin dev Lee tersisa
min_p 0.05, repeat_penalty 1.1, presence_penalty 0.1 — menyimpang dari mode
thinking resmi Qwen3.8 (0.0 / 1.0 / 0.0).

Ini bukan kosmetik: parameter sampling dari klien MENIMPA setelan server pada
API OpenAI-compatible, jadi --repeat-penalty 1.0 dan --repeat-last-n 0 di server
tidak melindungi. repeat_penalty 1.1 + presence_penalty 0.1 menekan penalaran
panjang, berlawanan dengan reasoning-effort xhigh.

Diperbaiki di grok_client_patch.sh (+ top_k -> 20 bila ada). Juga diselaraskan:
config.default.toml, setup.sh, setup.ps1 -> context_window 131072.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh
- /home/gspe-ai1/project/gspexgrok-agent/config.default.toml
- /home/gspe-ai1/project/gspexgrok-agent/setup.sh
- /home/gspe-ai1/project/gspexgrok-agent/setup.ps1

### Sisa nilai lama di berkas onboarding & dashboard dibersihkan (2026-08-21)

Ditemukan saat verifikasi menyeluruh, bukan dilaporkan user:
- setup.ps1 blok Pi agent masih contextWindow 262144 dan maxTokens 65536 —
  belum pernah ikut diperbarui sejak awal proyek.
- setup.sh blok Pi agent contextWindow 172032.
- Label "168K"/"256K Dedicated" di kedua setup.
- dashboard telemetry/live: context_window 172032, kv_cache_type q4_0.

Semua diselaraskan ke 131072 / 12288 / q8_0. Verifikasi silang klien-vs-server
untuk temperature, top_p, min_p, repeat_penalty, presence_penalty, context_window
kini cocok seluruhnya. top_k tidak ada di config.default.toml sehingga memakai
default server (20).

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/setup.sh
- /home/gspe-ai1/project/gspexgrok-agent/setup.ps1
- /home/gspe-ai1/project/gspexgrok-agent/dashboard/src/app/api/telemetry/live/route.ts

### AGENTS.md: satu-satunya jalur otomatis, dan isinya basi (2026-08-21)

Temuan mekanisme: Grok CLI membaca `AGENTS.md`/`CLAUDE.md` lalu MENEMPELKANNYA ke
system prompt (sumber: ~/.grok/README.md "Grok reads these files and appends their
contents to the system prompt"). Berkas di `.agents/rules/` TIDAK dibaca otomatis.

Dua kesenjangan yang ditemukan saat audit, bukan dilaporkan user:
1. AGENTS.md tidak pernah menyuruh agent MEMBACA memory di awal sesi — hanya
   menyuruh mencatat. Rehydration bergantung sepenuhnya pada manusia mengetik
   "Lanjutkan sessions/<dev-id>.md".
2. Nilainya basi: 4 slot, ctx 524288, KV q4_0, ambang 90%, dan "Target 4x256K
   menunggu DFLASH 2" padahal DFLASH 2 sudah live.

Diperbaiki: nilai diselaraskan (3 slot, 393216, q8_0, n-max 5, 80%), pohon
.agents diperbarui (sessions/, archive/, checkpoint skill), dan ditambahkan
bagian "Protokol Sesi" berisi baca-di-awal / tulis-di-batas-tugas / ambang 80%.

Dua tempat penyimpanan yang TERPISAH:
- Transkrip Grok: ~/.grok/sessions/<path-proyek-terenkode>/<uuid>/ — lokal mesin,
  tidak di git, dipakai --resume.
- CooperxMemory: .agents/memory/ di repo — ter-commit, terbagi lintas mesin & dev.

AGENTS.md kini ~3.300 token dan berada di puncak prefix stabil; mengubahnya
membatalkan prompt cache semua sesi satu kali.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/AGENTS.md

### Skill /init-agent + /init-changelog, dan koreksi arah harness (2026-08-21)

Verifikasi ~/.grok/README.md mengubah beberapa asumsi dasar:

1. Skill kita di `.agents/skills/` TIDAK PERNAH terbaca. Grok hanya memindai
   `./.grok/skills/`, `<repo>/.grok/skills/`, `~/.grok/skills/`, `~/.claude/skills/`.
   Dipindahkan ke `.grok/skills/`. (Sudah dicek tidak ter-gitignore — kalau
   ter-ignore, skill repo-scoped difilter.)
2. Grok punya MEMORY NATIVE: ~/.grok/memory/<slug>-<hash8>/MEMORY.md (workspace)
   dan ~/.grok/memory/MEMORY.md (global), dicari OTOMATIS pada giliran pertama
   tiap sesi dan setelah compaction. Perintah /memory, grok memory edit/stats.
   Keduanya di HOME -> lokal per mesin, tidak terbagi.
3. Grok punya auto_compact_threshold_percent, DEFAULT 85. Kita tidak pernah
   menyetelnya — hanya ada komentar "auto_compact dinonaktifkan" di
   config.default.toml, yang tidak menonaktifkan apa pun. Jadi selama ini
   compaction berjalan di 85% memakai default.

Disetel ke 72%: 94.371 + 12.288 = 106.659, aman di bawah plafon kinerja 128.000.
85% memberi 123.699 — terlalu dekat ke zona 1,5 TPS.

Koreksi arah: perplex-2 benar bahwa compaction harus milik Grok, bukan dibangun
ulang. Handover di batas tugas tetap jalur utama karena kualitas ringkasannya
lebih baik; ambang native jadi jaring pengaman.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/.grok/skills/init-agent/SKILL.md (baru)
- /home/gspe-ai1/project/gspexgrok-agent/.grok/skills/init-changelog/SKILL.md (baru)
- /home/gspe-ai1/project/gspexgrok-agent/.grok/skills/checkpoint/SKILL.md (pindah)
- /home/gspe-ai1/project/gspexgrok-agent/.grok/skills/standardization/SKILL.md (pindah)
- /home/gspe-ai1/project/gspexgrok-agent/docs/harness_scope.md (baru)
- /home/gspe-ai1/project/gspexgrok-agent/AGENTS.md
- /home/gspe-ai1/project/gspexgrok-agent/config.default.toml
- /home/gspe-ai1/project/gspexgrok-agent/setup.sh
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh

### Rencana horizon long-task + memory native (2026-08-21)

Akar compaction 15-20 menit TERHITUNG: generasi ringkasan ~4.000 token pada
3,9 TPS (4 slot lama) = 1.026 detik = 17,1 menit + prefill 157s = 19,7 menit.
Cocok persis dengan laporan user. Dengan 3 slot @41,5 TPS turun ke ~4,2 menit —
sudah diperbaiki oleh deploy hari ini, BELUM diverifikasi karena belum ada
compaction sejak restart.

Temuan besar: [memory] Grok DEFAULT false dan ~/.grok/memory/ kosong. Fiturnya
persis yang diminta user: initial_injection otomatis giliran pertama, /flush
menulis ringkasan sesi terindeks, session.save_on_end, memory_search/memory_get
untuk memilih sesi lampau, grok --resume <ID_ATAU_JUDUL>.

DUA BUG PENEMPATAN TOML yang saya buat lalu perbaiki:
1. auto_compact_threshold_percent ada di section [session], BUKAN [models].
   Skrip patch menyisipkannya di [models] -> tidak akan dibaca Grok.
2. Menyisipkan [memory] sebelum load_envrc membuat load_envrc (milik [session])
   terserap ke [memory].

Ambang 72 -> 80 sesuai permintaan user.

Ketegangan yang dicatat di rencana: menaikkan context membuat compaction lebih
jarang TAPI lebih lama tiap kali (131K=4,2mnt, 168K=5,0mnt, 256K=6,8mnt).
Hanya reduksi output tool yang memperkecil frekuensi DAN durasi.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/docs/plans/long_task_horizon.md (baru)
- /home/gspe-ai1/project/gspexgrok-agent/config.default.toml
- /home/gspe-ai1/project/gspexgrok-agent/setup.sh
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh
- /home/gspe-ai1/project/gspexgrok-agent/AGENTS.md
- /home/gspe-ai1/project/gspexgrok-agent/docs/harness_scope.md

### Fase 1 disiapkan: ctx 168K + skrip pengukur tebing (2026-08-21)

Pengukuran pasca-restart (3 slot, q8_0, n-max 5, ctx 131K), TPS/user:
  <64K 21,1 | 64-96K 18,8 | 96-128K 15,7   agregat 63,4 / 56,4 / 47,2
Tidak ada sampel di 128-160K maupun 4 slot — konsisten dengan config baru,
sekaligus membuktikan tebing 128K TIDAK BISA diukur selama plafon 131K berlaku.

Disiapkan (belum dieksekusi):
- scripts/cooperx_apply_ctx168k.sh — ctx-size 393216->516096, override-kv->172032.
  Punya cek konsistensi ctx-size == parallel x override-kv, cek rantai baris,
  dry-run, rollback. Prediksi 59.597 MiB = 80,8% (base diperlakukan konstan;
  prediksi sebelumnya meleset 6,4 poin ke arah aman).
- scripts/concurrency_stats.sh — tabel TPS terhadap (slot aktif x band context),
  plus verdict tebing dengan kriteria di muka: aman bila >=50% dari band 96-128K
  DAN >=20 TPS absolut.

Ambang 80% pada 172.032 = 137.626 token, SENGAJA di atas 128.000 agar sampel
128-160K muncul. Bila tebing terbukti masih ada, turunkan ke 74% (127.303).

Seluruh berkas onboarding + harness diselaraskan ke 168K/172.032.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/scripts/cooperx_apply_ctx168k.sh (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/concurrency_stats.sh (baru)
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh
- /home/gspe-ai1/project/gspexgrok-agent/config.default.toml
- /home/gspe-ai1/project/gspexgrok-agent/setup.sh
- /home/gspe-ai1/project/gspexgrok-agent/setup.ps1
- /home/gspe-ai1/project/gspexgrok-agent/dashboard/src/app/api/telemetry/live/route.ts
- /home/gspe-ai1/project/gspexgrok-agent/AGENTS.md
- /home/gspe-ai1/project/gspexgrok-agent/.agents/rules/05-cooperx-memory.md
- /home/gspe-ai1/project/gspexgrok-agent/docs/harness_scope.md

### Riset compaction: BUKTI LANGSUNG dari checkpoint (2026-08-21)

Ditemukan berkas nyata:
~/.grok/sessions/<proj>/<uuid>/compaction_checkpoints/<id>.json
Isinya: checkpoint_id, prompt_index_at_compaction, compacted_history[],
schema_version, created_at, original_user_info, reread_file_paths.

UKURAN RINGKASAN TERUKUR: 12.119 char = 3.463 token.
Riwayat setelah compaction total 5.786 token (system 1.729 + user_info 574 +
query 19 + ringkasan 3.463).

Aritmetika yang menutup kasus 15-20 menit:
  3.463 token / 3,9 TPS (4 slot lama) = 888 s = 14,8 menit  <- COCOK
  3.463 token / 41,5 TPS (sekarang)   =  83 s =  1,4 menit

Jadi compaction TIDAK PERNAH lambat karena ukurannya; lambat karena TPS runtuh.
Sudah teratasi oleh perubahan 3-slot, tanpa menyentuh compaction.

KOREKSI jawaban saya sebelumnya: generasi 12.288 token yang saya duga compaction
ternyata BUKAN — compaction hanya ~3.463 token.

Ukuran ringkasan TIDAK DAPAT DIKONFIGURASI. Terkonfirmasi 3 cara: README lokal
([session] hanya punya 2 kunci), referensi TOML resmi xAI ("No configuration key
exists that controls the compaction summary length"), dan template internal yang
terlihat di checkpoint. Ini sepenuhnya sisi Grok CLI — llama.cpp tidak punya
konsep percakapan.

VRAM SETELAH DEPLOY 168K: 62.005 MiB = 84,1%, bukan 80,8% seperti prediksi saya.
base TUMBUH 2.408 MiB saat ctx/slot naik (compute buffer). Dengan base terkoreksi
44.869 MiB: 176K -> 85,2%, 186K -> 86,6%. 186K TIDAK LAYAK. Pertanyaan tertutup.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/.grok/skills/long-task/SKILL.md (baru)
- /home/gspe-ai1/project/gspexgrok-agent/docs/plans/_TEMPLATE.md (baru)
- /home/gspe-ai1/project/gspexgrok-agent/AGENTS.md

### `/clear` TIDAK ADA di Grok — harness menyuruh perintah fiktif (2026-08-21)

Daftar slash command Grok: /always-approve /compact /exit /feedback /flush
/hooks-add /hooks-list /hooks-trust /load /memory /model /multiline /new
/plugins /rewind /skills. Yang membersihkan context adalah **/new**, bukan
/clear (itu perintah Claude Code). 11 rujukan di ARCHITECTURE.md, AGENTS.md,
rules, template, dan docs sudah diperbaiki.

`/flush` = "Save current session knowledge to memory now" -> MENYIMPAN, tidak
membebaskan context. Menjalankannya sendirian saat context penuh tidak menolong.
Pasangannya wajib: /flush lalu /new.

Usul user "nonaktifkan auto-compact, notifikasi di 95%" tidak bisa dipakai apa
adanya: 95% x 172.032 = 163.430 + max_tokens 12.288 = 175.718 > 172.032 ->
OVERFLOW. Ambang maksimum mutlak 92,9%, dan itu menyisakan 1.475 token untuk
pesan user + hasil tool. Notifikasi di 95% datang setelah terlambat.

Hook yang tersedia: PreToolUse/PostToolUse dan session start/end di .grok/hooks/
atau [[hooks.<Event>]] di config.toml. TIDAK ada event ambang context.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/AGENTS.md
- /home/gspe-ai1/project/gspexgrok-agent/ARCHITECTURE.md
- /home/gspe-ai1/project/gspexgrok-agent/.agents/rules/05-cooperx-memory.md
- /home/gspe-ai1/project/gspexgrok-agent/.agents/memory/session_state.template.md
- /home/gspe-ai1/project/gspexgrok-agent/.grok/skills/long-task/SKILL.md
- /home/gspe-ai1/project/gspexgrok-agent/docs/plans/cooperagent_master_plan.md
- /home/gspe-ai1/project/gspexgrok-agent/docs/plans/long_task_horizon.md

### Ambang compaction 88%, dan auto-compact tidak dapat dinonaktifkan (2026-08-21)

Ambang diset 88% (151.388 token, margin 8.356). Dasarnya pengukuran pertumbuhan
context per giliran dari 695 request: median 287, p75 986, p90 6.421, p95 17.015.
Margin 88% menampung 91,5% giliran; 91% hanya 85,5% (margin 3.195, DI BAWAH p90).

TRUNCATION SUDAH TERJADI 2x hari ini pada n_tokens = 172031 (task 13546, 13595),
jadi overflow bukan risiko teoretis. Truncation memotong isi diam-diam —
lebih buruk daripada compaction yang meringkas.

Menaikkan ambang TIDAK mempercepat compaction: biaya didominasi generasi
(~3.463 token), bukan prefill. 80% dan 91% sama-sama ~1,4 menit.

AUTO-COMPACT TIDAK DAPAT DINONAKTIFKAN secara resmi: tidak ada kunci boolean,
env var, maupun flag CLI. Hanya `auto_compact_threshold_percent` (rentang 0-100).
Nilai 100 secara teori tidak pernah memicu, tetapi TIDAK TERDOKUMENTASI dan
konsekuensinya adalah truncation (yang sudah terbukti terjadi), bukan compaction.
Tidak dipakai.

KOREKSI: `/clear` TERNYATA ADA di Grok (user menguji langsung, perilakunya sama
dengan /new). Tabel slash command di README tidak lengkap. Perubahan ke /new
tetap dipertahankan karena itu yang terdokumentasi.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/config.default.toml
- /home/gspe-ai1/project/gspexgrok-agent/setup.sh
- /home/gspe-ai1/project/gspexgrok-agent/scripts/grok_client_patch.sh
- /home/gspe-ai1/project/gspexgrok-agent/AGENTS.md
- /home/gspe-ai1/project/gspexgrok-agent/.agents/rules/05-cooperx-memory.md
- /home/gspe-ai1/project/gspexgrok-agent/docs/harness_scope.md

### PENYEBAB PASTI "compaction failed" DITEMUKAN (2026-08-21)

Dari ~/.grok/sessions/<proj>/<uuid>/compaction_requests/*.json:

  "compact failed: exceeded wall-clock budget 300s (runaway generation)"

Grok punya BATAS WAKTU KERAS 300 detik per percobaan compaction, 3 percobaan
per permintaan. Tidak terdokumentasi di README maupun docs.x.ai.

Bukti dari sesi game-1 (19 Agu):
  04:30 ed8c8a38 - 3 percobaan GAGAL semua (900s)
  04:46 65a6b342 - 3 percobaan GAGAL semua (900s)
  05:01 e6a3281e - percobaan 1,2 gagal; percobaan 3 BERHASIL (11.978 char)
Total 04:30 -> 05:01 = 31 menit. INILAH 15-20 menit yang dilaporkan user:
bukan satu compaction lambat, melainkan rentetan timeout 300 detik.

KONSEKUENSI OPERASIONAL: ringkasan ~3.422 token / 300 s = **11,4 TPS MINIMUM**.
Di bawah itu compaction MUSTAHIL selesai, berapa kali pun diulang.

Metadata lain: trigger=auto (tidak berhenti, tidak bertanya ke user),
prompt_variant=detailed (ADA varian lain), model=qwen35, user_context=None
(inilah slot argumen /compact <context>). Ada juga mekanisme terpisah
recap_requests/ yang jauh ringan: 71-93 token.

### REGRESI SETELAH 168K — 3 SLOT JATUH DI BAWAH AMBANG COMPACTION

TPS/user 3 slot, sebelum vs sesudah ctx 131K->168K:
  ctx 131K (11:41-16:07): <64K 21,1 | 64-96K 18,8 | 96-128K 15,7  agregat 63/56/47
  ctx 168K (sejak 16:07): <64K  9,7 |            - | 96-128K  5,8  agregat 29/-/17

Median 3 slot sekarang 8,3 TPS -> 54,1% sampel DI BAWAH 11,4 TPS.
Artinya compaction akan gagal ~separuh waktu. 2 slot masih sehat (22,7/22,4/20,5).

Dugaan sebab: VRAM 84,1% (naik dari 75,3%), compute buffer tumbuh 2.408 MiB.
Data baru ~30 menit, jadi belum konklusif, tetapi arah dan besarannya konsisten.

REKOMENDASI: rollback ke 131K via scripts/cooperx_apply_ctx168k.sh --rollback

## Files Modified
- (tidak ada perubahan kode; temuan pengukuran)

### Estimasi keberhasilan compaction pasca-rollback (2026-08-21)

Model yang benar: compaction butuh RATA-RATA >=11,4 TPS selama jendela 300 detik,
bukan sampel sesaat. Jendela bergulir 300s (langkah 30s):

  ctx 131K: 1 slot 0,0% gagal | 2 slot 0,0% | 3 slot 1,4% (n=207)
  ctx 168K: 1 slot 0,0%       | 2 slot 0,0% | 3 slot 29,2% (n=24)

Pada 131K/3 slot: keberhasilan 98,6%, batas bawah CI 95% = 96,9%.

SENSITIVITAS TAJAM terhadap panjang ringkasan (n=207 jendela):
  3.422 token (terukur) -> 98,6% berhasil
  4.000 token           -> 77,3%
  5.000 token           -> 33,3%
  6.000 token           -> 6,8%
Keyakinan bersandar pada SATU observasi panjang ringkasan (3.422 token).

Audit historis (scripts/compaction_audit.sh): 4 permintaan, hanya 1 berhasil
(25%); 11 dari 12 percobaan gagal (92%). Semua pada konfigurasi 4-slot lama.

## Files Modified
- /home/gspe-ai1/project/gspexgrok-agent/scripts/compaction_audit.sh (baru)
