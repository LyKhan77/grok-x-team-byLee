# Product Requirement Document (PRD)
## GSPExGrok Internal Coding Agent Harness

**Project Name:** GSPExGrok Agent (`gspexgrok-agent`)  
**Version:** 1.0.0  
**Status:** In Progress / Architecture Approved  
**Author:** AI Platform & Engineering Team  
**Last Updated:** 2026-08-18  
**Upstream Base:** [xai-org/grok-build](https://github.com/xai-org/grok-build) (Apache 2.0)  
**Foundation Model:** [Qwen/Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) (Q8_0 GGUF on `llama.cpp`)

---

## 1. Executive Summary & Problem Statement

### 1.1 Objective
Membangun dan menyediakan platform **Enterprise Coding Agent On-Premise** untuk seluruh tim engineer internal. Solusi ini menggabungkan harness coding agent mutakhir berbasis Rust (**Grok Build**) dengan inference engine lokal berkecepatan tinggi (**`llama.cpp` + Qwen 3.8 / 2.5 27B**) yang didistribusikan pada cluster GPU 3x NVIDIA GeForce RTX 3090.

### 1.2 Core Value Proposition
1. **100% Data Sovereignty & Privacy:** Seluruh kode sumber, arsitektur sistem, dan konteks proyek diproses 100% di server lokal tanpa ada token atau telemetri yang keluar ke cloud eksternal.
2. **Zero-Latency Developer Experience:** Harness berbasis Rust (Ratatui TUI) yang sangat ringan, responsif, dan hemat memori pada laptop developer.
3. **No-Proxy Integration:** Berbeda dengan Claude Code yang membutuhkan LiteLLM bridge, Grok Build memiliki native support untuk endpoint OpenAI-compatible (`/v1/chat/completions`), menghasilkan latensi minimal dan overhead nol.
4. **Cost Elimination:** Menghilangkan biaya langganan API berbayar per-token untuk tim pengembangan perangkat lunak.

---

## 2. Foundation Model & Hardware Specification

### 2.1 Model Architecture & Capabilities
* **Model ID:** [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) (atau Qwen2.5-Coder family)
* **Parameter Count:** 27,320,697,856 parameters (~27.3B)
* **Quantization Format:** `Q8_0` GGUF (Ukuran file: ~29.03 GB)
* **Context Length:** 
  * Native / Training Context: Up to 262,144 tokens (256K)
  * Active Runtime Context: 131,072 tokens (128K per developer session)
* **Multimodal Capability:** Dilengkapi *Visual Projector* (`mmproj-BF16.gguf`) untuk analisis diagram arsitektur, wireframe UI, dan tangkapan layar error.
* **Native Reasoning:** Model menghasilkan `reasoning_content` (Chain-of-Thought thinking tokens) sebelum mengeluarkan jawaban final atau memanggil tool.

### 2.2 Inference Infrastructure (`llama.cpp`)
* **Host Hardware:** 3x NVIDIA GeForce RTX 3090 (Total 72 GB VRAM) + Intel Core Ultra 7 265 (20 Cores)
* **Offloading Strategy:** `--gpu-layers 999 --tensor-split 1,1,1` (Distribusi seimbang ~13.5 GB VRAM per GPU).
* **Throughput Benchmark:** ~27.0 tokens/second (single stream), TTFT < 380 ms.
* **Concurrency Engine:** Continuous batching, Flash Attention (`--flash-attn on`), Jinja chat templating, KV-Cache `q4_0`.
* **2-Tier Active Endpoints:**
  * Public Team Web Dashboard: `http://192.168.2.143:8987/`
  * Public Gateway API: `http://192.168.2.143:8987/api/v1`
  * Public Gateway Health Check: `http://192.168.2.143:8987/api/health`
  * Private GPU Backend (Internal Host): `http://127.0.0.1:8001/v1`

---

## 3. Harness Architecture: Grok Build Fork

### 3.1 Upstream Source
Platform agent menggunakan basis open-source [**xai-org/grok-build**](https://github.com/xai-org/grok-build), sebuah coding agent terminal kelas industri yang ditulis dalam bahasa pemrograman Rust.

### 3.2 Key Agent Capabilities
1. **Interactive Fullscreen TUI:**
   * Split-screen visual diff viewer (meninjau usulan perubahan sebelum diaplikasikan).
   * File tree & symbol navigation.
   * Multi-session tab management (`Ctrl+T`) dan Model Picker modal (`Ctrl+M`).
2. **Tool Execution Engine:**
   * `file_read` & `file_edit` (Search & Replace format dengan AST awareness).
   * `bash_run` (Eksekusi build, test, linter secara terkontrol).
   * `grep_search` / `file_search` (Pencarian kode cepat berbasis ripgrep).
   * `subagent_spawn` (Pendelegasian tugas paralel ke sub-agen).
3. **Safety & Permission Controls:**
   * Granular permission levels (`allow`, `ask`, `deny`) untuk perintah shell sensitif.
   * Sandboxing mode opsional untuk eksekusi kode berisiko.

### 3.3 Penyesuaian Wajib pada Fork Internal (`gspexgrok-agent`)
1. **Endpoint Routing Otomatis:** Menghapus ketergantungan wajib pada `grok login` dan secara default mengarahkan request ke API Gateway `http://192.168.2.143:8987/api/v1`.
2. **Developer Identity Tracking:** Menyertakan identitas developer melalui Authorization Header (`api_key = "dev-<nickname>"`).
3. **Telemetry & Auto-Update Disabling:** Mematikan semua panggilan telemetri analitik cloud pihak ketiga (`telemetry = false`, `auto_update = false`).
4. **Reasoning Stream Parsing:** Menjamin blok proses berpikir Qwen (`reasoning_content`) dirender dalam box *collapsible* di TUI tanpa mengganggu parsing tool-call.
5. **Pre-Configured System Instructions:** Menginjeksi aturan coding standar tim (*coding standard, commit rules, test requirements*).

---

## 4. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Developer Workstations (Team)                      │
│                                                                         │
│  ┌────────────────────────┐                 ┌────────────────────────┐  │
│  │   Developer 1 (macOS)  │                 │   Developer 2 (Windows)│  │
│  │   `grok` TUI Terminal  │                 │   `grok` TUI Terminal  │  │
│  └───────────┬────────────┘                 └───────────┬────────────┘  │
└──────────────┼──────────────────────────────────────────┼───────────────┘
               │                                          │
               │ HTTP REST / SSE Stream (Bearer dev-name) │
               ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PUBLIC GATEWAY & TELEMETRY DASHBOARD (Port 8987)           │
│                    URL: http://192.168.2.143:8987/                      │
│                                                                         │
│  - Streaming Proxy Interceptor (ReadableStream.tee()) Zero Latency      │
│  - Developer Identity Tracking & SQLite Database (usage.db)             │
│  - Real-time VRAM, Slot Map, TPS Meter & Live Stream Feed UI            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Forward Clean Stream
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PRIVATE GPU INFERENCE BACKEND (Port 8001)                  │
│                     URL: http://127.0.0.1:8001/                         │
│                                                                         │
│  - Primary Model: Qwen 3.8 27B Q8_0 GGUF (29.03 GB, 128K Context)       │
│  - Draft Model: Qwen 2.5 Coder 0.5B Q8_0 (Speculative Acceleration)     │
│  - Flash Attention & KV-Cache q4_0 on 3x NVIDIA GeForce RTX 3090        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Developer Onboarding & Usage Workflow

### 5.1 One-Click Setup Scripts
Setiap developer baru hanya perlu menjalankan skrip otomatisasi:

* 🐧 **Linux & 🍎 macOS:** `chmod +x setup.sh && ./setup.sh`
* 🪟 **Windows PowerShell:** `powershell -ExecutionPolicy Bypass -File .\setup.ps1`

**Proses Otomasi yang Dijalankan Setup Script:**
1. Meminta input nama/nickname developer untuk tracking kuota & leaderboard.
2. Melakukan tes ping health check ke endpoint `http://192.168.2.143:8987/api/health`.
3. Menulis file konfigurasi standar ke `~/.grok/config.toml` (atau `%USERPROFILE%\.grok\config.toml`):

```toml
[cli]
auto_update = false

[features]
telemetry = false

[session]
auto_compact_threshold_percent = 90
load_envrc = true

[models]
default = "internal-qwen"
stream_tool_calls = true
temperature = 0.7
top_p = 0.85
min_p = 0.05
repeat_penalty = 1.1

[model.internal-qwen]
model = "qwen35"
base_url = "http://192.168.2.143:8987/api/v1"
name = "Internal Qwen 3.8 (27B Q8 - 128K Dedicated)"
description = "Dedicated 128K Context via Port 8987 Gateway"
api_backend = "chat_completions"
context_window = 131072
max_completion_tokens = 65536
temperature = 0.7
top_p = 0.85
min_p = 0.05
repeat_penalty = 1.1
presence_penalty = 0.1
api_key = "dev-lee"
```

### 5.2 Daily Developer Workflow
1. Buka terminal di folder repository yang ingin dikerjakan.
2. Jalankan perintah `grok`.
3. Agent langsung siap memahami codebase, membuat unit test, merefaktor kode, dan mengeksekusi bash command.

---

## 6. Implementation Roadmap & Milestones

| Fase | Target | Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Fase 1** | **Inference & Prototype Validation** | Setup `llama-server` Qwen 27B Q8, 3x GPU split, TUI CLI verification, health endpoint benchmark. | **SELESAI (Done)** |
| **Fase 2** | **Forking & Onboarding Automation** | Pembuatan repository `gspexgrok-agent`, skrip `setup.sh`, template `config.toml`, dan `server-optimize.sh`. | **SELESAI (Done)** |
| **Fase 3** | **Multi-User Scale & Tuning** | Uji beban konkurensi (3-8 developer simultan), optimasi VRAM KV-cache Flash Attention, monitoring latency. | **Sedang Berjalan** |
| **Fase 4** | **Custom Team Rules & Skills** | Integrasi standarisasi coding rules (`.agents/rules/`), Git pre-commit hooks, dan custom CLI extensions. | **Planned** |

---

## 7. Success Metrics (KPI)

1. **Uptime & Reliability:** Endpoint inference `llama-server` mencapai > 99% uptime pada jam kerja kantor.
2. **Speed & Latency:** Rata-rata inferensi tetap berada di kisaran >= 20-25 tokens/second per developer aktif.
3. **Adoption Rate:** 100% tim engineering dapat menggunakan coding agent secara lokal tanpa hambatan login cloud.
4. **Data Leakage:** 0% token atau data source code keluar ke internet publik.
