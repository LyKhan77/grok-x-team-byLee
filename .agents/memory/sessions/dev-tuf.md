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
