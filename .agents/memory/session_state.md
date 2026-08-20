# 🧠 CooperxMemory — Session State & Handover Ledger

> **Project Name:** CooperAgent  
> **Last Updated:** 2026-08-20T10:30:00+07:00  
> **Active Developer / Identity:** Lee (`dev-tuf`) & Vincent (`vincent`)  
> **Platform Version:** CooperAgent v1.2.0  
> **Repository:** https://github.com/LyKhan77/grok-x-team-byLee.git  

---

## 1. Goal Utama & Arsitektur
- **Deskripsi Proyek:** Platform *Enterprise Autonomous Coding Agent On-Premise* yang mengintegrasikan multi-agent harness (**Grok Build TUI & Pi Agent CLI**) dengan backend inferensi **`CooperxCompute`** (4 Slots x 256K Dedicated Context = 1.048.576 Tokens) pada cluster 3x NVIDIA RTX 3090, dipadukan dengan persistensi memori mandiri **`CooperxMemory`** dan API Gateway/Dashboard **`CooperxTelemetry`** (Port 8987).
- **Foundation Model:** Qwen 3.8 / 2.5 27B Q8_0 (~29.03 GB) + Multimodal Vision Projector (`mmproj-BF16.gguf`).
- **Cluster Hardware:** 3x NVIDIA GeForce RTX 3090 (72 GB VRAM, `--tensor-split 1,1,1`) + Intel Core Ultra 7 265 (20 Physical Cores).
- **Gateway & Dashboard:** Next.js 14 Streaming Proxy Interceptor + SQLite Token Sniffer (`usage.db`) pada Port `8987`.

---

## 2. Milestone yang Telah Selesai (Verified)
- [x] **CooperxCompute 4 Slots x 256K Context:** [`server-optimize.sh`](../../server-optimize.sh) & [`/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh`](/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh) aktif berjalan live dengan 4 Slots paralel.
- [x] **CooperxTelemetry Gateway (Port 8987):** Dashboard live, mengenali developer `dev-tuf` dan `vincent`, URL rewrite `/v1` aktif.
- [x] **CooperxHarness Multi-Agent Onboarding:**
  - Grok Build Rust TUI: [`~/.grok/config.toml`](/home/gspe-ai1/.grok/config.toml) & [`config.default.toml`](../../config.default.toml) (256K context).
  - Pi Agent (pi.dev v0.84.2): [`setup.ps1`](../../setup.ps1) & [`setup.sh`](../../setup.sh) otomatis menghasilkan `~/.pi/agent/models.json` dan `settings.json` UTF-8 tanpa BOM.
- [x] **Windows PowerShell 5.1 Compatibility:** `setup.ps1` 100% pure ASCII dan bebas parser encoding error.
- [x] **CooperxMemory Protocol:** Rule [`.agents/rules/05-cooperx-memory.md`](../rules/05-cooperx-memory.md) aktif (Continuous Checkpoint $\rightarrow$ 90% Warning Card $\rightarrow$ Instant 0-Token Rehydration).

---

## 3. Active Task in Progress & Next Frontier
- **Modul Aktif:** `CooperxCompute` & `CooperxMemory`
- **Fitur Berikutnya:** **DFLASH 2 Speculative Drafter Integration** ([`docs/plans/dflash2_speculative_acceleration_plan.md`](../../docs/plans/dflash2_speculative_acceleration_plan.md)).
- **Tujuan Teknis:** Mengunduh dan memasang `incoai/Qwen3.8-27B-DFlash2-GGUF` untuk melipatgandakan kecepatan decoding dari **~27 TPS ke ~70–90+ TPS per user** (2.7x–3.4x speedup) dengan preservasi 100% lossless output.

---

## 4. Remaining Checklist (from `dflash2_speculative_acceleration_plan.md`)
- [ ] **Phase 1:** Unduh `incoai/Qwen3.8-27B-DFlash2-GGUF:Q4_K_M` ke `/home/gspe-ai1/models/qwen38-27b/`.
- [ ] **Phase 2:** Update `server-optimize.sh` dengan `--spec-type draft-dflash` dan `--spec-draft-n-max 7`.
- [ ] **Phase 3:** Jalankan stress test multi-stream (`test/run_stress_test.sh`) dan catat hasil benchmark ke `test/results/`.
- [ ] **Phase 4:** Verifikasi live throughput di dashboard Port 8987.
- [ ] **Phase 5:** Update `CHANGELOG.md` dan commit & push ke `origin/main`.

---

## 5. Handover Instruction
Untuk agent atau engineer berikutnya yang mengambil alih sesi ini:
1. Baca file ini ([`.agents/memory/session_state.md`](session_state.md)) dan [`docs/plans/dflash2_speculative_acceleration_plan.md`](../../docs/plans/dflash2_speculative_acceleration_plan.md).
2. Lanjutkan eksekusi checklist mulai dari **Phase 1 (Download DFlash2 Weights)**.
3. Selalu perbarui [`CHANGELOG.md`](../../CHANGELOG.md) setiap menyelesaikan milestone!
