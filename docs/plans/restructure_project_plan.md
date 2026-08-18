# Rencana Implementasi: Restrukturisasi Proyek, `AGENTS.md`, dan `CHANGELOG.md`

## Goal Description
Menata ulang dan merapikan struktur direktori repository agar bersih (*clean*), modular, dan *maintainable* untuk kolaborasi jangka panjang:
1. **Dokumentasi Terpusat (`docs/`):** Memindahkan seluruh PRD, context handover, rencana fase, dan walkthrough ke dalam folder `docs/`.
2. **Pengujian Terpusat (`test/`):** Memindahkan suite benchmark konkurensi, runner script, dan laporan hasil benchmark ke dalam folder `test/`.
3. **Pembersihan `temp/`:** Mengembalikan fungsi `temp/` murni sebagai direktori *scratchpad / ephemeral* sementara yang tidak di-track permanen.
4. **Pembuatan `AGENTS.md`:** Panduan utama AI Agent di root workspace (Project Overview, Tech Stack, Key Features, Project Structure, Project Commands, Coding Conventions, Current State, dan Pointer Wajib Pembaruan `CHANGELOG.md`).
5. **Pembuatan `CHANGELOG.md`:** Ledger checkpoint resmi yang mencatat setiap perubahan, penambahan fitur, dan perbaikan codebase.

---

## User Review Required
> [!IMPORTANT]
> `AGENTS.md` akan mencantumkan aturan keras (*hard rule*): **Setiap coding agent atau developer yang melakukan perubahan codebase WAJIB mencatat checkpoint di `CHANGELOG.md`**.

> [!NOTE]
> Seluruh script runner (`run_stress_test.sh`, `benchmark_concurrency.py`, `setup.sh`) akan disesuaikan path-nya agar secara otomatis membaca/menulis ke folder `test/` dan `docs/`.

---

## Target Clean Project Structure

```
gspexgrok-agent/ (Repository Root)
├── AGENTS.md                            # Panduan & Standar Agent (Single Source of Truth)
├── CHANGELOG.md                         # Checkpoint histori perubahan codebase
├── README.md                            # Dokumentasi ringkas onboarding tim
├── config.default.toml                  # Template konfigurasi default agent
├── server-optimize.sh                   # Runner llama-server multi-user (3x RTX 3090)
├── setup.sh                             # 1-Click developer onboarding script
├── .gitignore                           # Git ignore rules
│
├── docs/                                # 📚 Seluruh Dokumentasi Proyek
│   ├── PRD.md                           # Product Requirement Document
│   ├── CONTEXT.md                       # AI Agent Context Handover
│   ├── walkthrough.md                   # Walkthrough hasil uji Fase 3
│   └── plans/                           # Arsip Technical Plan Documents
│       ├── fase3_stress_test_plan.md
│       ├── fase4_adaptive_standardization_plan.md
│       ├── fork_and_customization_plan.md
│       └── repo_integration_plan.md
│
├── test/                                # 🧪 Seluruh File & Hasil Pengujian
│   ├── benchmark_concurrency.py         # Async streaming stress test engine
│   ├── run_stress_test.sh               # Runner otomatis multi-stream
│   └── results/                         # Laporan & Log Hasil Uji
│       ├── benchmark_report.md          # Laporan tabel performa markdown
│       ├── benchmark_results.json       # Raw metrics data
│       └── gpu_vram_log.csv             # Log snapshot VRAM per detik
│
├── scripts/                             # 🛠️ Tooling & Automation Scripts
│   ├── standardize.py                   # Adaptive Standardization Wizard
│   └── hooks/
│       └── pre-commit                   # Secret scanner & commit hook
│
├── .agents/                             # 🤖 Coding Agent Skills & Rules
│   └── skills/
│       └── standardization/
│           └── SKILL.md                 # Slash command /standardization
│
└── temp/                                # 🗑️ Ephemeral / Scratch Files (Untracked)
    └── .gitkeep
```

---

## Proposed Changes & File Operations

### Component 1: File Relocations & Directory Cleanup
1. Pindahkan `PRD.md`, `CONTEXT.md` ke `docs/`.
2. Pindahkan seluruh plan documents dari `temp/` ke `docs/plans/` dan `docs/walkthrough.md`.
3. Pindahkan `benchmark_concurrency.py`, `run_stress_test.sh` ke `test/`.
4. Pindahkan `benchmark_report.md`, `benchmark_results.json`, `gpu_vram_log.csv` ke `test/results/`.
5. Bersihkan `temp/` dan buat `temp/.gitkeep`.

---

### Component 2: Core Project Governance Files

#### [NEW] [AGENTS.md](file:///home/gspe-ai1/project/gspexgrok-agent/AGENTS.md)
Dokumen komprehensif panduan agen yang memuat 8 poin spesifikasi user:
1. **Project Overview** (Enterprise Coding Agent On-Premise berbasis Fork Grok Build + Qwen 27B).
2. **Tech Stack** (Rust/Ratatui, llama.cpp, Qwen 3.8/2.5 27B Q8_0, Python async test suite, 3x RTX 3090 GPU cluster).
3. **Key Features** (100% On-Premise Privacy, Continuous Batching, Adaptive Wizard `/standardization`, Multimodal Vision, Native CoT Reasoning).
4. **Project Structure** (Navigasi folder `docs/`, `test/`, `scripts/`, `.agents/`, `temp/`).
5. **Project Commands** (Perintah menjalankan server AI, stress test, onboarding developer, dan wizard standarisasi).
6. **Coding Conventions** (YAGNI, TDD, Conventional Commits, Zero-Secret Rule, Multi-GPU safety).
7. **Current State** (Fase 1 Selesai, Fase 2 Selesai, Fase 3 Selesai, Fase 4 In Progress).
8. **Mandatory Changelog Protocol** (Instruksi wajib memperbarui `CHANGELOG.md` pada setiap perubahan kode).

#### [NEW] [CHANGELOG.md](file:///home/gspe-ai1/project/gspexgrok-agent/CHANGELOG.md)
Ledger checkpoint pelacakan versi:
- `[Unreleased]` — Penataan struktur folder, AGENTS.md, dan wizard standarisasi adaptif.
- `[v1.0.0-phase3]` (2026-08-18) — Validasi Multi-User Concurrency & Stress Testing Suite (1-4 stream, aggregate 42 tps, stable VRAM).
- `[v1.0.0-phase2]` (2026-08-18) — Onboarding automation (`setup.sh`), server launcher (`server-optimize.sh`), template config.
- `[v1.0.0-phase1]` (2026-08-18) — Validasi inferensi lokal Qwen 27B Q8_0 pada 3x RTX 3090, context 131K tokens, vision projector.

---

### Component 3: Script Adjustments
1. **[MODIFY] [test/run_stress_test.sh](file:///home/gspe-ai1/project/gspexgrok-agent/test/run_stress_test.sh):**
   - Update output directory default menjadi `test/results/`.
2. **[MODIFY] [README.md](file:///home/gspe-ai1/project/gspexgrok-agent/README.md):**
   - Sesuaikan path link dokumentasi ke `docs/PRD.md` dan test suite ke `test/`.

---

## Verification Plan

### Automated Tests
1. Verifikasi integritas struktur direktori:
   ```bash
   ls -la docs/ docs/plans/ test/ test/results/ temp/
   ```
2. Verifikasi script runner stress test bekerja dengan path baru:
   ```bash
   chmod +x test/run_stress_test.sh test/benchmark_concurrency.py
   python3 test/benchmark_concurrency.py --help
   ```
3. Verifikasi file `AGENTS.md` dan `CHANGELOG.md` ada dan valid di root workspace.

### Manual Verification
1. Pastikan folder `temp/` bersih dari artefak permanen.
2. Tinjau kemudahan navigasi file melalui tautan di `AGENTS.md` dan `README.md`.
