# 🚀 CooperAgent — Enterprise Autonomous Coding Platform

**CooperAgent** adalah platform *Enterprise Autonomous Coding Agent On-Premise* yang menggabungkan multi-agent harness (**Grok Build TUI & Pi Agent CLI**) dengan infrastruktur komputasi lokal berkecepatan tinggi (**`CooperxCompute`** pada 3x RTX 3090), dipadukan dengan harness persistensi memori mandiri (**`CooperxMemory`**).

Repository: **`https://github.com/LyKhan77/grok-x-team-byLee.git`**

---

## 🏛️ Ekosistem Modul Cooperx

| Kode Seri Modul | Deskripsi & Cakupan Teknis |
| :--- | :--- |
| **`CooperxCompute`** | Engine inferensi GPU pada 3× RTX 3090: **3 slot paralel × 128K** (total 393.216 token), KV-Cache `q8_0`, DFLASH 2 speculative decoding aktif. VRAM 75,3%. |
| **`CooperxMemory`** | Disiplin context: rencana bertahan di `docs/plans/`, batasi keluaran tool, ambang compaction 85% sebagai jaring pengaman. State sesi pribadi ditangani memory native Grok (lokal per mesin). |
| **`CooperxHarness`** | Dukungan multi-agent fleksibel yang mengintegrasikan **Grok Build (Rust TUI)** dan **Pi Agent (Inline CLI)** di [`setup.sh`](setup.sh) & [`setup.ps1`](setup.ps1). |
| **`CooperxTelemetry`** | API Gateway (Port `8987`) dan SQLite Token Usage Leaderboard & Slot Visualizer Dashboard. |
| **`CooperxStandard`** | Adaptive Project Standardization Wizard (`/standardization` & `scripts/standardize.py`). |

---

## ⚡ Panduan Onboarding Developer (Cross-Platform 1-Click Setup)

Pilih sistem operasi laptop/PC Anda:

### 🐧 Linux & 🍎 macOS (Terminal / Zsh / Bash):
```bash
# 1. Clone repository
git clone https://github.com/LyKhan77/grok-x-team-byLee.git cooperagent
cd cooperagent

# 2. Jalankan setup script
chmod +x setup.sh
./setup.sh
```

---

### 🪟 Windows 10 / 11 (PowerShell):
```powershell
# 1. Clone repository
git clone https://github.com/LyKhan77/grok-x-team-byLee.git cooperagent
cd cooperagent

# 2. Jalankan PowerShell setup script
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

---

### 🎯 Cara Menggunakan Coding Agent:
Buka terminal di folder project coding mana saja, lalu jalankan salah satu agent:
* **Grok Build (Fullscreen Rust TUI):** `grok`
* **Pi Agent (Lightweight Inline CLI):** `pi`

Model akan otomatis menggunakan **[CooperAgent Qwen 3.8 — 128K Dedicated]** yang terhubung ke AI server Gateway lokal kantor (`http://192.168.2.143:8987/api/v1`).

📊 **Pantau Live Telemetry & Penggunaan Token Tim:** Buka browser di [http://192.168.2.143:8987/](http://192.168.2.143:8987/).

---

## 📚 Dokumentasi Lengkap Proyek

| Dokumen | Deskripsi | Lokasi File |
| :--- | :--- | :--- |
| **System Architecture Blueprint** | Cetak biru teknis lengkap arsitektur CooperAgent | [ARCHITECTURE.md](ARCHITECTURE.md) |
| **System & Agent Guide** | Panduan standar engineering, tech stack, dan aturan agent | [AGENTS.md](AGENTS.md) |
| **Product Requirements (PRD)** | Spesifikasi requirement resmi platform CooperAgent | [docs/PRD.md](docs/PRD.md) |
| **Changelog** | Checkpoint riwayat perubahan codebase | [CHANGELOG.md](CHANGELOG.md) |
| **Telemetry Dashboard PRD** | Spesifikasi Next.js LLM Telemetry Dashboard | [dashboard/PRD.md](dashboard/PRD.md) |
| **Benchmark Report** | Laporan hasil stress-test multi-user streaming | [test/results/benchmark_report.md](test/results/benchmark_report.md) |
