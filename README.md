# 🚀 Internal Grok Coding Agent Deployment (Team Edition)

Repository & panduan deployment coding agent berbasis **Grok Build Fork** yang dihubungkan ke **In-House Llama.cpp Inference Server (Qwen 3.8 / 2.5 27B Q8)** pada cluster 3x RTX 3090.

Repository: **`https://github.com/LyKhan77/grok-x-team-byLee.git`**

---

## 📋 Fitur Utama untuk Tim

- **100% On-Premise & Private:** Seluruh kode sumber, proses berpikir agent (*Chain-of-Thought*), dan file proyek diproses lokal tanpa telemetri luar.
- **High-Concurrency Multi-User:** Teruji melayani 4 developer aktif paralel dengan throughput hingga 42.05 tokens/detik.
- **Adaptive Project Standardization (`/standardization`):** Kuisioner interaktif 5 pertanyaan untuk auto-detect dan generate aturan `.agents/rules/` di setiap proyek.
- **Native Fullscreen TUI:** Pengalaman interaktif cepat dengan visual diff viewer, file browser, split screen, dan terminal execution.
- **Multimodal Vision:** Mampu membaca screenshot UI dan diagram arsitektur.

---

## ⚡ Panduan Onboarding Developer (1-Click Setup)

Bagi setiap developer di tim internal yang ingin menggunakan Grok Coding Agent di laptop masing-masing:

### 1. Clone Repository ini
```bash
git clone https://github.com/LyKhan77/grok-x-team-byLee.git
cd grok-x-team-byLee
```

### 2. Jalankan Setup Script
```bash
chmod +x setup.sh
./setup.sh
```

Script akan otomatis:
1. Memeriksa/menginstall binary `grok`.
2. Menghubungkan ke AI Server lokal (`http://192.168.2.143:8001/v1`).
3. Mengonfigurasi `~/.grok/config.toml` dengan model internal `qwen35` sebagai default.
4. Mendaftarkan helper command `grok-standardize`.

### 3. Mulai Menggunakan Agent
Buka terminal di folder project mana saja, lalu jalankan:
```bash
grok
```
*(Atau ketik `/standardization` di dalam chat agent untuk mengonfigurasi aturan coding proyek).*

---

## ⌨️ Shortcut Penting di Grok Build

| Shortcut | Fungsi |
| :--- | :--- |
| `Ctrl + M` | Membuka Model Picker (ganti model / cek endpoint aktif) |
| `Ctrl + T` | Buka / switch tab sesi |
| `Ctrl + C` | Membatalkan eksekusi saat ini / keluar |
| `/standardization` | Menjalankan wizard standarisasi aturan proyek interaktif |
| `/help` | Menampilkan seluruh slash commands |
| `/plan` | Masuk ke mode perencanaan sebelum eksekusi kode |
| `/clear` | Membersihkan riwayat percakapan |

---

## 📚 Navigasi Dokumentasi & Test

- 📘 **[AGENTS.md](AGENTS.md)**: Panduan sistem, arsitektur, dan protokol wajib update changelog.
- 📜 **[CHANGELOG.md](CHANGELOG.md)**: Checkpoint riwayat perubahan versi codebase.
- 📄 **[docs/PRD.md](docs/PRD.md)**: Product Requirement Document resmi tim.
- 📊 **[test/results/benchmark_report.md](test/results/benchmark_report.md)**: Laporan benchmark beban multi-user terverifikasi.
- 🧪 **[test/run_stress_test.sh](test/run_stress_test.sh)**: Script runner pengujian beban 1, 2, 4 stream.
- 🖥️ **[server-optimize.sh](server-optimize.sh)**: Script runner server AI berkapasitas tinggi (3x GPU 3090).
