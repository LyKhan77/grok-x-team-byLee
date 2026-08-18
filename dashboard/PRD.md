# Product Requirement Document (PRD)
## GSPExGrok Internal LLM & Telemetry Dashboard

**Project Name:** GSPExGrok Dashboard (`dashboard`)  
**Version:** 1.0.0  
**Status:** Approved / Ready for Implementation  
**Author:** AI Platform & Engineering Team  
**Design System Base:** [dashboard/DESIGN.md](DESIGN.md) (1996 Catalog-Era Enterprise Web Design)  
**Target Platform:** Next.js (App Router, Node.js, 100% On-Premise)  

---

## 1. Executive Summary & Objective

### 1.1 Problem Statement
Inference Server internal (`llama-server` dengan model Qwen 3.8/2.5 27B pada 3x RTX 3090) melayani kebutuhan coding agent untuk multi-developer secara bersamaan. Saat ini, tim tidak memiliki antarmuka visual terpusat untuk memantau:
1. Utilisasi VRAM 3x GPU secara real-time saat multi-stream aktif.
2. Konsumsi token developer (prompt tokens, generation tokens, dan reasoning CoT tokens).
3. Status slot konkurensi (apakah server sedang melayani 1, 2, 4, atau 5 request paralel).
4. Riwayat latensi *Time-to-First-Token* (TTFT) dan throughput (tokens/detik).
5. Batas kuota/limit token harian tiap developer untuk mencegah monopoli compute resource.

### 1.2 Solution & Objective
Membangun web dashboard internal berkecepatan tinggi menggunakan **Next.js** yang menggabungkan:
- Telemetri *real-time* inferensi GPU & Llama.cpp backend.
- Pencatatan konsumsi token dan limit developer berbasis **SQLite / Local Storage**.
- Identifikasi developer otomatis berbasis header client / API Key.
- Estetika visual ikonik **1996 Catalog-Era Enterprise System** yang diadaptasi secara ketat dari [`dashboard/DESIGN.md`](DESIGN.md).

---

## 2. Tech Stack & Architecture

- **Frontend Framework:** Next.js 14+ (App Router, React Server Components & Client Hooks).
- **Styling Architecture:** Pure Vanilla CSS / CSS Modules (Strict Design Token Implementation dari `dashboard/DESIGN.md` tanpa TailwindCSS untuk menjamin autentisitas retro pixel-perfect).
- **Typography & Font Stack:**
  - `Display / Eyebrow Titles:` **Arial Black** (Weight 900, Uppercase)
  - `UI Labels / Buttons / Table Headers:` **Helvetica Bold** (Weight 700, Uppercase)
  - `Body Copy / Data Descriptions / Metrics:` **Times New Roman** (14px Serif)
- **Data Persistence:** SQLite (`better-sqlite3` atau Prisma SQLite) untuk penyimpanan histori sesi, token usage per developer, dan log error.
- **Backend Data Collector:**
  - Polling interval otomatis (2 detik) ke `llama-server` (`/slots`, `/props`, `/health`).
  - Native `nvidia-smi` background sampler untuk VRAM GPU 0, GPU 1, GPU 2.
- **Network Security:** 100% On-Premise Local LAN Access (`http://192.168.2.143:3000` & `http://localhost:3000`), zero external cloud telemetry.

---

## 3. Design System & Visual Specification (`DESIGN.md` Compliance)

Dashboard ini mengimplementasikan bahasa visual **1996 Catalog-Era Enterprise Web Design** secara presisi:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ █ 8px Black Outer Page Frame ({colors.frame-ink})                      █ │
│ █ ┌───────────────────────────────────────────────────────────────────┐ █ │
│ █ │ TOP BANNER: "GSPE INTERNAL LLM TELEMETRY & COMPUTE CONTROLLER"   │ █ │
│ █ │ HOST: 192.168.2.143:8001  [BUY a DELL / LIVE METRICS STICKER]     │ █ │
│ █ └───────────────────────────────────────────────────────────────────┘ █ │
│ █ ┌───────────────────┐ ┌───────────────────────────────────────────┐ █ │
│ █ │ LEFT RAIL (28%):  │ │ RIGHT MAIN CONTENT (72%):                 │ █ │
│ █ │ - Red CTA Alert   │ │ 1. Periwinkle Card: 3x RTX 3090 GPU VRAM  │ █ │
│ █ │   Panel (Status)  │ │ 2. Steel Card: Model Engine & Slot Status │ █ │
│ █ │ - Nav Icon Grid   │ │ 3. Salmon Card: Token Usage & Dev Limits  │ █ │
│ █ │ - Active Sessions │ │ 4. Lime Card: Real-time TTFT & Throughput │ █ │
│ █ │   Summary         │ │ 5. Peach Card: Live Request Stream Feed   │ █ │
│ █ └───────────────────┘ └───────────────────────────────────────────┘ █ │
│ █ ┌───────────────────────────────────────────────────────────────────┐ █ │
│ █ │ FOOTER BAND: [FIND] [HOME] [STORE] [SUPPORT] | © 1996 GSPE Team  │ █ │
│ █ └───────────────────────────────────────────────────────────────────┘ █ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Color Token Matrix
| Token Name | Hex Code | Role in Dashboard |
| :--- | :--- | :--- |
| `{colors.primary}` | `#e91d2a` (Dell Red) | Status Peringatan Darurat, Indikator Host Offline, dan Red CTA Header Panel |
| `{colors.yellow-sticker}` | `#fcc20f` (Sticker Yellow) | Badge Status "ONLINE", "ACTIVE SLOTS", dan sticker "LIVE TELEMETRY" |
| `{colors.frame-ink}` | `#000000` (Pure Black) | Border 8px seluruh viewport, banner atas, dan 1px divider garis tabel |
| `{colors.canvas}` | `#ffffff` (True White) | Background utama di dalam frame dan title bar ribbon-card |
| `{colors.link}` | `#0000ee` (Netscape Blue) | Tautan navigasi dan link detail session dengan underline klasik |

### 3.2 Ribbon-Card Tint Allocation
- **`{colors.tint-periwinkle}` (#8c9ae0):** Modul Telemetri Host GPU 3x RTX 3090 (VRAM & Suhu).
- **`{colors.tint-steel}` (#a5b8c0):** Modul Spesifikasi Model (Qwen 3.8 27B Q8, Context 131K, Flash-Attn).
- **`{colors.tint-salmon}` (#d77a7a):** Modul Token Tracker & Developer Quota Limits.
- **`{colors.tint-lime}` (#c0d4a7):** Modul Latensi TTFT & Throughput Tokens/Detik.
- **`{colors.tint-peach}` (#e6915d):** Modul Live Request Stream Feed & Developer Sessions.
- **`{colors.tint-sage}` (#b3bd95):** Modul Arsip Hasil Benchmark Multi-User.

### 3.3 Geometry & Depth Rules
- **No Rounded Corners (`border-radius: 0px`):** Semua tombol, card, table container, dan input form memiliki sudut tajam 90 derajat.
- **Hard-edge Bevel Shadow:** Badge sticker dan monitor frame menggunakan hard shadow 1px highlight + 1px black outline.
- **No Soft Gradients or Opacity:** Semua warna menggunakan *flat web-safe color-block fills*.

---

## 4. Core Functional Modules

### 4.1 Module 1: Real-time Multi-GPU VRAM Monitor (3x RTX 3090)
- **Komponen Visual:** Ribbon Card `{colors.tint-periwinkle}` dengan 3 sub-panel horizontal (GPU 0, GPU 1, GPU 2).
- **Data yang Ditampilkan:**
  - VRAM Terpakai vs Total Kapasitas (Contoh: `15,523 MB / 24,576 MB` - `63.2%`).
  - Baris Progress Bar Solid Hitam/Putih klasik.
  - Sisa Alokasi Buffer KV-Cache bebas per GPU (Contoh: `~9,053 MB Free`).
  - Utilisasi Core Compute GPU & Suhu (°C).

### 4.2 Module 2: Slot Concurrency & Inference Engine Telemetry
- **Komponen Visual:** Ribbon Card `{colors.tint-steel}` dengan Eyebrow Block *"INFERENCE ENGINE CONTROLLER"*.
- **Data yang Ditampilkan:**
  - Status 5 Parallel Slots: Slot 1 s/d Slot 5 (State: `IDLE`, `PROCESSING`, `STREAMING`).
  - Model Aktif: `Qwen 3.8 / 2.5 27B Q8_0 GGUF`.
  - Context Window: `131,072 Tokens (128K)`.
  - Fitur Aktif: `Flash Attention (-fa: on)`, `KV-Cache q8_0`, `Continuous Batching`.
  - Batas Output Token: `65,536 Tokens (64K Max)`.

### 4.3 Module 3: Token Usage & Developer Rate Limit Tracker
- **Komponen Visual:** Ribbon Card `{colors.tint-salmon}` dengan tabel data developer.
- **Data yang Ditampilkan:**
  - Daftar Developer Internal (Identifikasi via API Key / IP Address).
  - Total Token Terpakai Hari Ini (Prompt Tokens + Generation Tokens + CoT Reasoning Tokens).
  - Indikator Kuota Harian (Progress bar kuota token per developer).
  - Tombol Reset Kuota atau Penyesuaian Limit.

### 4.4 Module 4: Real-time Latency & Throughput Meter
- **Komponen Visual:** Ribbon Card `{colors.tint-lime}`.
- **Data yang Ditampilkan:**
  - Kecepatan Generasi Rata-rata: **Tokens/Second (TPS)** per stream dan aggregate.
  - Latensi Respon Pertama: **Time-to-First-Token (TTFT)** dalam milidetik (`ms`).
  - Histogram sederhana atau grafik batang waktu respon request 1 jam terakhir.

### 4.5 Module 5: Live Stream Feed & Request Inspector
- **Komponen Visual:** Ribbon Card `{colors.tint-peach}`.
- **Data yang Ditampilkan:**
  - Log aktivitas request yang sedang berlangsung.
  - Tipe request: Coding Generation, Refactoring, Reasoning CoT, atau Multimodal Vision.
  - Durasi eksekusi dan total token yang telah dipancarkan secara real-time.

### 4.6 Module 6: Benchmark & Stress-Test Archive Viewer
- **Komponen Visual:** Ribbon Card `{colors.tint-sage}`.
- **Data yang Ditampilkan:**
  - Membaca dan menampilkan hasil uji beban dari `test/results/benchmark_report.md` dan `test/results/gpu_vram_log.csv`.
  - Tombol 1-Click untuk memicu eksekusi `./test/run_stress_test.sh` langsung dari antarmuka web.

---

## 5. API Routes & Data Contracts (Next.js App Router)

### 5.1 `GET /api/telemetry/live`
Mengambil data live agregasi dari `llama-server` dan `nvidia-smi`:
```json
{
  "status": "online",
  "uptime_seconds": 3600,
  "gpus": [
    { "index": 0, "name": "NVIDIA GeForce RTX 3090", "used_mb": 15523, "total_mb": 24576, "temp_c": 54, "util_pct": 42 },
    { "index": 1, "name": "NVIDIA GeForce RTX 3090", "used_mb": 15391, "total_mb": 24576, "temp_c": 52, "util_pct": 38 },
    { "index": 2, "name": "NVIDIA GeForce RTX 3090", "used_mb": 14885, "total_mb": 24576, "temp_c": 49, "util_pct": 35 }
  ],
  "slots": {
    "total": 5,
    "active": 2,
    "idle": 3,
    "details": [
      { "id": 0, "state": "processing", "tokens_generated": 1420, "tps": 24.2, "client": "Dev-1 (192.168.2.55)" },
      { "id": 1, "state": "idle", "tokens_generated": 0, "tps": 0, "client": null }
    ]
  },
  "metrics": {
    "current_tps": 42.05,
    "avg_ttft_ms": 480.2,
    "total_tokens_today": 1284500
  }
}
```

### 5.2 `GET /api/developers/usage` & `POST /api/developers/limit`
Mengambil riwayat konsumsi token dan mengonfigurasi batas token harian developer (disimpan di SQLite).

### 5.3 `GET /api/benchmarks/latest`
Membaca file laporan `test/results/benchmark_report.md` dan mengembalikan parsed summary untuk tampilan visual di web.

---

## 6. Directory Structure (`dashboard/`)

```
dashboard/
├── PRD.md                               # 📘 Spesifikasi Produk Dashboard (File ini)
├── DESIGN.md                            # 🎨 Design System Resmi 1996 Catalog-Era
├── package.json                         # Dependencies (Next.js, React, Better-SQLite3)
├── next.config.js                       # Konfigurasi Next.js
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout dengan 8px page-frame black border
│   │   ├── page.tsx                     # Main Dashboard View (Left Rail + Right Content)
│   │   ├── globals.css                  # Design token variables (colors, fonts, borders)
│   │   └── api/
│   │       ├── telemetry/live/route.ts  # Endpoint data live polling
│   │       ├── developers/route.ts      # Endpoint CRUD developer token usage
│   │       └── benchmarks/route.ts      # Endpoint parser benchmark_report.md
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── PageFrame.tsx            # Literal black border container
│   │   │   ├── TopBanner.tsx            # Header hitam + Red Phone callout + Sticker
│   │   │   └── FooterBand.tsx           # 1996 Icon nav row + copyright small print
│   │   │
│   │   ├── ribbon-cards/
│   │   │   ├── GpuClusterCard.tsx       # Periwinkle VRAM card
│   │   │   ├── EngineSlotsCard.tsx      # Steel inference slots card
│   │   │   ├── TokenLimitCard.tsx       # Salmon developer token tracking card
│   │   │   ├── ThroughputCard.tsx       # Lime latency & TPS card
│   │   │   └── RequestFeedCard.tsx      # Peach live stream feed card
│   │   │
│   │   └── ui/
│   │       ├── StickerBadge.tsx         # Yellow "NEW!", "LIVE", "BUY a DELL" stickers
│   │       ├── BevelProgressBar.tsx     # Classic solid progress bar
│   │       ├── ClassicTable.tsx         # Hairline bordered data table
│   │       └── RedAlertPanel.tsx        # Dell Red status announcement card
│   │
│   └── lib/
│       ├── db.ts                        # SQLite database connection & schema
│       ├── llama-poller.ts              # Polling helper ke llama-server port 8001
│       └── gpu-sampler.ts               # nvidia-smi execution parser
│
└── data/
    └── telemetry.db                     # SQLite database file (untracked in git)
```

---

## 7. Implementation Roadmap & Milestones

| Milestone | Target Deliverable | Estimasi |
| :--- | :--- | :--- |
| **Fase 1: Scaffolding & Design System Setup** | Inisialisasi Next.js app di `dashboard/`, implementasi CSS tokens dari `DESIGN.md`, layout frame 8px, top banner, dan font stack (Arial Black, Helvetica, Times Roman). | Sesi 1 |
| **Fase 2: Backend Telemetry Collector** | Pembuatan API routes `/api/telemetry/live`, koneksi parser `nvidia-smi`, dan polling client `llama-server`. | Sesi 2 |
| **Fase 3: Core Ribbon Card Components** | Implementasi kartu Periwinkle (GPU), Steel (Engine), Lime (Throughput), dan Peach (Live Feed). | Sesi 3 |
| **Fase 4: Developer Token & Limit Tracking** | Inisialisasi SQLite database, pencatatan token developer, tabel kuota harian (Salmon Card), dan rate limit enforcement. | Sesi 4 |
| **Fase 5: Verification & Local Testing** | Menjalankan `npm run dev` pada port `3000`, pengujian live stream concurrency, dan validasi visual pixel-perfect. | Sesi 5 |

---

## 8. Success Metrics (KPI)

1. **Pixel-Perfect Authenticity:** 100% kepatuhan terhadap token warna, tipografi, dan komponen di `dashboard/DESIGN.md` tanpa elemen desain modern yang anachronistic (no soft radius, no purple-on-dark, no gradients).
2. **Dashboard Latency:** Waktu render awal < 300 ms dan interval polling real-time 2 detik tanpa beban overhead ke GPU.
3. **Data Accuracy:** Metrik VRAM 3x GPU dan token count terverifikasi 100% akurat terhadap output `nvidia-smi` dan `llama-server`.
