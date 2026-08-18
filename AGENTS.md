# 🤖 GSPExGrok Agent — Engineering & System Guide (`AGENTS.md`)

> **Single Source of Truth** untuk seluruh AI Coding Agent (`grok`, `agy`, dll) dan software engineer yang bekerja di repository `gspexgrok-agent`.

---

## 1. Project Overview
**GSPExGrok Agent (`gspexgrok-agent`)** adalah platform *Enterprise Coding Agent On-Premise* yang menggabungkan coding agent terminal berbasis Rust (**Fork Grok Build**) dengan backend inferensi lokal berkecepatan tinggi (**`llama.cpp` + Qwen 3.8 / 2.5 27B Q8_0**) yang berjalan pada cluster 3x NVIDIA GeForce RTX 3090.

Platform ini memberikan pengalaman coding agent tanpa jeda (*zero latency*), tanpa biaya API cloud, dan menjamin 100% kedaulatan data kode internal perusahaan.

---

## 2. Tech Stack
- **Agent Harness:** Rust (Ratatui TUI, Async Tokio, AST search engine) — Fork dari `xai-org/grok-build`.
- **Inference Engine:** `llama.server` (`llama.cpp` release build dengan Flash Attention `-fa` & Continuous Batching `--cont-batching`).
- **Foundation Model:** **Qwen 3.8 / 2.5 27B** (27.32B parameters, `Q8_0` GGUF ~29.03 GB) + Multimodal Vision Projector (`mmproj-BF16.gguf`).
- **Hardware Host:** 3x NVIDIA GeForce RTX 3090 (Total 72 GB VRAM, `--tensor-split 1,1,1`).
- **Testing & Benchmarking:** Python 3.10+ (`httpx` async client streaming evaluation).
- **Remote Git Target:** `https://github.com/LyKhan77/grok-x-team-byLee.git`.

---

## 3. Key Features
1. **100% On-Premise Data Sovereignty:** Seluruh token prompt, source code, dan proses berpikir (*Chain of Thought*) diproses lokal tanpa telemetri eksternal.
2. **High-Concurrency Multi-User:** Mampu melayani 4 stream developer aktif simultan secara paralel dengan throughput hingga 42.05 tokens/detik.
3. **Adaptive Project Standardization Wizard (`/standardization`):** Kuisioner interaktif 5 pertanyaan yang secara dinamis menyusun `.agents/rules/` sesuai tech stack tiap repositori.
4. **Native Reasoning (CoT) & Multimodal Vision:** Menampilkan pemikiran model secara collapsible di TUI dan mampu membaca tangkapan layar UI/diagram sistem.
5. **Quality & Secret Guardrails:** Dilengkapi Git pre-commit hook untuk mencegah kebocoran kredensial atau API key.

---

## 4. Project Structure
```
gspexgrok-agent/
├── AGENTS.md                            # 📘 Panduan sistem & standar agent (File ini)
├── CHANGELOG.md                         # 📜 Checkpoint riwayat perubahan codebase (WAJIB DIUPDATE)
├── README.md                            # 🚀 Dokumentasi onboarding cepat developer
├── config.default.toml                  # ⚙️ Template konfigurasi agent (~/.grok/config.toml)
├── server-optimize.sh                   # 🖥️ Runner server llama.cpp berkapasitas tinggi (3x GPU)
├── setup.sh                             # ⚡ 1-Click onboarding script untuk laptop tim
├── .gitignore                           # 🛡️ Git ignore list (target/, temp/, secrets)
│
├── docs/                                # 📚 Dokumentasi Lengkap Proyek
│   ├── PRD.md                           # Product Requirement Document resmi
│   ├── CONTEXT.md                       # AI Agent Handover Context
│   ├── walkthrough.md                   # Laporan hasil verifikasi teknis
│   └── plans/                           # Arsip Technical Implementation Plans
│       ├── fase3_stress_test_plan.md
│       ├── fase4_adaptive_standardization_plan.md
│       ├── fork_and_customization_plan.md
│       └── repo_integration_plan.md
│
├── test/                                # 🧪 Test Suite & Hasil Benchmark
│   ├── benchmark_concurrency.py         # Engine pengujian beban streaming async
│   ├── run_stress_test.sh               # Runner otomatis pengujian beban 1, 2, 4 stream
│   └── results/                         # Laporan performa terverifikasi
│       ├── benchmark_report.md          # Laporan markdown metrik TTFT & throughput
│       ├── benchmark_results.json       # Raw metrics output
│       └── gpu_vram_log.csv             # Perekaman utilisasi VRAM 3x RTX 3090 per detik
│
├── scripts/                             # 🛠️ Tooling & Otomasi
│   ├── standardize.py                   # Wizard standarisasi proyek interaktif
│   └── hooks/
│       └── pre-commit                   # Secret scanner & commit quality hook
│
├── .agents/                             # 🤖 Standar Aturan & Skills Coding Agent
│   ├── rules/                           # Aturan coding aktif (.md) hasil wizard
│   └── skills/
│       └── standardization/
│           └── SKILL.md                 # Definisi slash command /standardization
│
└── temp/                                # 🗑️ Ephemeral / Scratch Files Saja (Untracked)
    └── README.md
```

---

## 5. Project Commands

| Perintah | Deskripsi | Lokasi File |
| :--- | :--- | :--- |
| `./setup.sh` | Onboarding 1-Click untuk laptop developer baru | [setup.sh](setup.sh) |
| `./server-optimize.sh` | Menjalankan `llama-server` multi-user di host GPU | [server-optimize.sh](server-optimize.sh) |
| `./test/run_stress_test.sh` | Menjalankan stress test & benchmark multi-stream | [test/run_stress_test.sh](test/run_stress_test.sh) |
| `python3 scripts/standardize.py` | Menjalankan wizard standarisasi adaptif | [scripts/standardize.py](scripts/standardize.py) |
| `/standardization` | Slash command interaktif di chat agent | [.agents/skills/standardization/SKILL.md](.agents/skills/standardization/SKILL.md) |

---

## 6. Coding Conventions & Guardrails
1. **Filosofi YAGNI & Kesederhanaan:** Prioritaskan solusi paling minimal, bersih, dan langsung bekerja. Hindari spekulasi abstraksi yang berlebihan.
2. **Conventional Commits:** Semua pesan commit wajib mengikuti format baku:
   - `feat:` (fitur baru), `fix:` (perbaikan bug), `refactor:` (restrukturisasi kode), `test:` (penambahan/update tes), `docs:` (dokumentasi), `chore:` (tooling/konfigurasi).
3. **Test-Driven / Verified First:** Setiap fungsionalitas baru wajib divalidasi dengan pengujian otomatis sebelum dinyatakan selesai.
4. **Zero-Secret Policy:** Dilarang keras menaruh API key, password, atau credential mentah di source code.
5. **Folder Hygeine:**
   - Semua dokumentasi wajib di `docs/`.
   - Semua script pengujian dan hasil benchmark wajib di `test/` dan `test/results/`.
   - Folder `temp/` hanya untuk scratch file sementara.

---

## 7. Current State & Roadmap Milestones
- [x] **Fase 1: Inference & Prototype Validation** — Selesai (Qwen 27B Q8 pada 3x RTX 3090, 131k context, ~27.5 tok/s single stream).
- [x] **Fase 2: Forking & Onboarding Automation** — Selesai (`setup.sh`, `server-optimize.sh`, `config.default.toml`).
- [x] **Fase 3: Multi-User Scale & Concurrency Testing** — Selesai (Benchmark 1-4 stream sukses, peak throughput 42 tok/s, VRAM aman di 15.5 GB).
- [x] **Fase 4: Adaptive Standardization & Project Restructuring** — Selesai (Wizard `scripts/standardize.py`, slash command `/standardization`, `AGENTS.md`, `CHANGELOG.md`, `docs/`, `test/`).
- [x] **Fase 5: Git Remote Synchronization & Upstream Merge** — Selesai (Tersinkronisasi penuh ke `https://github.com/LyKhan77/grok-x-team-byLee.git`).

---

## 8. 🚨 MANDATORY PROTOCOL: Update `CHANGELOG.md`
> [!CRITICAL]
> **Setiap kali AI Agent atau developer melakukan modifikasi arsitektur, penambahan script, pembaruan konfigurasi, atau penyelesaian task:**
>
> 1. **WAJIB membuka dan memperbarui file [`CHANGELOG.md`](CHANGELOG.md)**.
> 2. Cantumkan perubahan tersebut di bawah seksi `[Unreleased]` atau versi checkpoint terbaru.
> 3. Gunakan kategori: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, atau `Security`.
> 4. Jangan menutup task coding tanpa mencatat checkpoint di `CHANGELOG.md`!
