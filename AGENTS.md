# 🤖 CooperAgent — Engineering & System Guide (`AGENTS.md`)

> **Single Source of Truth** untuk seluruh AI Coding Agent (`grok`, `pi`, `agy`, dll) dan software engineer yang bekerja di platform **CooperAgent**.

---

## 1. Project Overview
**CooperAgent** adalah platform *Enterprise Autonomous Coding Agent On-Premise* yang mengintegrasikan ekosistem multi-agent harness (**Grok Build TUI & Pi Agent CLI**) dengan backend inferensi lokal berkapasitas tinggi (**`CooperxCompute`: `llama.cpp` + Qwen 3.8 / 2.5 27B Q8_0 + Qwen 0.5B Speculative Accelerator**) pada cluster 3x NVIDIA GeForce RTX 3090, dipadukan dengan harness persistensi memori mandiri (**`CooperxMemory`**).

Platform ini memberikan pengalaman coding agent tanpa jeda (*zero latency*), tanpa biaya API cloud, dan menjamin 100% kedaulatan data kode internal perusahaan (*Zero Data Exfiltration*).

---

## 2. Cooperx Modular Ecosystem & Naming Standards

Setiap subsistem dalam platform CooperAgent distandarisasi menggunakan kode seri **`Cooperx{Feature_Name}`**:

| Kode Seri Modul | Deskripsi & Cakupan Teknis |
| :--- | :--- |
| **`CooperxCompute`** | Engine inferensi GPU pada 3x RTX 3090: **3 slot paralel, `--ctx-size 516096` (3 x 168K)**, KV-Cache `q8_0`, DFLASH 2 speculative decoding aktif (`--spec-draft-n-max 5`). Plafon 172.032 token per user. Batas praktisnya kinerja, bukan VRAM — lihat [`docs/plans/multistream_scaling.md`](docs/plans/multistream_scaling.md). |
| **`CooperxMemory`** | Harness persistensi memori mandiri berbasis riset **Claude Code** & **Hermes Agent** (*Continuous State Checkpoint* $\rightarrow$ *88% Context Warning Handover Card* $\rightarrow$ *Instant 0-Token Rehydration*). |
| **`CooperxHarness`** | Dukungan multi-agent fleksibel yang mengintegrasikan **Grok Build (Rust TUI)** dan **Pi Agent (Inline CLI)** di [`setup.sh`](setup.sh) & [`setup.ps1`](setup.ps1). |
| **`CooperxTelemetry`** | API Gateway (Port `8987`) dan SQLite Token Usage Leaderboard & Slot Visualizer Dashboard. |
| **`CooperxStandard`** | Adaptive Project Standardization Wizard (`/standardization` & `scripts/standardize.py`). |

---

## 3. Tech Stack
- **Multi-Agent Harness (`CooperxHarness`):**
  - **Grok Build:** Rust (Ratatui TUI, Async Tokio, AST search engine) — Fork dari `xai-org/grok-build`.
  - **Pi Agent:** Lightweight Inline CLI Coding Agent.
- **Inference Engine (`CooperxCompute`):** `llama.server` (`llama.cpp` dengan Flash Attention `-fa`, KV-Cache `q8_0`, Continuous Batching `--cont-batching`).
- **Foundation Model:** **Qwen 3.8 / 2.5 27B** (27.32B parameters, `Q8_0` GGUF ~29.03 GB) + **Qwen 2.5 Coder 0.5B** Speculative Draft Model + Multimodal Vision Projector (`mmproj-BF16.gguf`).
- **Hardware Host:** 3x NVIDIA GeForce RTX 3090 (Total 72 GB VRAM, `--tensor-split 1,1,1`) + Intel Core Ultra 7 265 (20 Physical Cores).
- **Gateway & Telemetry (`CooperxTelemetry`):** Next.js 14 Streaming Proxy Interceptor + SQLite database (`usage.db`) pada Port `8987`.
- **Remote Git Target:** `https://github.com/LyKhan77/grok-x-team-byLee.git`.

---

## 4. Project Structure
```
gspexgrok-agent/
├── AGENTS.md                            # 📘 Panduan sistem & standar agent CooperAgent (File ini)
├── ARCHITECTURE.md                      # 🏛️ Cetak biru arsitektur teknis lengkap CooperAgent
├── CHANGELOG.md                         # 📜 Checkpoint riwayat perubahan codebase (WAJIB DIUPDATE)
├── README.md                            # 🚀 Dokumentasi onboarding cepat developer CooperAgent
├── config.default.toml                  # ⚙️ Template konfigurasi agent (~/.grok/config.toml - 256K Context)
├── server-optimize.sh                   # 🖥️ Salinan REFERENSI runner CooperxCompute (runner produksi = run-qwen.sh via systemd)
├── setup.sh                             # ⚡ 1-Click onboarding Linux & macOS (Grok + Pi Agent)
├── setup.ps1                            # 🪟 1-Click onboarding Windows PowerShell (Grok + Pi Agent)
├── .gitignore                           # 🛡️ Git ignore list (target/, temp/, secrets)
│
├── docs/                                # 📚 Dokumentasi Lengkap Proyek
│   ├── PRD.md                           # Product Requirement Document resmi CooperAgent
│   ├── CONTEXT.md                       # AI Agent Handover Context
│   ├── walkthrough.md                   # Laporan hasil verifikasi teknis
│   └── plans/                           # Arsip Technical Implementation Plans
│       ├── cooperagent_master_plan.md   # Master Plan CooperAgent & Cooperx Modules
│       ├── port_8987_and_developer_identity_plan.md
│       ├── model_speed_optimization_q8_plan.md
│       └── fase3_stress_test_plan.md
│
├── test/                                # 🧪 Test Suite & Hasil Benchmark
│   ├── benchmark_concurrency.py         # Engine pengujian beban streaming async
│   ├── run_stress_test.sh               # Runner otomatis pengujian beban 1, 2, 4 stream
│   └── results/                         # Laporan performa terverifikasi
│
├── dashboard/                           # 📈 CooperxTelemetry Dashboard & API Gateway (Port 8987)
│   ├── DESIGN.md                        # 🎨 Aturan desain UI TUI / Manpage
│   ├── README.md                        # 📖 Panduan setup dashboard
│   ├── PRD.md                           # 📋 Product requirements dashboard
│   ├── src/app/                         # 🌐 Next.js App Router (UI & API)
│   └── src/components/                  # 🧩 React TUI Components
│
├── scripts/                             # 🛠️ Tooling & Otomasi
│   ├── standardize.py                   # Wizard standarisasi proyek (CooperxStandard)
│   └── hooks/
│       └── pre-commit                   # Secret scanner & commit quality hook
│
└── .agents/                             # 🤖 Standar Aturan & Skills Coding Agent
    ├── rules/                           # Aturan coding aktif (.md)
    │   ├── 00-project-context.md        # Konteks proyek & arsitektur
    │   ├── 01-coding-standards.md       # Standar kode
    │   ├── 02-git-workflow.md           # Konvensi git commit
    │   ├── 03-testing-guidelines.md     # Panduan testing
    │   ├── 04-security-privacy.md       # Guardrail keamanan
    │   └── 05-cooperx-memory.md         # Standar persistensi memori CooperxMemory
    ├── memory/                          # Direktori ledger memori kerja
    │   ├── session_state.md             # Ledger proyek BERSAMA (semua developer)
    │   ├── session_state.template.md    # Template ledger
    │   └── sessions/                    # Namespace PER developer
    │       ├── _template.md             # Salin ini saat sesi pertama
    │       ├── <dev-id>.md              # Checkpoint milik satu developer
    │       └── archive/                 # Sesi lama yang sudah diarsipkan
    └── rules/                       # (lanjutan) — TIDAK dibaca otomatis

├── .grok/skills/                        # 🔌 Slash command — DIBACA OTOMATIS oleh Grok
│   ├── init-agent/SKILL.md              # /init-agent      — susun AGENTS.md dari repo
│   ├── init-changelog/SKILL.md          # /init-changelog  — catatan checkpoint perubahan
│   ├── long-task/SKILL.md               # /long-task       — kerja lintas sesi berbasis rencana
│   ├── checkpoint/SKILL.md              # /checkpoint      — simpan state sesi
│   └── standardization/SKILL.md         # /standardization — kuesioner standar proyek
```

---

## 5. Project Commands

| Perintah | Deskripsi | Lokasi File |
| :--- | :--- | :--- |
| `./setup.sh` | Onboarding 1-Click untuk Linux & macOS (Pilihan Grok & Pi) | [setup.sh](setup.sh) |
| `.\setup.ps1` | Onboarding 1-Click untuk Windows PowerShell | [setup.ps1](setup.ps1) |
| `sudo systemctl restart llamacpp.service` | Menjalankan/restart CooperxCompute di host GPU. Config nyata ada di `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh`, **bukan** `server-optimize.sh`. | [session_state.md](.agents/memory/session_state.md) |
| `./test/run_stress_test.sh` | Menjalankan stress test & benchmark multi-stream | [test/run_stress_test.sh](test/run_stress_test.sh) |
| `python3 scripts/standardize.py` | Menjalankan wizard standarisasi adaptif (CooperxStandard) | [scripts/standardize.py](scripts/standardize.py) |
| `/standardization` | Slash command interaktif di chat agent | [.agents/skills/standardization/SKILL.md](.agents/skills/standardization/SKILL.md) |

---

## 6. Coding Conventions & Guardrails
1. **Filosofi YAGNI & Kesederhanaan:** Prioritaskan solusi paling minimal, bersih, dan langsung bekerja. Hindari spekulasi abstraksi yang berlebihan.

## Batas Scope — apa disimpan di mana

Ingatan sesi tiap developer tersimpan **lokal di mesinnya**, bukan di repo:

| Lapis | Pemilik | Lokasi | Terbagi? |
| :--- | :--- | :--- | :---: |
| Inference, KV, slot | llama.cpp | VRAM + RAM server | — |
| Sesi, compaction, resume, memory | Grok CLI | `~/.grok/sessions/`, `~/.grok/memory/` | **tidak** |
| Instruksi, keputusan, changelog | Repository | `AGENTS.md`, `docs/`, `CHANGELOG.md` | **ya** |

Aturannya satu kalimat: **bila developer lain perlu melihatnya, tempatnya di git.**
Jangan menyimpan pengetahuan tim di memory Grok — ia tidak ikut berpindah mesin.

Rincian: [`docs/harness_scope.md`](docs/harness_scope.md).

---

## Protokol Sesi (WAJIB — ini satu-satunya berkas yang dibaca otomatis)

Berkas ini ditempelkan ke system prompt setiap sesi. Aturan lengkap ada di
`.agents/rules/05-cooperx-memory.md`, tetapi berkas itu **tidak** dibaca otomatis —
jadi tiga hal berikut harus dijalankan tanpa menunggu diminta.

### 1. Awal sesi — BACA dulu, jangan langsung bekerja

Sebelum menjawab permintaan pertama, baca berurutan:

```
.agents/memory/sessions/<dev-id>.md     # checkpoint developer ini
.agents/memory/session_state.md         # ledger proyek bersama
```

Lalu konfirmasi dalam 3 baris: **Active Task**, **Next Steps**, **Blockers**.
Konfirmasi ini wajib — tanpanya, melanjutkan dari state basi tidak akan ketahuan.

Bila `sessions/<dev-id>.md` belum ada, salin `sessions/_template.md`.

### 2. Selama sesi — tulis checkpoint di batas tugas

Pada tiap batas tugas — milestone berpindah ke `[x]`, bug terverifikasi selesai,
atau keputusan arsitektural diambil — lakukan **dua** hal, berapa pun context saat itu:

1. `/flush` — menulis ringkasan sesi ke memory Grok. Ringkasan ini dicari
   **otomatis pada giliran pertama sesi berikutnya**, sehingga setelah `/new`
   agent tetap mengingat intinya. Sifatnya lokal per mesin.
2. Perbarui `sessions/<dev-id>.md` — state yang terbagi ke tim lewat git.

Ambang 88% adalah jaring pengaman, bukan jadwal.

Meringkas di tengah investigasi menghasilkan ringkasan tentang keadaan setengah
jadi, dan sesi berikutnya mewarisi kebingungan itu.

### 3. Task yang melewati satu context — rencana, bukan ingatan

Untuk pekerjaan yang tidak selesai dalam satu sesi, **rencana hidup di berkas**:
`docs/plans/<slug>.md` (template: `docs/plans/_TEMPLATE.md`). Panggil `/long-task`.

Alurnya: baca rencana → **verifikasi klaim terakhir terhadap repository** →
kerjakan SATU langkah → tempelkan bukti → commit → `/flush` → `/new`.

Repository dan hasil test adalah kebenaran; rencana hanya klaim. Langkah `[x]`
yang tidak lolos verifikasi diturunkan ke `[~]` dan dikerjakan ulang.

**Jangan `--resume` untuk melanjutkan task** — itu memuat ulang transkrip lama,
mahal di prefill dan membawa kebingungan yang sudah selesai.

### 3b. Ritual tiga perintah

```
selesai satu langkah  ->  /flush  ->  /new  ->  "lanjutkan <rencana>"
```

`/flush` **menyimpan**, tidak membebaskan context. `/new` yang membebaskan.
Menjalankan `/flush` sendirian saat context penuh tidak menolong sama sekali —
pengetahuannya tersimpan, tetapi ruangnya tetap habis.

Pemicunya **batas tugas, bukan persentase.** Pemicu berbasis persentase selalu
menangkap keadaan setengah jadi; batas tugas menghasilkan checkpoint bersih.

### 4. Ambang 88% (151.388 token) — jaring pengaman

| | nilai |
| :--- | ---: |
| `n_ctx` per slot | 172.032 |
| Ambang handover | 151.388 (88%) |
| Plafon keras | sedang diukur (fase 1) |
| `max_tokens` | 12.288 |

Auto-compact adalah **jaring pengaman, bukan tulang punggung**. Ia terpicu oleh
ambang alih-alih batas tugas, sehingga meringkas keadaan setengah jadi apa pun
yang kebetulan tertangkap. Templatenya internal dan panjangnya tidak dapat
diatur — terukur ~3.463 token pada satu checkpoint nyata.

Durasinya sendiri kini wajar (~1,4 menit pada throughput sekarang; dulu ~15 menit
karena TPS runtuh saat 4 slot sibuk, bukan karena compaction-nya). Yang tetap
tidak bisa diandalkan adalah *isinya*, bukan kecepatannya.

**Jangan resume context lama** untuk melanjutkan tugas. Mulai sesi bersih lalu
baca checkpoint — resume memaksa prefill 100K+ token yang menyumbang 72% beban
prefill server.

---

2. **State-First & CooperxMemory Protocol:** Lihat §Protokol Sesi di bawah. Ringkasnya: **baca** memori di awal sesi, **tulis** checkpoint di tiap batas tugas, handover pada context **88%** (151.388 token).
3. **Conventional Commits:** Semua pesan commit wajib mengikuti format baku: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
4. **Zero-Secret Policy:** Dilarang keras menaruh API key, password, atau credential mentah di source code.
5. **Folder Hygiene:**
   - Semua dokumentasi wajib di `docs/`.
   - Semua script pengujian dan hasil benchmark wajib di `test/` dan `test/results/`.
   - Folder `temp/` hanya untuk scratch file sementara.

---

## 7. 🚨 MANDATORY PROTOCOL: Update `CHANGELOG.md`
> [!CRITICAL]
> **Setiap kali AI Agent atau developer melakukan modifikasi arsitektur, penambahan script, pembaruan konfigurasi, atau penyelesaian task:**
>
> 1. **WAJIB membuka dan memperbarui file [`CHANGELOG.md`](CHANGELOG.md)**.
> 2. Cantumkan perubahan tersebut di bawah seksi `[Unreleased]` atau versi checkpoint terbaru.
> 3. Gunakan kategori: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, atau `Security`.
> 4. Jangan menutup task coding tanpa mencatat checkpoint di `CHANGELOG.md`!
