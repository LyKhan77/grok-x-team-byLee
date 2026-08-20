# 📜 Changelog

All notable changes to the **GSPExGrok Agent (`gspexgrok-agent`)** repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔧 Koreksi Dokumentasi (2026-08-20)
- **Koreksi klaim kapasitas context:** Entri sebelumnya menyatakan *"CooperxCompute 4 Slots x 256K Context = 1,048,576 Total Tokens"* sudah aktif. Verifikasi langsung ke mesin menunjukkan server live berjalan pada `--ctx-size 524288` (`n_ctx` 131.072/slot, yaitu **4 x 128K**). Konfigurasi 4 x 256K **belum pernah berhasil naik** — percobaan menaikkannya berakhir OOM. `AGENTS.md`, `README.md`, dan `ARCHITECTURE.md` telah dikoreksi.
- **Koreksi baseline VRAM:** Angka 67.4 GB / 72 GB yang tercatat di plan tidak akurat; nilai terukur adalah **47.8 GB / 72 GB**.
- **Dokumentasi launcher produksi:** Server inferensi dikelola systemd unit `llamacpp.service` (`Restart=always`) yang menjalankan `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh`. `server-optimize.sh` di repo **tidak dijalankan oleh apa pun** dan kini ditandai sebagai salinan referensi.
- **Dokumentasi arsitektur model:** Qwen3.8-27B (GGUF arch `qwen35`) adalah model **hybrid SSM + Attention** — `full_attention_interval=4`, sehingga hanya 16 dari 64 layer memiliki KV cache (18 KiB/token @ `q4_0`); 48 layer sisanya memakai recurrent state berukuran tetap. Ini mengubah seluruh perhitungan kapasitas VRAM.

### ⚡ DFLASH 2 Speculative Acceleration (dalam pengerjaan)
- **Phase 1 selesai:** Drafter `incoai/Qwen3.8-27B-DFlash2-GGUF:Q4_K_M` (1.14 GB) terunduh dan terverifikasi — SHA256 cocok dengan `lfs.oid` HuggingFace, tokenizer (`qwen35`, 248.320 vocab) dan `embedding_length` 5120 identik dengan target. `dflash.block_size=8` mengonfirmasi `--spec-draft-n-max 7`.
- **Blocker teridentifikasi & teratasi:** Build produksi (`master @ 25ae3a9b3`) hanya mendukung DFlash **1** sehingga gagal memuat drafter (`wrong number of tensors; expected 81, got 58`). Dukungan DFlash 2 ada di [PR #27342](https://github.com/ggml-org/llama.cpp/pull/27342) yang masih *open*. Build terpisah dari PR tersebut disiapkan di `/home/gspe-ai1/llama.cpp-dflash2` tanpa menyentuh binary produksi.
- **Phase 2b validasi:** Uji terisolasi CPU-only menghasilkan `draft acceptance = 0.64463 (156/242), mean len = 5.46` — sesuai target plan 4.5–6.5 dan eval resmi HF Q4_K_M (5.39).
- **Phase 2c promote gagal + root cause:** Promote pertama ke produksi crash `SIGABRT` dengan `ggml-backend.cpp:930: pre-allocated tensor (output.weight) in a buffer (CUDA2) that cannot run the operation`. Penyebabnya: drafter DFlash 2 tidak memiliki `output.weight` maupun `tok_embd.weight` sendiri sehingga meminjam milik target; dengan `--tensor-split 1,1,1` tensor tersebut berada di CUDA2, sementara `--spec-draft-device CUDA0` membatasi scheduler konteks drafter ke CUDA0 saja. Perbaikan `--spec-draft-device CUDA0,CUDA1,CUDA2` sudah masuk `scripts/dflash2_promote.sh`, menunggu jendela maintenance untuk uji live.
- **DFLASH 2 live di produksi:** Promote berhasil pada percobaan ke-2 setelah perbaikan `--spec-draft-device CUDA0,CUDA1,CUDA2`. Terukur **55,21 TPS** single stream (baseline ~27 TPS, ≈2.1x) dengan VRAM 55.365 MiB / 73.728 MiB pada `--ctx-size 524288`.
- **Koreksi asumsi KV drafter:** Catatan sebelumnya menyatakan KV drafter DFlash 2 di-cap sliding-window 2048 (~0.17 GiB). Verifikasi ke `llama-model.cpp` menunjukkan `llama_kv_cache_iswa` hanya dipakai bila `dsv4_hc_mult > 0` (varian DSpark); DFlash 2 biasa memakai KV ukuran penuh `n_ctx_seq`, yaitu **20 KiB/token @ F16** (10,0 GiB @ 524288; 20,0 GiB @ 1048576). Konsekuensinya `--ctx-size 1048576` dengan KV drafter F16 akan OOM (proyeksi 74.821 MiB), sedangkan dengan `q4_0` muat (proyeksi 60.101 MiB). Skrip `dflash2_promote.sh` kini menerima argumen kedua untuk tipe KV drafter.
- **Temuan VRAM:** Kegagalan 1M context berasal dari KV cache **F16** drafter lama (Qwen2.5-Coder-0.5B) sebesar 12.288 MiB yang seluruhnya ditumpuk di CUDA0, bukan dari model target. Drafter DFLASH 2 memakai SWA window 2048 sehingga KV-nya hanya ~0.17 GiB — sehingga 1M context dan DFLASH 2 merupakan satu paket perubahan.

- **DFLASH 2 Speculative Acceleration Plan:** Penyusunan master plan integrasi teknologi *Parallel Speculative Drafter* Inco AI DFLASH 2 (`incoai/Qwen3.8-27B-DFlash2-GGUF`) untuk melipatgandakan kecepatan decoding dari ~27 TPS ke **~70–90+ TPS per user** (2.7x–3.4x speedup) dengan preservasi 100% lossless output pada 4 Slots x 256K Context.
- **Official Pi Agent (`pi.dev`) Integration & UTF-8 Encoding Fix:** Integrasi resmi package `@earendil-works/pi-coding-agent` (pi v0.84.2) pada `setup.ps1` dan `setup.sh` dengan generator konfigurasi resmi `~/.pi/agent/models.json` dan `settings.json` berformat UTF-8 murni tanpa BOM untuk mencegah parser error Node.js di Windows.
- **Windows PowerShell 5.1 ASCII Hardening:** Menghilangkan seluruh karakter multibyte Unicode emoji dari `setup.ps1` untuk menjamin kompatibilitas 100% pada sistem operasi Windows 10/11 default.
- **CooperAgent Ecosystem & Cooperx Module Branding:** Re-branding platform menjadi **`CooperAgent`** dengan standarisasi modul kode seri **`Cooperx{Feature}`** (`CooperxCompute`, `CooperxMemory`, `CooperxHarness`, `CooperxTelemetry`, dan `CooperxStandard`).
- **CooperxCompute (4 Slots x 256K Context = 1,048,576 Total Tokens):** Peningkatan kapasitas inferensi server menjadi 4 developer slots independen dengan dedicated 262.144 tokens per slot di 3x RTX 3090 menggunakan kuantisasi KV-cache `q4_0` dan Speculative Acceleration (`--spec-draft-n-max 8`).
- **CooperxMemory Autonomous Persistence Harness:** Implementasi standar persistensi memori mandiri terinspirasi dari Claude Code & Hermes Agent: *Continuous State Checkpointing* (`.agents/memory/session_state.md`), *90% Context Limit Warning Handover Card*, dan *Instant 0-Token Rehydration* tanpa jeda *compaction freeze*.
- **CooperxHarness Multi-Agent Integration (Pi Agent + Grok Build):** Penambahan integrasi otomatis Pi Agent (Lightweight Inline CLI) dan Grok Build (Fullscreen Rust TUI) di skrip onboarding cross-platform `setup.sh` dan `setup.ps1`.
- **System Architecture Blueprint (`ARCHITECTURE.md`):** Penerbitan dokumen arsitektur teknis resmi mencakup topologi 2-tier (Port 8987 Gateway & Port 8001 GPU Backend), Speculative Decoding acceleration, alokasi VRAM 3x RTX 3090, 128K context auto-compact 90%, dan Mermaid sequence diagrams.
- **Public Port 8987 Consolidation:** Mengalihkan seluruh antarmuka publik tim (Web Dashboard, API Gateway, dan Health Check) ke port terpadu `8987`, sementara port `8001` tetap menjadi port privat inferensi GPU.
- **Developer Nickname Identity Tracking:** Menambahkan sistem identifikasi developer (`Authorization: Bearer dev-<nickname>`) pada `setup.sh`, `setup.ps1`, `config.default.toml`, dan API Gateway Next.js, sehingga **LIVE_FEED** dan **Token Tracker** menampilkan nama developer (misal: `lee (192.168.2.45)`).
- **Gateway Health Check Endpoint (`/api/health`):** Endpoint status terpadu di port 8987 untuk memvalidasi kesiapan Gateway dan Llama Backend saat onboarding.
- **Live Feed Session History (CommandCode Style):** Pemantau riwayat sesi LLM yang telah selesai dieksekusi lengkap dengan durasi, total token, kecepatan generasi (tok/s), dan klasifikasi request.
- **LLM Telemetry & Monitoring Dashboard PRD (`dashboard/PRD.md`):** Penyusunan Product Requirement Document resmi untuk web dashboard monitoring LLM berbasis Next.js dan SQLite.
- **Dashboard MVP Implementation (`dashboard/src/`):** Implementasi lengkap web dashboard monitoring LLM internal berbasis Next.js 14 (App Router) dengan 4 modul MVP:
  - **Module 1 — GPU VRAM Monitor:** Real-time 3x RTX 3090 VRAM usage, temperature, dan compute utilization dengan ASCII progress bar.
  - **Module 2 — Inference Engine Slots:** Status 5 parallel slots, model spec, dan client tracking dalam bentuk grid map visual.
  - **Module 4 — Throughput & Latency Meter:** Real-time TPS, TTFT, total token hari ini, dengan *Sparkline chart* interaktif.
  - **Module 5 — Live Stream Feed:** Menampilkan daftar request LLM aktif beserta durasi eksekusi, token emit, ukuran prompt, dan klasifikasi tipe request.
  - **Backend Telemetry API (`/api/telemetry/live`):** Polling aggregator dari `nvidia-smi` + `llama-server` (/health, /slots).
  - **Terminal TUI & Manpage Design System (`dashboard/DESIGN.md`):** Perombakan UI secara total menggunakan *Dark Mode TUI aesthetic*. 100% Font Monospace (JetBrains/Berkeley Mono), warna dasar `Canvas: #201d1d`, garis batas *hairline 1px*, sudut melengkung 4px, dan marker ASCII (`[+]`) sebagai pengganti ikon SVG.
  - **Interactive Visual Modals:** Kemampuan meng-klik setiap panel (*section*) untuk memunculkan *overlay modal* yang menampilkan detail visual metrik seperti grafik dan histogram secara responsif tanpa tumpang-tindih (*overlap*).
- **Hybrid High-Precision Sampling Configuration:** Mengaktifkan kombinasi parameter sampling anti-halusinasi dan anti-looping (`min-p 0.05`, `repeat-penalty 1.10`, `top-k 20`, `top-p 0.85`, `presence-penalty 0.1`) pada `server-optimize.sh`, `~/.grok/config.toml`, `config.default.toml`, dan `setup.sh`.
- **128K Dedicated Context Window per Developer:** Mengonfigurasi server dengan 2 slots parallel dari 262K total context sehingga setiap developer mendapatkan 131,072 tokens dedicated tanpa terbagi kecil.
- **Auto-Compact 90% Threshold Upgrade:** Menaikkan ambang batas auto-compact menjadi `auto_compact_threshold_percent = 90` pada `~/.grok/config.toml`, `config.default.toml`, dan `setup.sh` (memicu kompresi pada ~118K token dalam 128K context) untuk memaksimalkan kapasitas percakapan long-task.
- **Full-Stack Hardware Maximization & Speculative Acceleration:**
  - Mengintegrasikan akselerasi Speculative Decoding dengan draft model [`Qwen2.5-Coder-0.5B-Q8_0.gguf`](/home/gspe-ai1/models/qwen38-27b/Qwen2.5-Coder-0.5B-Q8_0.gguf) yang berjalan di GPU 0.
  - Mengaktifkan kuantisasi KV-Cache `q4_0` (`--cache-type-k q4_0 --cache-type-v q4_0`) untuk memangkas 50% *memory bandwidth traffic* saat perhatian context panjang.
  - Mengalokasikan 20 Physical Cores Intel Core Ultra 7 265 (`--threads 16 --threads-batch 20 --poll 100`) dengan *spin-lock polling* untuk memangkas latensi TTFT menjadi ~372 ms.
  - Memaksimalkan utilisasi Tensor Core Ampere 3x RTX 3090 melalui konfigurasi batching `--batch-size 4096 --ubatch-size 1024`.
- **Cross-Platform 1-Click Onboarding Support:**
  - Menambahkan skrip native Windows PowerShell [`setup.ps1`](setup.ps1) untuk otomatisasi setup Grok Agent di Windows 10/11.
  - Menyempurnakan [`setup.sh`](setup.sh) dengan deteksi kernel Darwin (macOS Zsh / Apple Silicon & Intel) dan Linux POSIX.
  - Memperbarui dokumentasi [`README.md`](README.md) dan [`AGENTS.md`](AGENTS.md) dengan panduan 3-OS onboarding terpadu.

### Removed
- **Benchmark Archive Viewer:** Modul penampil benchmark dihapus karena tidak relevan dengan metrik monitoring *real-time* MVP.

### Fixed
- **Windows PowerShell Onboarding Script (`setup.ps1`):** Memperbaiki galat parsing variable path (`$($env:USERPROFILE)`), tag *Here-String* (`@" ... "@`), dan string escaping agar skrip berjalan lancar tanpa `UnexpectedToken` atau `ParserError`.
- **Token Output Limit Truncation Fix:** Meningkatkan `max_completion_tokens` dan `max_tokens` dari `8192` menjadi `65536` pada `~/.grok/config.toml`, `config.default.toml`, dan `setup.sh` untuk mendukung generasi kode berskala besar tanpa terpotong.
- **Modular Generation Rule:** Menambahkan prinsip *Modular Tool-First Generation* pada `.agents/rules/00-project-context.md` agar agent menulis kode modular bertahap langsung ke file.

---

## [1.0.0-phase5] - 2026-08-18

### Added
- **Remote Git Synchronization:** Repository berhasil diinisialisasi dan di-push ke remote GitHub tim: `https://github.com/LyKhan77/grok-x-team-byLee.git`.
- **Pre-commit Quality Gate:** Hook `scripts/hooks/pre-commit` otomatis aktif via `git config core.hooksPath`.
- **Initial Clean Baseline:** Seluruh artefak arsitektur, stress test, onboarding script, dan standarisasi adaptif berhasil dipublikasikan di branch `main`.

## [1.0.0-phase4] - 2026-08-18

### Added
- **Interactive Project Standardization Wizard (`scripts/standardize.py`):** Kuisioner interaktif 5 pertanyaan dengan *auto-detection* tech stack (Rust, Python, TypeScript, Go, Polyglot) yang secara dinamis menyusun `.agents/rules/`.
- **Slash Command `/standardization`:** Skill definition di `.agents/skills/standardization/SKILL.md` untuk re-standardize kapan saja dari chat agent.
- **Git Pre-Commit Hook (`scripts/hooks/pre-commit`):** Scanner otomatis regex untuk mencegah kebocoran hardcoded API keys dan credentials.
- **`AGENTS.md`:** Panduan utama agen AI di root proyek memuat 8 seksi standar dan protokol wajib pembaruan `CHANGELOG.md`.
- **`CHANGELOG.md`:** Checkpoint tracking log resmi untuk setiap perubahan codebase.

### Changed
- **Restrukturisasi Direktori:**
  - Seluruh dokumentasi dipindahkan ke `docs/` (`docs/PRD.md`, `docs/CONTEXT.md`, `docs/walkthrough.md`, `docs/plans/`).
  - Seluruh file pengujian dipindahkan ke `test/` (`test/benchmark_concurrency.py`, `test/run_stress_test.sh`, `test/results/`).
  - Direktori `temp/` dibersihkan dan dialokasikan murni untuk scratchpad sementara (untracked).

---

## [1.0.0-phase3] - 2026-08-18

### Added
- **Multi-User Stress Testing Suite (`test/benchmark_concurrency.py`):** Evaluator async streaming berbasis `httpx` yang menguji throughput, latensi TTFT, dan pemrosesan `reasoning_content` (CoT).
- **Concurrency Test Runner (`test/run_stress_test.sh`):** Otomasi pengujian bertingkat untuk 1, 2, dan 4 developer aktif simultan.
- **Laporan & Log Uji Beban (`test/results/`):** Laporan markdown (`benchmark_report.md`), raw JSON data (`benchmark_results.json`), dan perekaman VRAM 3x RTX 3090 per detik (`gpu_vram_log.csv`).

### Performance Results
- Single Stream: **24.5 tokens/detik**, TTFT ~409 ms.
- Dual Stream (2 Developers): **42.05 aggregate tokens/detik**, TTFT ~1.97 s.
- Quad Stream (4 Developers): **33.02 aggregate tokens/detik**, 100% success rate tanpa error OOM.
- VRAM Usage: Stabil di ~15.5 GB per GPU (total 3x RTX 3090), menyisakan ~9 GB buffer bebas per GPU.

---

## [1.0.0-phase2] - 2026-08-18

### Added
- **1-Click Developer Onboarding (`setup.sh`):** Skrip setup otomatis untuk laptop developer internal yang mengkonfigurasi binary `grok`, koneksi endpoint LAN kantor, dan setting `~/.grok/config.toml`.
- **High-Concurrency Server Launcher (`server-optimize.sh`):** Skrip starter `llama-server` dengan parameter `--parallel 4`, `--flash-attn`, `--cont-batching`, context 131K tokens, dan tensor split 1:1:1 di 3x GPU.
- **Default Config Template (`config.default.toml`):** Konfigurasi default agent dengan model `qwen35` (Qwen 3.8 / 2.5 27B Q8).

---

## [1.0.0-phase1] - 2026-08-18

### Added
- **Inference Server Host Setup:** Setup `llama-server` pada cluster 3x NVIDIA GeForce RTX 3090 (72 GB VRAM).
- **Model Ingestion:** Pengunduhan dan konfigurasi model `Qwen3.8-27B-Q8_0.gguf` (~29.03 GB) dan Multimodal Vision Projector `mmproj-BF16.gguf`.
- **Health Check & Benchmark Awal:** Endpoint aktif di port `8001` (`/health`, `/v1/chat/completions`, `/v1/models`).
- **PRD & Architecture Design:** Penyusunan dokumen arsitektur dan spesifikasi resmi [docs/PRD.md](docs/PRD.md).
