# 🚀 Internal Grok Coding Agent Deployment (Team Edition)

Repository & panduan deployment coding agent berbasis **Grok Build Fork** yang dihubungkan ke **In-House Llama.cpp Inference Server (Qwen 3.8 / 2.5 27B Q8)** pada cluster 3x RTX 3090.

Repository: **`https://github.com/LyKhan77/grok-x-team-byLee.git`**

---

## 📋 Fitur Utama untuk Tim

- **100% On-Premise & Private:** Seluruh kode sumber, proses berpikir agent (*Chain-of-Thought*), dan file proyek diproses lokal tanpa telemetri luar.
- **Dedicated 128K Context Window:** Kapasitas 131.072 token per slot developer dengan **Auto-Compact 90%** untuk eksekusi *long-task* berjam-jam tanpa hambatan.
- **Hybrid Anti-Hallucination Sampling:** Dikalibrasi dengan `min-p 0.05`, `repeat-penalty 1.10`, dan `top-p 0.85` untuk penalaran lurus (*thinking straight*) dan sintaks akurat.
- **Cross-Platform Support:** Onboarding 1-Click native untuk Linux, macOS (Apple Silicon & Intel), dan Windows (PowerShell).
- **Adaptive Project Standardization (`/standardization`):** Kuisioner interaktif 5 pertanyaan untuk auto-detect dan generate aturan `.agents/rules/` di setiap proyek.
- **Native Fullscreen TUI:** Pengalaman interaktif cepat dengan visual diff viewer, file browser, split screen, dan terminal execution.
- **Multimodal Vision:** Mampu membaca screenshot UI dan diagram arsitektur.

---

## ⚡ Panduan Onboarding Developer (Cross-Platform 1-Click Setup)

Pilih sistem operasi laptop/PC Anda:

### 🐧 Linux & 🍎 macOS (Terminal / Zsh / Bash):
```bash
# 1. Clone repository
git clone https://github.com/LyKhan77/grok-x-team-byLee.git gspexgrok-agent
cd gspexgrok-agent

# 2. Jalankan setup script
chmod +x setup.sh
./setup.sh
```

---

### 🪟 Windows 10 / 11 (PowerShell):
```powershell
# 1. Clone repository
git clone https://github.com/LyKhan77/grok-x-team-byLee.git gspexgrok-agent
cd gspexgrok-agent

# 2. Jalankan PowerShell setup script
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

---

### 🎯 Langkah Mulai Menggunakan Agent:
Buka terminal di folder project coding mana saja, lalu jalankan:
```bash
grok
```
Model akan otomatis menggunakan **[Internal Qwen 3.8 Dedicated 128K]** yang terhubung ke AI server lokal kantor (`http://192.168.2.143:8001/v1`).

---

## ⌨️ Shortcut Penting di Grok Build

| Shortcut / Command | Fungsi |
| :--- | :--- |
| `Ctrl + M` | Membuka Model Picker (ganti model / cek endpoint aktif) |
| `Ctrl + T` | Buka / switch tab sesi |
| `Ctrl + C` | Membatalkan eksekusi saat ini / keluar |
| `/standardization` | Menjalankan wizard standarisasi aturan proyek interaktif |
| `/compact` | Meringkas riwayat percakapan secara manual untuk menghemat context |
| `/plan` | Masuk ke mode perencanaan arsitektur sebelum eksekusi kode |
| `/clear` | Membersihkan riwayat percakapan sesi |
| `/help` | Menampilkan seluruh slash commands |

---

## 📚 Dokumentasi Lengkap Proyek

| Dokumen | Deskripsi | Lokasi File |
| :--- | :--- | :--- |
| **System & Agent Guide** | Panduan standar engineering, tech stack, dan aturan agent | [AGENTS.md](AGENTS.md) |
| **Product Requirements (PRD)** | Spesifikasi requirement resmi platform GSPExGrok | [docs/PRD.md](docs/PRD.md) |
| **Changelog** | Checkpoint riwayat perubahan codebase | [CHANGELOG.md](CHANGELOG.md) |
| **Telemetry Dashboard PRD** | Spesifikasi Next.js LLM Telemetry Dashboard | [dashboard/PRD.md](dashboard/PRD.md) |
| **Benchmark Report** | Laporan hasil stress-test multi-user streaming | [test/results/benchmark_report.md](test/results/benchmark_report.md) |
