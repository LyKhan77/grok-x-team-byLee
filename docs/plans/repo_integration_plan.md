# Rencana Implementasi: Integrasi Fork Grok Build & Sinkronisasi Remote Repo

## Goal Description
Mengintegrasikan source code upstream **`xai-org/grok-build` (Rust)** dengan seluruh modul kustom internal yang telah kita kembangkan:
1. **Adaptive Standardization Wizard (`scripts/standardize.py`)** & Slash Command **`/standardization`**.
2. **Setup & Onboarding Engine (`setup.sh`)** yang terhubung ke remote repo tim `https://github.com/LyKhan77/grok-x-team-byLee.git`.
3. **Multi-GPU Inference Runner (`server-optimize.sh`)** dan **Multi-User Stress Testing Suite (`benchmark_concurrency.py`, `run_stress_test.sh`)**.
4. **Dokumentasi Lengkap (`PRD.md`, `CONTEXT.md`, `README.md`)** dan **`.gitignore`**.
5. Menghubungkan Git remote ke `https://github.com/LyKhan77/grok-x-team-byLee.git` dan melakukan initial commit.

---

## User Review Required
> [!NOTE]
> Remote repository `https://github.com/LyKhan77/grok-x-team-byLee.git` saat ini masih bersih (empty repository). Kita akan melakukan clone upstream ke branch utama, menerapkan kustomisasi, dan menyiapkan push.

> [!IMPORTANT]
> Untuk autentikasi `git push` ke GitHub, sistem akan menyiapkan commit lokal. Jika diperlukan token GitHub / SSH key saat push, kita dapat memandu langkah push atau mengeksekusinya jika kredensial sudah tersimpan di sistem.

---

## Architecture & File Hierarchy

```
grok-x-team-byLee/ (Repository Root)
├── .agents/
│   └── skills/
│       └── standardization/
│           └── SKILL.md                 # Definisi slash command /standardization
├── .cargo/
│   └── config.toml                      # Build optimization flag
├── crates/                              # Rust Crates from Grok Build
│   ├── ... (TUI, agent-core, pager, ast engine)
├── scripts/
│   ├── standardize.py                   # Interactive Adaptive Questionnaire Wizard
│   └── hooks/
│       └── pre-commit                   # Secret scanner & commit validator
├── temp/                                # Laporan benchmark, log VRAM, & plan docs
│   ├── benchmark_report.md
│   ├── gpu_vram_log.csv
│   └── repo_integration_plan.md
├── benchmark_concurrency.py             # Concurrency benchmark suite (1-4 streams)
├── run_stress_test.sh                   # Runner stress test
├── server-optimize.sh                   # Llama-server multi-user launcher (3x RTX 3090)
├── setup.sh                             # 1-Click Team Onboarding script
├── config.default.toml                  # Default agent configuration
├── PRD.md                               # Product Requirement Document
├── CONTEXT.md                           # AI Agent handoff context
├── README.md                            # Dokumentasi onboarding tim
└── .gitignore                           # Clean ignore rules (target/, temp/*.csv, etc.)
```

---

## Proposed Execution Steps

### Step 1: Ingest Upstream Grok Build Source
1. Meng-clone source code upstream `xai-org/grok-build` ke repositori lokal tanpa menghapus deliverable yang telah dibuat.
2. Memastikan seluruh crate Rust (`crates/*`, `Cargo.toml`, `Cargo.lock`) berada di posisi workspace yang tepat.

### Step 2: Implementasi Adaptive Standardization Wizard
1. **[NEW] [scripts/standardize.py](file:///home/gspe-ai1/project/gspexgrok-agent/scripts/standardize.py):**
   - Wizard kuisioner interaktif 5 pertanyaan (Tech stack, Testing strategy, Commit convention, Linter, Security privacy).
   - Auto-generate aturan spesifik proyek di `.agents/rules/`.
   - Mendaftarkan direktori ke `~/.grok/trusted_dirs.json`.
2. **[NEW] [.agents/skills/standardization/SKILL.md](file:///home/gspe-ai1/project/gspexgrok-agent/.agents/skills/standardization/SKILL.md):**
   - Integrasi slash command `/standardization`.

### Step 3: Pembaruan Setup & Repository Metadata
1. **[MODIFY] [setup.sh](file:///home/gspe-ai1/project/gspexgrok-agent/setup.sh):**
   - Mengarahkan clone URL ke `https://github.com/LyKhan77/grok-x-team-byLee.git`.
   - Menambahkan registrasi command wizard `grok-standardize`.
2. **[MODIFY] [README.md](file:///home/gspe-ai1/project/gspexgrok-agent/README.md):**
   - Memperbarui instruksi clone repository dengan URL `https://github.com/LyKhan77/grok-x-team-byLee.git`.
   - Menambahkan panduan penggunaan perintah `/standardization`.
3. **[NEW] [.gitignore](file:///home/gspe-ai1/project/gspexgrok-agent/.gitignore):**
   - Mengecualikan `target/`, `.env`, `temp/*.csv`, `temp/*.json`, dan file binari besar.

### Step 4: Verifikasi Build & Git Remote Setup
1. Inisialisasi git: `git init -b main`.
2. Verifikasi syntax Rust: `cargo check --workspace` atau verifikasi crates.
3. Hubungkan remote: `git remote add origin https://github.com/LyKhan77/grok-x-team-byLee.git`.
4. Stage seluruh file dan buat initial commit:
   ```bash
   git add .
   git commit -m "feat: initial enterprise grok coding agent with adaptive standardization"
   ```

---

## Verification Plan

### Automated Tests
1. Verifikasi kelengkapan source code dan struktur direktori.
2. Uji coba wizard standarisasi:
   ```bash
   python3 scripts/standardize.py --auto
   ```
3. Verifikasi git status dan remote origin:
   ```bash
   git remote -v
   git status
   ```

### Manual Verification
1. Tinjau dokumen rencana di [temp/repo_integration_plan.md](file:///home/gspe-ai1/project/gspexgrok-agent/temp/repo_integration_plan.md).
2. Memastikan seluruh file siap untuk sinkronisasi ke remote GitHub tim.
