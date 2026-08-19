# 📜 Changelog

All notable changes to the **GSPExGrok Agent (`gspexgrok-agent`)** repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **LLM Telemetry & Monitoring Dashboard PRD (`dashboard/PRD.md`):** Penyusunan Product Requirement Document resmi untuk web dashboard monitoring LLM berbasis Next.js, SQLite, dan kepatuhan penuh terhadap 1996 Catalog-Era Design System (`dashboard/DESIGN.md`).
- **Hybrid High-Precision Sampling Configuration:** Mengaktifkan kombinasi parameter sampling anti-halusinasi dan anti-looping (`min-p 0.05`, `repeat-penalty 1.10`, `top-k 20`, `top-p 0.85`, `presence-penalty 0.1`) pada `server-optimize.sh`, `~/.grok/config.toml`, `config.default.toml`, dan `setup.sh`.
- **256K Context Window Upgrade:** Meningkatkan total context server ke `262,144 tokens` (memberikan ~52.4K token dedicated per slot pada 5 developer bersamaan) untuk menjamin eksekusi long-task dan multi-turn reasoning `xhigh` tanpa terpotong.

### Fixed
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
