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
* **Host Hardware:** 3x NVIDIA GeForce RTX 3090 (Total 72 GB VRAM)
* **Offloading Strategy:** `--gpu-layers 999 --tensor-split 1,1,1` (Distribusi seimbang ~15 GB VRAM per GPU).
* **Throughput Benchmark:** ~27.5 tokens/second (single stream), TTFT < 550 ms.
* **Concurrency Engine:** Continuous batching (`--parallel 4` hingga `8`), Flash Attention (`--flash-attn`), Jinja chat templating.
* **Active Endpoints:**
  * Base URL LAN: `http://192.168.2.143:8001/v1`
  * Base URL Localhost: `http://127.0.0.1:8001/v1`
  * VPN Tunnel URL: `http://10.8.0.62:8001/v1`

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
1. **Endpoint Routing Otomatis:** Menghapus ketergantungan wajib pada `grok login` dan secara default mengarahkan request ke `http://192.168.2.143:8001/v1`.
2. **Telemetry & Auto-Update Disabling:** Mematikan semua panggilan telemetri analitik cloud pihak ketiga (`telemetry = false`, `auto_update = false`).
3. **Reasoning Stream Parsing:** Menjamin blok proses berpikir Qwen (`reasoning_content`) dirender dalam box *collapsible* di TUI tanpa mengganggu parsing tool-call.
4. **Pre-Configured System Instructions:** Menginjeksi aturan coding standar tim (*coding standard, commit rules, test requirements*).

---

## 4. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Developer Workstations (Team)                      │
│                                                                         │
│  ┌────────────────────────┐                 ┌────────────────────────┐  │
│  │   Developer 1 (macOS)  │                 │   Developer 2 (Linux)  │  │
│  │   `grok` TUI Terminal  │                 │   `grok` TUI Terminal  │  │
│  └───────────┬────────────┘                 └───────────┬────────────┘  │
└──────────────┼──────────────────────────────────────────┼───────────────┘
               │                                          │
               │ HTTP REST / SSE (/v1/chat/completions)   │
               ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│           Enterprise AI Inference Server (3x NVIDIA RTX 3090)           │
│                       IP: 192.168.2.143:8001                            │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    llama-server (Multi-Slot)                      │  │
│  │  - Model: Qwen 3.8 / 2.5 27B Q8_0 GGUF                            │  │
│  │  - Context: 131K / 256K (Flash Attention Enabled)                 │  │
│  │  - Slot Manager: 4 Parallel Concurrency Streams                   │  │
│  │  - Multimodal Vision Projector: mmproj-BF16.gguf                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│         │                             │                             │   │
│         ▼                             ▼                             ▼   │
│  ┌──────────────┐              ┌──────────────┐              ┌────────┐ │
│  │ GPU 0 (24GB) │              │ GPU 1 (24GB) │              │ GPU 2  │ │
│  │ Layers 0-21  │              │ Layers 22-43 │              │ Layers │ │
│  └──────────────┘              └──────────────┘              └────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Developer Onboarding & Usage Workflow

### 5.1 One-Click Setup Script (`setup.sh`)
Setiap developer baru hanya perlu menjalankan skrip otomatisasi:

```bash
git clone https://github.com/<your-org>/gspexgrok-agent.git
cd gspexgrok-agent
chmod +x setup.sh
./setup.sh
```

**Proses Otomasi yang Dijalankan `setup.sh`:**
1. Mendeteksi sistem operasi dan mengunduh binary `grok`.
2. Melakukan tes ping health check ke endpoint `http://192.168.2.143:8001/health`.
3. Menulis file konfigurasi standar ke `~/.grok/config.toml`:

```toml
[cli]
auto_update = false

[features]
telemetry = false

[models]
default = "qwen38-local"
stream_tool_calls = true
temperature = 0.7
top_p = 0.95
max_completion_tokens = 8192

[model.qwen38-local]
model = "qwen35"
base_url = "http://192.168.2.143:8001/v1"
name = "Internal Qwen 3.8 (27B Q8)"
description = "In-House Dedicated Coding Agent on 3x RTX 3090"
api_backend = "chat_completions"
context_window = 131072
temperature = 0.7
api_key = "sk-internal-team"
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
