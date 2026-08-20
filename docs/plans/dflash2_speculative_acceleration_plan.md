# ⚡ Implementation Plan: DFLASH 2 Speculative Acceleration for Qwen3.8-27B

> **Module Series:** `CooperxCompute`  
> **Target Hardware:** 3x NVIDIA GeForce RTX 3090 (72 GB VRAM) + Intel Core Ultra 7 265  
> **Ecosystem:** CooperAgent  
> **Source Reference:** [Inco AI DFLASH 2 Research (August 2026)](https://inco.ai/blog/dflash2/)  

---

## 1. Executive Summary & Goals

Platform **CooperAgent** saat ini berjalan pada model foundation **Qwen3.8-27B Q8_0** dengan kecepatan *autoregressive decoding* tunggal sekitar **~27 TPS**. 

Melalui integrasi teknologi **DFLASH 2** dari Inco AI:
1. **Parallel Speculative Drafting:** Memprediksi 5–8 token sekaligus dalam 1 forward pass paralel (*Diffusion-Style Drafting*).
2. **Peningkatan Throughput:** Menaikkan kecepatan generasi kode menjadi **~70 – 90+ TPS per user** (peningkatan **2.7× – 3.3× lipat**).
3. **Zero Lossless Verification:** Output diverifikasi secara deterministik oleh target model Qwen 3.8 27B sehingga **100% identik secara logika**.
4. **Preservasi 4 Slots x 256K Context:** Tetap mempertahankan **1.048.576 Total Context Window** di cluster 3x RTX 3090 tanpa risiko OOM.

---

## 2. Technical Architecture & Component Mapping

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    COOPERXCOMPUTE + DFLASH 2 ARCHITECTURE                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [Target Model (Foundation)] : Qwen3.8-27B-Q8_0.gguf (~29.03 GB)             │
│  [Draft Model (Accelerator)] : incoai/Qwen3.8-27B-DFlash2-Q4_K_M.gguf (~1.8GB)│
│  [Path Selector Engine]      : 256-dim Bilinear Attention (+2.0M params)      │
│  [Context Allocation]        : 4 Slots x 256K Context Window (q4_0 KV-Cache)  │
│  [VRAM Offload Strategy]     : --tensor-split 1,1,1 di 3x RTX 3090            │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Implementation Checklist

### 📦 Phase 1: Model Acquisition & Draft Weights Preparation
- [ ] **Task 1.1:** Unduh bobot resmi drafter `incoai/Qwen3.8-27B-DFlash2-GGUF:Q4_K_M` ke folder model `/home/gspe-ai1/models/qwen38-27b/`.
- [ ] **Task 1.2:** Verifikasi SHA-256 dan kompatibilitas tokenizer terhadap `Qwen3.8-27B-Q8_0.gguf`.

### 🖥️ Phase 2: Inference Engine & Runner Configuration
- [ ] **Task 2.1:** Perbarui script [`server-optimize.sh`](server-optimize.sh) dengan parameter DFLASH 2:
  ```bash
  CUDA_VISIBLE_DEVICES=0,1,2 /home/gspe-ai1/llama.cpp/build/bin/llama-server \
    --model /home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-Q8_0.gguf \
    --model-draft /home/gspe-ai1/models/qwen38-27b/incoai/Qwen3.8-27B-DFlash2-Q4_K_M.gguf \
    --spec-type draft-dflash \
    --spec-draft-n-max 7 \
    --spec-draft-n-min 2 \
    --parallel 4 \
    --ctx-size 1048576 \
    --cache-type-k q4_0 \
    --cache-type-v q4_0 \
    --flash-attn on \
    --ubatch-size 2048 \
    --port 8001
  ```
- [ ] **Task 2.2:** Sinkronkan file runner `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh`.

### 🧪 Phase 3: Benchmark & Throughput Verification
- [ ] **Task 3.1:** Jalankan stress test 1 stream, 2 stream, dan 4 stream menggunakan `test/benchmark_concurrency.py`.
- [ ] **Task 3.2:** Ukur *Acceptance Rate* (ekspektasi > 75%) dan *Real Output TPS* (target: 70–90 TPS).
- [ ] **Task 3.3:** Simpan laporan hasil benchmark ke `test/results/benchmark_dflash2_results.json`.

### 📊 Phase 4: Telemetry & Dashboard Integration
- [ ] **Task 4.1:** Verifikasi streaming token metrics di **CooperxTelemetry** (Port `8987`).
- [ ] **Task 4.2:** Pastikan slot visualizer menampilkan status 4-slot dengan indikator TPS DFLASH 2.

### 📚 Phase 5: Documentation & Git Checkpoint
- [ ] **Task 5.1:** Perbarui [`ARCHITECTURE.md`](ARCHITECTURE.md) dan [`AGENTS.md`](AGENTS.md) dengan modul DFLASH 2.
- [ ] **Task 5.2:** Catat perubahan pada [`CHANGELOG.md`](CHANGELOG.md) di bawah versi `[1.3.0]`.
- [ ] **Task 5.3:** Commit dan push ke repository remote GitHub `origin/main`.

---

## 4. Acceptance Criteria

| Kriteria Pengujian | Target Baseline Saat Ini | Target dengan DFLASH 2 |
| :--- | :--- | :--- |
| **Single User TPS** | ~26 – 27 TPS | **≥ 70.0 TPS** |
| **Multi-User (4 Streams) Throughput** | ~50 – 58 TPS | **≥ 120.0 TPS** |
| **Acceptance Length** | 1.0 (N/A) | **4.5 – 6.5 tokens/pass** |
| **Logic & Coding Accuracy** | 100% FP16 parity | **100% Parity (Zero Loss)** |
| **Context Window Capacity** | 4 Slots x 256K | **4 Slots x 256K (1M Tokens)** |
| **GPU VRAM Overhead** | 67.4 GB / 72 GB | **≤ 69.5 GB / 72 GB (Aman)** |
