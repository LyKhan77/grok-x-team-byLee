# Session State — `dev-tuf`

> Diperbarui: 2026-08-20T17:05+07:00  ·  Context: — (sesi agent, bukan slot inferensi)
> Standar: [`.agents/rules/05-cooperx-memory.md`](../../rules/05-cooperx-memory.md)

## Session Intent
Integrasi DFLASH 2 ke CooperxCompute, mencakup akuisisi drafter, build engine, promote ke produksi, perbaikan vision, penyelarasan config klien, penegakan kepatuhan harness, dan tuning throughput. Detail arsitektural dinaikkan ke [`session_state.md`](../session_state.md).

## Files Modified
- `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh` — diubah — verifikasi: PASS (live, 8001 HEALTHY)
- `server-optimize.sh` — diubah — verifikasi: PASS (diff baris flag identik dengan produksi)
- `scripts/nmax_stats.sh` — diubah — verifikasi: PASS (kedua jalur diuji: dengan & tanpa penanda)
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
Menunggu tim melanjutkan pekerjaan pada `n-max 6` untuk mengumpulkan sampel, lalu bandingkan dengan baseline `n-max 4` memakai `bash scripts/nmax_stats.sh "16:45"`.

## Next Steps
1. Minta ketiga developer (`dev-tuf`, `vincent`, `budi`) me-restart sesi Grok — tanpa ini compaction tidak pernah terpicu dan context tumbuh sampai plafon.
2. Setelah ada ≥30 request pada n-max 6, jalankan `bash scripts/nmax_stats.sh "16:45"` dan bandingkan `mean_len` serta TPS median dengan n-max 4 (30 req, mean_len 3,21, TPS med 13,7).
3. Phase 5.1 lalu push 12 commit dari `feat/dflash2-speculative-acceleration`.

## Blockers
Sesi Grok yang berjalan masih memegang `context_window = 262144` dari sebelum config diperbarui, sehingga ambang compaction (235K) tidak akan pernah tercapai dan sesi tumbuh sampai plafon slot 172.032. Pada context >60K, TPS rata-rata jatuh ke 9,5 versus 23,5 di bawah 5K. **Selama ini belum diperbaiki, perbandingan n-max akan tenggelam dalam noise.** Perbaikannya di luar kendali server — setiap developer harus restart sesinya sendiri.
