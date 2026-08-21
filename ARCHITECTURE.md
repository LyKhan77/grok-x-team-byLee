# 🏛️ CooperAgent — System Architecture & Engineering Blueprint (`ARCHITECTURE.md`)

> **Document Version:** 2.0.0 (Enterprise Gold Release — CooperAgent)  
> **Target Repository:** `https://github.com/LyKhan77/grok-x-team-byLee.git`  
> **Classification:** Internal Engineering Single Source of Truth (SSOT)  
> **Last Updated:** 20 Agustus 2026  

---

## 1. Executive Overview & System Topology

**CooperAgent** adalah platform *Enterprise Autonomous Coding Agent* generasi masa depan yang mengintegrasikan ekosistem multi-agent harness (**`CooperxHarness`: Grok Build TUI & Pi Agent CLI**) dengan infrastruktur komputasi lokal GPU berkapasitas tinggi (**`CooperxCompute`: `llama.cpp` + Qwen 3.8 / 2.5 27B Q8_0 + Qwen 0.5B Speculative Accelerator pada 3x RTX 3090**) dan sistem persistensi memori mandiri (**`CooperxMemory`**).

Platform ini dirancang dengan prinsip **100% Kedaulatan Data (*Zero Data Exfiltration*)**: tidak ada sebaris kode pun, prompt, gambar diagram arsitektur, maupun proses penalaran (*Chain-of-Thought*) yang dikirim ke cloud publik pihak ketiga.

```mermaid
graph TD
    subgraph DEV_WORKSTATIONS ["🏢 Developer Workstations (LAN / VPN)"]
        D1["🍎 macOS Workstation<br/>`CooperxHarness` (Grok / Pi)"]
        D2["🐧 Linux Workstation<br/>`CooperxHarness` (Grok / Pi)"]
        D3["🪟 Windows Workstation<br/>`CooperxHarness` (Grok / Pi)"]
    end

    subgraph COOPERX_TELEMETRY ["🛡️ CooperxTelemetry & Gateway Layer (Port 8987)"]
        GW["🌐 Next.js 14 API Gateway<br/>`http://192.168.2.143:8987/api/v1` & `/v1`"]
        AUTH["🔑 Developer Identity Extractor<br/>(`Bearer dev-<nickname>`)"]
        TEE["⚡ Non-Blocking Stream Splitter<br/>(`ReadableStream.tee()`)"]
        DB[("🗄️ SQLite Database<br/>`usage.db` (Leaderboard & Quota)")]
        DASH["📈 Web Telemetry Dashboard<br/>`http://192.168.2.143:8987/`"]
    end

    subgraph COOPERX_COMPUTE ["⚡ CooperxCompute GPU Cluster (Port 8001)"]
        LS["🖥️ llama-server Engine<br/>(`http://127.0.0.1:8001`)"]
        DRAFT["🚀 Speculative Draft Model<br/>Qwen 2.5 Coder 0.5B Q8_0 (GPU 0)"]
        PRIMARY["🧠 Primary Foundation Model<br/>Qwen 3.8 27B Q8_0 (29.03 GB)"]
        
        subgraph VRAM_DISTRIBUTION ["VRAM Allocation (3x RTX 3090 - 72 GB Total)"]
            GPU0["GPU 0 (24GB)<br/>Layers 0-21 + Draft (~13.7 GB)"]
            GPU1["GPU 1 (24GB)<br/>Layers 22-43 (~12.9 GB)"]
            GPU2["GPU 2 (24GB)<br/>Layers 44-64 + Vision (~13.1 GB)"]
        end

        subgraph SLOTS_MAP ["4 Dedicated Developer Slots (live: 524.288 total context)"]
            SLOT0["Slot 0: 128K Context"]
            SLOT1["Slot 1: 128K Context"]
            SLOT2["Slot 2: 128K Context"]
            SLOT3["Slot 3: 128K Context"]
        end
    end

    D1 -->|"HTTP REST / SSE Stream<br/>Authorization: Bearer dev-lee"| GW
    D2 -->|"HTTP REST / SSE Stream<br/>Authorization: Bearer dev-alex"| GW
    D3 -->|"HTTP REST / SSE Stream<br/>Authorization: Bearer dev-vincent"| GW

    GW --> AUTH
    AUTH --> TEE
    TEE -->|"1. Raw Forward (Zero Latency)"| LS
    TEE -->|"2. Token Sniffer"| DB
    DB -.->|"Live Polling & Metrics"| DASH

    LS --> DRAFT
    DRAFT -->|"4-8 Draft Tokens Guess"| PRIMARY
    PRIMARY -->|"Parallel Verification (Lossless)"| LS
    PRIMARY --- GPU0
    PRIMARY --- GPU1
    PRIMARY --- GPU2
    LS --- SLOTS_MAP
```

---

## 2. Modul Cooperx Ecosystem

Setiap fitur dan subsistem dalam platform CooperAgent memiliki kode seri standar:

| Modul | Nama Sistem | Deskripsi Teknis |
| :--- | :--- | :--- |
| **`CooperxCompute`** | Inference & Hardware Engine | **3 slot paralel × 128K** (`--ctx-size 393216`), KV-Cache `q8_0`, DFLASH 2 speculative decoding (`--spec-draft-n-max 5`) pada 3× RTX 3090. VRAM 75,3%. |
| **`CooperxMemory`** | Disiplin Context & Handover | Ambang handover 85%, batasi keluaran tool, rencana bertahan di `docs/plans/`. State sesi pribadi ditangani memory native Grok (lokal per mesin). |
| **`CooperxHarness`** | Multi-Agent Ecosystem | Dukungan native untuk **Grok Build (Rust TUI)** dan **Pi Agent (Inline CLI)** di Linux, macOS, dan Windows. |
| **`CooperxTelemetry`** | Telemetry Gateway & Dashboard | Next.js 14 API Gateway (Port `8987`), Developer Identity Tracker, dan Dark Mode TUI Dashboard. |
| **`CooperxStandard`** | Adaptive Standardization | Wizard 5 pertanyaan interaktif (`/standardization`) untuk menyusun aturan repository secara adaptif. |

---

## 3. Layer 1: Hardware & Compute Infrastructure (`CooperxCompute`)

### 3.1 Spesifikasi Hardware Host
* **GPU Cluster:** 3x NVIDIA GeForce RTX 3090 (24 GB GDDR6X per GPU, Total 72 GB VRAM).
* **CPU Host:** Intel(R) Core(TM) Ultra 7 265 (20 Physical Cores, Single NUMA Node 0).
* **RAM Sistem:** 64 GB DDR5.
* **PCIe Bus Topology:** P2P PCIe Gen4 direct bus communication.

### 3.2 Alokasi 3 Slot Dedicated Context — 3 × 131.072 (`--ctx-size 393216`)
* **Model Utama:** **`Qwen 3.8 / 2.5 27B Q8_0`** (27.32B parameters, file GGUF ~29.03 GB).
* **Speculative Drafter:** **`Qwen3.8-27B-DFlash2-Q4_K_M.gguf`** (1,1 GB, tersebar di CUDA0,1,2 — drafter meminjam `output.weight` milik target sehingga `--spec-draft-device` wajib mencakup ketiganya).
* **Kuantisasi KV-Cache `q8_0`:** 34 KiB/token (16 dari 65 layer memegang KV — arsitektur hybrid SSM). Total 393.216 token = **13.056 MiB**.
* **Total VRAM Terukur:** **55.517 MiB / 73.728 MiB = 75,3%** (~18,1 GB per GPU).
* **Plafon praktis:** menaikkan ke 3 × 168K terukur menjatuhkan p10 throughput dari 11,2 ke 2,2 TPS dan dibatalkan — lihat [`docs/plans/long_task_horizon.md`](docs/plans/long_task_horizon.md).

---

## 4. Layer 2: Persistence Memory Harness (`CooperxMemory`)

Terinspirasi dari arsitektur memori **Claude Code** (`CLAUDE.md` memory ledger) dan **Hermes Agent** (Dual-tier episodic/semantic eviction):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 CooperxMemory HARNESS (HANDOVER & RECOVERY FLOW)            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. RENCANA BERTAHAN DI BERKAS (docs/plans/<slug>.md)                       │
│     Setiap kali agent selesai membuat/mengedit file, agent meng-update:     │
│     - Goal Utama Proyek                                                     │
│     - File-file yang telah dibuat & status test                             │
│     - Checklist plan.md yang sedang berjalan                                │
│                               │                                             │
│                               ▼                                             │
│  2. AMBANG COMPACTION NATIVE GROK (85% = 111.411 token)                     │
│     Jaring pengaman, bukan jadwal. Jalur utama: /flush lalu /new di batas   │
│     tugas. Grok membatalkan compaction setelah 300 detik per percobaan.     │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │ ⚠️ Context 85% (111.411 / 131.072)                              │     │
│     │ Rencana + bukti tersimpan di `docs/plans/<slug>.md`            │     │
│     │                                                                 │     │
│     │ 💡 UNTUK MELANJUTKAN DENGAN CONTEXT BERSIH (0 TOKEN):           │     │
│     │ 1. Ketik `/new` di terminal agent                             │     │
│     │ 2. Ketik `Lanjutkan docs/plans/<slug>.md`                       │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                               │                                             │
│                               ▼                                             │
│  3. INSTANT REHYDRATION (Zero Data Loss & Zero Freeze)                      │
│     Pada sesi baru, agent membaca rencana + memory Grok otomatis            │
│     (~1.500 token) dan langsung melanjutkan tugas detik itu juga!           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Layer 3: Multi-Agent Client Ecosystem (`CooperxHarness`)

### 5.1 Grok Build (Rust Fullscreen TUI)
* Pilihan utama untuk pengalaman visual komprehensif: Split-screen visual diff viewer, file tree viewer, multi-session tab manager (`Ctrl+T`), dan model picker (`Ctrl+M`).

### 5.2 Pi Agent (Lightweight Inline CLI)
* Alternatif ringan berbasis perintah terminal cepat, ideal untuk lingkungan server headless, koneksi SSH cepat, atau developer yang menyukai antarmuka minimalis.

---

## 6. Layer 4: 2-Tier Inference & Telemetry Gateway (`CooperxTelemetry`)

* **Public Port 8987 (`0.0.0.0:8987`):**
  - Web Dashboard UI: `http://192.168.2.143:8987/`
  - OpenAI-Compatible Endpoint: `http://192.168.2.143:8987/v1` & `/api/v1`
  - Health Check: `http://192.168.2.143:8987/api/health` & `/health`
  - Developer Identity: Header `Authorization: Bearer dev-<nickname>`
* **Private Port 8001 (`127.0.0.1:8001`):**
  - Backend inferensi GPU `llama-server` terisolasi dari akses jaringan luar langsung.

---

## 7. Ringkasan File Proyek

| File / Direktori | Deskripsi Arsitektur CooperAgent |
| :--- | :--- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Cetak biru arsitektur resmi CooperAgent & modul Cooperx |
| [`AGENTS.md`](AGENTS.md) | Single Source of Truth pedoman developer & AI agent |
| [`README.md`](README.md) | Panduan onboarding developer multi-OS |
| [`server-optimize.sh`](server-optimize.sh) | **Salinan referensi** runner `CooperxCompute`. Runner produksi sebenarnya: `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh` di bawah systemd `llamacpp.service`. |
| [`setup.sh`](setup.sh) | Onboarding 1-Click Linux & macOS (`CooperxHarness`) |
| [`setup.ps1`](setup.ps1) | Onboarding 1-Click Windows PowerShell (`CooperxHarness`) |
| [`config.default.toml`](config.default.toml) | Konfigurasi klien: context 131.072, ambang compaction 85%, memory aktif |
| [`.agents/rules/05-context-discipline.md`](.agents/rules/05-context-discipline.md) | Ambang context, penghematan token, protokol handover |
| [`dashboard/`](dashboard/) | Web Telemetry Dashboard & API Gateway (`CooperxTelemetry`) |
