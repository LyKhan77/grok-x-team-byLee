# GSPExGrok Agent — Context & Handover Summary

> Dokumen ini dirancang sebagai ringkasan konteks langsung untuk **Antigravity (`agy`)** atau sesi agen berikutnya di direktori `/home/gspe-ai1/project/gspexgrok-agent/`.

---

## 📌 Status Terkini Sistem & Inference Server

* **Inference Server:** `llama-server` sedang aktif berjalan di port `8001` (PID: `2612291`).
* **Model yang Dimuat:** 
  * Path Model: `/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf`
  * Vision Projector: `/home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf`
  * Model Alias: `qwen35`
  * Spesifikasi: **Qwen 3.8 / 2.5 27B** (27.32B parameters), kuantisasi `Q8_0` (~29.03 GB)
  * HuggingFace Reference: [https://huggingface.co/Qwen/Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B)
* **Distribusi GPU (3x RTX 3090 - Total 72GB VRAM):**
  * GPU 0: ~15.5 GB VRAM terpakai
  * GPU 1: ~15.4 GB VRAM terpakai
  * GPU 2: ~14.9 GB VRAM terpakai
* **Endpoint Aktif:**
  * Local: `http://127.0.0.1:8001/v1`
  * LAN Kantor (Wi-Fi): `http://192.168.2.143:8001/v1`
  * VPN Tunnel: `http://10.8.0.62:8001/v1`
  * Health check: `http://127.0.0.1:8001/health` (`{"status":"ok"}`)
* **Hasil Benchmark:**
  * Kecepatan: **~27.5 tokens/detik**
  * Time to First Token (TTFT): **~554 ms**
  * Dukungan native CoT: Mengeluarkan `reasoning_content` sebelum teks final

---

## 📂 Strategi & Upstream Base

* **Pilihan Harness:** Fork dari [xai-org/grok-build](https://github.com/xai-org/grok-build) (Apache 2.0).
* **Alasan:** Ditulis dalam Rust, performa TUI instan, konsumsi RAM kecil, mendukung tool-calling langsung ke OpenAI-compatible endpoints tanpa middleware proxy tambahan.
* **Penyesuaian yang Sudah Dirancang:**
  1. Default endpoint otomatis mengarah ke `http://192.168.2.143:8001/v1` (atau `127.0.0.1:8001/v1`).
  2. Nonaktifkan telemetri cloud (`telemetry = false`, `auto_update = false`).
  3. Konfigurasi `context_window = 131072` dan `temperature = 0.7`.

---

## 🛠️ File & Aset yang Tersedia di Folder Ini

1. [`PRD.md`](PRD.md): Product Requirement Document lengkap untuk skala tim internal.
2. [`setup.sh`](setup.sh): 1-Click Onboarding script untuk developer laptop.
3. [`config.default.toml`](config.default.toml): Template konfigurasi `~/.grok/config.toml`.
4. [`server-optimize.sh`](server-optimize.sh): Runner script server berkapasitas tinggi (4 concurrent slots + Flash Attention).
5. [`README.md`](README.md): Dokumentasi panduan tim developer.

---

## 🎯 Langkah Kerja Lanjutan (Next Steps for `agy`)

1. **Inisialisasi Git / Hubungkan ke Remote Repository:**
   Inisialisasi git repository di folder ini (`git init`) dan hubungkan ke GitHub remote repository tim yang dibuat oleh user.
2. **Kustomisasi Rust Source (Jika Diperlukan):**
   Jika ingin melakukan kompilasi kustom dari `grok-build`, source code dapat diletakkan di sub-folder `crates/` dan di-build menggunakan `cargo build -p xai-grok-pager-bin --release`.
3. **Uji Beban Multi-User (Stress Testing):**
   Uji simulasi 2-4 request agent simultan ke `llama-server` untuk memastikan tidak ada VRAM OOM saat context memanjang.
