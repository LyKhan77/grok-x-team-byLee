# ⚡ Implementation Plan: DFLASH 2 Speculative Acceleration for Qwen3.8-27B

> **Module Series:** `CooperxCompute`  
> **Target Hardware:** 3x NVIDIA GeForce RTX 3090 (72 GB VRAM) + Intel Core Ultra 7 265  
> **Ecosystem:** CooperAgent  
> **Source Reference:** [Inco AI DFLASH 2 Research (August 2026)](https://inco.ai/blog/dflash2/)  
> **Status:** Phase 1–2c ✅ **DFLASH 2 LIVE di produksi** (55,21 TPS, ≈2.1x) · Phase 2d 🔄 kuantisasi KV drafter menuju 4x256K · Revisi 2026-08-20

---

## 1. Executive Summary & Goals

Platform **CooperAgent** berjalan pada model foundation **Qwen3.8-27B Q8_0** dengan kecepatan *autoregressive decoding* tunggal sekitar **~27 TPS**.

Melalui integrasi **DFLASH 2** dari Inco AI:
1. **Parallel Block Drafting:** memprediksi satu blok token sekaligus dalam 1 forward pass (*block diffusion*), dengan *candidate path selector* menelusuri satu jalur koheren.
2. **Peningkatan Throughput:** target **~70 – 90+ TPS per user**.
3. **Lossless Verification:** output greedy identik dengan target model; sampling mempertahankan distribusinya.
4. **Membuka jalan ke 4 Slots x 256K:** DFLASH 2 justru **menghemat** VRAM dibanding drafter lama (lihat §2.3) — 1M context dan DFLASH 2 adalah satu paket, bukan dua langkah terpisah.

---

## 2. Ground Truth Mesin (diverifikasi 2026-08-20)

### 2.1 Launcher produksi
Server dikelola **systemd**, bukan dijalankan manual:

```ini
# /etc/systemd/system/llamacpp.service
ExecStart=/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh
Restart=always
RestartSec=5
```

File yang harus diedit untuk mengubah config produksi adalah **`run-qwen.sh`**. `server-optimize.sh` di repo tidak dijalankan oleh apa pun. `kill` manual percuma — gunakan `systemctl`.

⚠️ Drop-in `llamacpp.service.d/override.conf` menyetel `CUDA_VISIBLE_DEVICES=0,1` (2 GPU). Saat ini tertutup oleh assignment inline `0,1,2` di `run-qwen.sh`.

### 2.2 Qwen3.8-27B adalah model hybrid SSM + Attention

```
qwen35.block_count             = 65   (blk.64 = MTP head, unused)
qwen35.full_attention_interval = 4    → hanya 16 dari 64 layer punya KV cache
qwen35.ssm.state_size          = 128  → 48 layer sisanya recurrent, ukuran TETAP
qwen35.attention.head_count_kv = 4 ; key_length = 256
```

**KV target @ q4_0 = 18 KiB/token.** 524.288 ctx → 9.0 GiB · 1.048.576 ctx → 18.0 GiB.

### 2.3 Kenapa 1M sebelumnya gagal

Percobaan `--ctx-size 1048576` dengan drafter lama menghasilkan:

```
E ggml_backend_cuda_buffer_type_alloc_buffer: allocating 12288.00 MiB on device 0: cudaMalloc failed: out of memory
```

12.288 MiB = persis KV **F16** drafter Qwen2.5-Coder-0.5B pada 1M token, seluruhnya di CUDA0. Drafter DFLASH 2 memakai **SWA window 2048** pada kelima layer ⇒ KV-nya hanya **~0.17 GiB**.

| Komponen | VRAM |
| :--- | ---: |
| Baseline live terukur (512K + draft-simple) | **47.8 GB** |
| ➕ KV target 512K → 1M | +9.0 GiB |
| ➖ Buang Qwen2.5-Coder-0.5B (0.63 bobot + ~6.0 KV F16) | −6.6 GiB |
| ➕ Bobot DFlash2 Q4_K_M | +1.1 GiB |
| ➕ KV DFlash2 (SWA 2048) | +0.2 GiB |
| **Proyeksi total** | **≈ 51.5 GiB / 72 GiB** |

*Proyeksi, belum terukur — verifikasi setelah build PR selesai.*

---

## 3. Technical Architecture & Component Mapping

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    COOPERXCOMPUTE + DFLASH 2 ARCHITECTURE                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [Target Model]   Qwen3.8-27B-Q8_0.gguf  (~29.03 GB, arch `qwen35`, hybrid)   │
│                   65 blok: 16 full-attention (KV) + 48 SSM (state tetap)      │
│  [Draft Model]    Qwen3.8-27B-DFlash2-Q4_K_M.gguf (1.14 GB, arch `dflash`)    │
│                   5 layer · block_size 8 · SWA 2048 · selector_rank 256       │
│                   target_layers = [6, 20, 34, 48, 62]                         │
│  [Context]        4 Slots (target 256K/slot) · KV-Cache q4_0                  │
│  [VRAM Strategy]  --tensor-split 1,1,1 di 3x RTX 3090                         │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Step-by-Step Implementation Checklist

### ✅ 📦 Phase 1: Model Acquisition & Draft Weights Preparation — **SELESAI**
- [x] **Task 1.1:** Unduh `incoai/Qwen3.8-27B-DFlash2-GGUF:Q4_K_M` → `/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf` (1.143.006.752 B).
- [x] **Task 1.2:** Verifikasi SHA-256 & kompatibilitas tokenizer.
  - SHA256 `18a380ef…4d0594` **cocok** dengan `lfs.oid` HuggingFace.
  - `tokenizer.ggml.pre` = `qwen35`, n_vocab 248.320 — **identik** dengan target.
  - `dflash.embedding_length` 5120 = target `n_embd`. `target_layers [6,20,34,48,62]` muat di 64 layer.
  - `dflash.block_size = 8` ⇒ **`--spec-draft-n-max 7`** (= block_size − 1) adalah nilai yang benar.

### 🔴 🛠️ Phase 2: Inference Engine — **TERBLOKIR**

**Blocker:**
```
E llama_model_load: error loading model: done_getting_tensors: wrong number of tensors; expected 81, got 58
```
Build produksi `master @ 25ae3a9b3` mendukung DFlash **1**, bukan DFlash **2**. Metadata key `conv_kernel_size`, `conv_group_size`, `selector_rank`, `selector_top_k`, `block_size`, `target_layers` semuanya tidak dikenali `src/llama-arch.cpp`. Dukungan ada di **[PR #27342](https://github.com/ggml-org/llama.cpp/pull/27342)** yang **masih open, belum merged**.

- [ ] **Task 2a:** Build llama.cpp dari PR #27342 di worktree terpisah `/home/gspe-ai1/llama.cpp-dflash2` (branch `pr-27342` @ `5ecbe1ac1`), agar binary produksi tidak tersentuh.
  ```bash
  cd /home/gspe-ai1/llama.cpp
  git fetch origin pull/27342/head:pr-27342
  git worktree add /home/gspe-ai1/llama.cpp-dflash2 pr-27342
  cd /home/gspe-ai1/llama.cpp-dflash2
  cmake -B build -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=ON -DGGML_CUDA_FA=ON -DGGML_NATIVE=ON
  cmake --build build -j 12 --target llama-server
  ```
- [x] **Task 2a:** SELESAI — build di `/home/gspe-ai1/llama.cpp-dflash2` (`pr-27342` @ `5ecbe1ac1`). ⚠️ Branch PR membawa **17 commit** yang belum ada di build produksi; hanya 1 di antaranya `support DFlash2`.
- [x] **Task 2b:** SELESAI — uji CPU-only di port 8002: `draft acceptance = 0.64463 (156/242), mean len = 5.46`. ⚠️ Uji ini memakai `--device none` sehingga jalur CUDA tidak tersentuh — itu celah yang meloloskan bug 2c.
- [ ] **Task 2b-bis:** Uji ulang dengan target di GPU multi-device (butuh jendela maintenance ~29 GB VRAM).
- [ ] **Task 2c:** Promote ke produksi via `run-qwen.sh`. **Percobaan pertama (11:06) GAGAL** dengan
  ```
  ggml-backend.cpp:930: pre-allocated tensor (output.weight) in a buffer (CUDA2) that cannot run the operation (NONE)
  ```
  **Root cause:** drafter DFlash 2 tidak punya `output.weight`/`tok_embd.weight` sendiri (tensor non-blok-nya hanya `enc.output_norm`, `fc`, `output_norm`, `selector_*`) — ia meminjam dari target. Dengan `--tensor-split 1,1,1`, `output.weight` target ada di CUDA2, sementara `--spec-draft-device CUDA0` membatasi scheduler drafter ke CUDA0 saja.
  **Perbaikan:** `--spec-draft-device CUDA0,CUDA1,CUDA2` (sudah masuk `scripts/dflash2_promote.sh`).
  **Pertahankan seluruh flag yang sudah live** — `--mmproj`, `--alias qwen35`, `--jinja`, `--tensor-split 1,1,1`, `--gpu-layers 999`, `--host 0.0.0.0`, dan sampling params. Yang berubah hanya:
  ```diff
  - --spec-type draft-simple
  - --model-draft /home/gspe-ai1/models/qwen38-27b/Qwen2.5-Coder-0.5B-Q8_0.gguf
  - --spec-draft-n-max 8
  + --spec-type draft-dflash
  + --model-draft /home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf
  + --spec-draft-n-max 7
  - --spec-draft-device CUDA0
  + --spec-draft-device CUDA0,CUDA1,CUDA2   # WAJIB: drafter meminjam output.weight target
  ```
  ⚠️ Catatan revisi: versi sebelumnya dokumen ini menyatakan `--spec-draft-type-k/v q4_0` tidak perlu karena KV drafter di-cap SWA 2048. **Itu keliru** — lihat Task 2d. Flag tersebut justru syarat untuk mencapai 4 x 256K.
- [ ] **Task 2d:** Naikkan kapasitas context. ⚠️ **Mensyaratkan kuantisasi KV drafter.**

  **Koreksi asumsi:** DFlash 2 biasa **tidak** memakai cache berjendela. `llama-model.cpp` memakai `llama_kv_cache_iswa` hanya bila `dsv4_hc_mult > 0` (varian DSpark); DFlash 2 fallthrough ke KV ukuran penuh `n_ctx_seq`, sehingga `dflash.attention.sliding_window = 2048` diabaikan. KV drafter = `5 x 2 x 8 x 128 x sizeof(type)` = **20 KiB/token @ F16**.

  | tipe KV drafter | @ 524288 | @ 1048576 |
  | :--- | ---: | ---: |
  | F16 | 10,0 GiB | 20,0 GiB |
  | q4_0 | 2,8 GiB | 5,6 GiB |

  Proyeksi total VRAM (komponen tetap terukur 35.909 MiB; kapasitas 73.728 MiB):

  | ctx | drafter F16 | drafter q4_0 |
  | :--- | ---: | ---: |
  | 720.896 (4x176K) | 62.661 MiB ✅ | 52.541 MiB ✅ |
  | 786.432 (4x192K) | 65.093 MiB ✅ | 54.053 MiB ✅ |
  | 1.048.576 (4x256K) | 74.821 MiB ❌ OOM | **60.101 MiB ✅** |

  Urutan yang disarankan:
  1. `bash scripts/dflash2_promote.sh 524288 q4_0` → ukur VRAM, TPS, acceptance; pastikan kuantisasi tidak merugikan.
  2. Jika bersih → `bash scripts/dflash2_promote.sh 1048576 q4_0`.
  3. Jika acceptance turun → mundur ke F16 pada `720896` atau `786432`.
- [ ] **Task 2e:** Sinkronkan `server-optimize.sh` dengan `run-qwen.sh`, atau turunkan statusnya menjadi referensi eksplisit di `AGENTS.md`/`ARCHITECTURE.md`.

### 🧪 Phase 3: Benchmark & Throughput Verification
- [ ] **Task 3.1:** Stress test 1 / 2 / 4 stream via `test/benchmark_concurrency.py`.
- [ ] **Task 3.2:** Ukur *Acceptance Length* dan *Real Output TPS*.
- [ ] **Task 3.3:** Simpan hasil ke `test/results/benchmark_dflash2_results.json`.

### 📊 Phase 4: Telemetry & Dashboard Integration
- [ ] **Task 4.1:** Verifikasi streaming token metrics di **CooperxTelemetry** (Port `8987`).
- [ ] **Task 4.2:** Slot visualizer menampilkan 4 slot dengan indikator TPS DFLASH 2.

### 📚 Phase 5: Documentation & Git Checkpoint
- [ ] **Task 5.1:** Perbarui [`ARCHITECTURE.md`](../../ARCHITECTURE.md) dan [`AGENTS.md`](../../AGENTS.md).
- [ ] **Task 5.2:** Catat pada [`CHANGELOG.md`](../../CHANGELOG.md) di bawah versi `[1.3.0]`.
- [ ] **Task 5.3:** Commit dan push ke `origin/main`.

---

## 5. Acceptance Criteria

| Kriteria Pengujian | Baseline terukur | Target dengan DFLASH 2 |
| :--- | :--- | :--- |
| **Single User TPS** | ~26 – 27 TPS | **≥ 70.0 TPS** — *terukur live: **55,21 TPS** (≈2.1x), belum tercapai* |
| **Multi-User (4 Streams) Throughput** | ~50 – 58 TPS | **≥ 120.0 TPS** |
| **Acceptance Length** | 1.0 (N/A) | **4.5 – 6.5 token/pass** *(eval resmi Q4_K_M: 5.39)* |
| **Logic & Coding Accuracy** | 100% parity | **100% Parity (Zero Loss)** |
| **Context Window Capacity** | **4 Slots x 128K (524.288)** | **4 Slots x 256K (1.048.576)** — hanya mungkin dengan KV drafter q4_0 |
| **GPU VRAM** | **47.8 GB / 72 GB** | *terukur live @524288: **55.365 MiB** (KV drafter F16); proyeksi @1048576 dengan KV drafter q4_0: **60.101 MiB*** |

---

## 6. Rollback
- Backup config produksi: `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.pre-dflash2.bak.sh`
- Backup script repo: [`scripts/server-optimize.pre-dflash2.bak.sh`](../../scripts/server-optimize.pre-dflash2.bak.sh)
- Config known-good: `draft-simple` + `Qwen2.5-Coder-0.5B-Q8_0.gguf` + `--ctx-size 524288` → 47.8 GB, stabil.
- Binary produksi `/home/gspe-ai1/llama.cpp/build/bin/` tidak pernah disentuh oleh build eksperimental.
