# GSPExGrok Agent — Context & Handover Summary

> Dokumen ini dirancang sebagai ringkasan konteks langsung untuk **Antigravity (`agy`)** atau sesi agen berikutnya di repositori `/home/gspe-ai1/project/gspexgrok-agent/`.

---

## 📌 Status Terkini Sistem & Inference Server

* **Arsitektur 2-Tier Enterprise:**
  * **Public Gateway & Dashboard (Port 8987):** Next.js 14 Streaming Proxy Interceptor + SQLite Token Usage Tracker + Web Dashboard TUI.
  * **Private Inference Backend (Port 8001):** `llama-server` dengan akselerasi Speculative Decoding pada cluster 3x NVIDIA GeForce RTX 3090.
* **Model yang Dimuat:** 
  * Primary Model: `/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf` (27.32B parameters, `Q8_0` ~29.03 GB)
  * Speculative Draft Model: `/home/gspe-ai1/models/qwen38-27b/Qwen2.5-Coder-0.5B-Q8_0.gguf` (~400 MB pada GPU 0)
  * Vision Projector: `/home/gspe-ai1/models/qwen38-27b/mmproj-BF16.gguf`
  * Model Alias: `qwen35`
* **Distribusi VRAM (3x RTX 3090 - Total 72GB VRAM):**
  * GPU 0: ~13.7 GB VRAM (Model + Draft Model + Flash Attention)
  * GPU 1: ~12.9 GB VRAM
  * GPU 2: ~13.1 GB VRAM
  * Sisa Buffer Bebas: ~10.5 GB per GPU (Sangat Dingin & Aman)
* **Endpoint Publik Tim (Port 8987):**
  * Web Dashboard: `http://192.168.2.143:8987/`
  * API Gateway Agent: `http://192.168.2.143:8987/api/v1`
  * Gateway Health Check: `http://192.168.2.143:8987/api/health`
* **Developer Identity Tracking:**
  * Authorization Header: `Authorization: Bearer dev-<nickname>`
  * LIVE_FEED & SQLite Token Usage Tracker mencatat aktivitas per nama developer (misal: `lee (192.168.2.45)`).
* **Hasil Performa & Benchmark:**
  * Throughput Single-Stream: **~27.0 TPS** (Lossless 100% identik dengan Q8_0)
  * Throughput Multi-Stream: **42–48+ TPS**
  * Latensi Respon Pertama (TTFT): **~372 ms**
  * Context Window: Dedicated 128K per slot (`131.072 tokens`), Auto-Compact pada threshold 90%.

---

## 📂 Komponen Utama Codebase

1. [`README.md`](README.md): Panduan onboarding 1-Click untuk Linux, macOS, dan Windows (PowerShell).
2. [`setup.sh`](setup.sh): Skrip onboarding Linux & macOS (Darwin/Zsh) dengan prompt nama developer.
3. [`setup.ps1`](setup.ps1): Skrip native Windows PowerShell dengan variable interpolation yang telah diperbaiki.
4. [`config.default.toml`](config.default.toml): Template konfigurasi default mengarah ke port 8987 (`api_key = "dev-user"`).
5. [`server-optimize.sh`](server-optimize.sh): Runner server inferensi GPU berkapasitas tinggi (Speculative Decoding + KV-Cache `q4_0` + 20-Core CPU Polling).
6. [`dashboard/`](dashboard/): Next.js 14 Telemetry & API Gateway (Port 8987).
7. [`AGENTS.md`](AGENTS.md): Single Source of Truth standar coding dan panduan agent.
8. [`CHANGELOG.md`](CHANGELOG.md): Riwayat checkpoint rilis resmi.
