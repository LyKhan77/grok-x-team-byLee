# 🧠 CooperxMemory — Session State & Handover Ledger

> **Project Name:** CooperAgent  
> **Last Updated:** 2026-08-20T11:05:00+07:00  
> **Active Developer / Identity:** Lee (`dev-tuf`) & Vincent (`vincent`)  
> **Platform Version:** CooperAgent v1.2.0  
> **Repository:** https://github.com/LyKhan77/grok-x-team-byLee.git  

---

## 1. Goal Utama & Arsitektur
- **Deskripsi Proyek:** Platform *Enterprise Autonomous Coding Agent On-Premise* yang mengintegrasikan multi-agent harness (**Grok Build TUI & Pi Agent CLI**) dengan backend inferensi **`CooperxCompute`** pada cluster 3x NVIDIA RTX 3090, dipadukan dengan persistensi memori mandiri **`CooperxMemory`** dan API Gateway/Dashboard **`CooperxTelemetry`** (Port 8987).
- **Foundation Model:** Qwen3.8-27B Q8_0 (~29.03 GB) + Multimodal Vision Projector (`mmproj-BF16.gguf`).
- **Cluster Hardware:** 3x NVIDIA GeForce RTX 3090 (72 GB VRAM, `--tensor-split 1,1,1`) + Intel Core Ultra 7 265 (20 Physical Cores).
- **Gateway & Dashboard:** Next.js 14 Streaming Proxy Interceptor + SQLite Token Sniffer (`usage.db`) pada Port `8987`.

---

## 2. ⚠️ Ground Truth Mesin (diverifikasi 2026-08-20, WAJIB DIBACA)

Beberapa klaim di revisi dokumen sebelumnya tidak cocok dengan kondisi mesin. Berikut hasil verifikasi langsung:

| Klaim lama | Realita terverifikasi |
| :--- | :--- |
| "4 Slots x 256K = 1.048.576 token, aktif live" | ❌ Live berjalan `--ctx-size 524288` → **`n_ctx` 131.072/slot (4 x 128K)**. 256K/slot **belum pernah** berhasil naik. |
| "Baseline VRAM 67.4 GB / 72 GB" | ❌ Terukur **47.8 GB / 72 GB** (16355 + 15769 + 15705 MiB). |
| "`server-optimize.sh` adalah runner produksi" | ❌ **Dead code.** Lihat §2.1. |
| "Foundation: Qwen 3.8 / 2.5 27B" | ⚠️ Spesifiknya **Qwen3.8-27B**, arsitektur GGUF `qwen35`. Lihat §2.2. |

### 2.1 Launcher produksi yang sebenarnya
Server inferensi **dikelola systemd**, bukan dijalankan manual:

```ini
# /etc/systemd/system/llamacpp.service
ExecStart=/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh
Restart=always
RestartSec=5
```

- **File yang harus diedit untuk mengubah config produksi adalah `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.sh`**, bukan `server-optimize.sh` di repo. `server-optimize.sh` hanya salinan referensi — tidak ada yang menjalankannya.
- `kill` manual pada `llama-server` **percuma** — systemd respawn dalam 5 detik. Gunakan `systemctl stop/restart llamacpp.service`.
- ⚠️ **Footgun laten:** drop-in `/etc/systemd/system/llamacpp.service.d/override.conf` menyetel `Environment=CUDA_VISIBLE_DEVICES=0,1` (**hanya 2 GPU**). Saat ini tertutup karena `run-qwen.sh` menimpanya inline dengan `CUDA_VISIBLE_DEVICES=0,1,2`. Jika baris inline itu pernah dihapus, cluster diam-diam turun ke 2 GPU.

### 2.2 Qwen3.8-27B adalah model **hybrid SSM + Attention**
Ini fakta paling penting untuk semua perhitungan VRAM ke depan.

```
qwen35.block_count             = 65    (blk.64 = MTP/nextn head, unused)
qwen35.full_attention_interval = 4     → hanya 16 dari 64 layer punya KV cache
qwen35.ssm.state_size          = 128   → 48 layer sisanya = recurrent state, ukuran TETAP
qwen35.attention.head_count_kv = 4 ; key_length = 256
qwen35.context_length          = 262144  (n_ctx_train)
```

Dikonfirmasi di `llama-model.cpp:2296` (`LLM_ARCH_QWEN35` → `llama_memory_hybrid`).

**KV target @ q4_0 = 18 KiB/token** (`16 x 2 x 4 x 256 x 0.5625 B`):
- 524.288 ctx → **9.0 GiB**
- 1.048.576 ctx → **18.0 GiB**

Konsekuensinya: KV model target **bukan** penghambat menuju 1M. Yang menghambat adalah KV drafter (lihat §4).

---

## 3. Milestone yang Telah Selesai (Verified)
- [x] **CooperxCompute live:** `llamacpp.service` aktif, 4 slot paralel, `--ctx-size 524288` (4 x 128K), VRAM 47.8 GB.
- [x] **CooperxTelemetry Gateway (Port 8987):** Dashboard live, mengenali developer `dev-tuf` dan `vincent`, URL rewrite `/v1` aktif.
- [x] **CooperxHarness Multi-Agent Onboarding:**
  - Grok Build Rust TUI: [`~/.grok/config.toml`](/home/gspe-ai1/.grok/config.toml) & [`config.default.toml`](../../config.default.toml).
  - Pi Agent (pi.dev v0.84.2): [`setup.ps1`](../../setup.ps1) & [`setup.sh`](../../setup.sh) otomatis menghasilkan `~/.pi/agent/models.json` dan `settings.json` UTF-8 tanpa BOM.
- [x] **Windows PowerShell 5.1 Compatibility:** `setup.ps1` 100% pure ASCII dan bebas parser encoding error.
- [x] **CooperxMemory Protocol:** Rule [`.agents/rules/05-cooperx-memory.md`](../rules/05-cooperx-memory.md) aktif.
- [x] **DFLASH 2 Phase 1 (Model Acquisition):** lihat §4.

---

## 4. Active Task in Progress — DFLASH 2 Speculative Drafter

**Plan:** [`docs/plans/dflash2_speculative_acceleration_plan.md`](../../docs/plans/dflash2_speculative_acceleration_plan.md)  
**Tujuan:** ~27 TPS → ~70–90+ TPS per user, lossless, sekaligus membuka jalan ke 4 x 256K.

### ✅ Phase 1 — SELESAI & terverifikasi
`/home/gspe-ai1/models/qwen38-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf` (1.143.006.752 B)

- SHA256 `18a380efc9b7ed8d88677fc895f5c11ae170653434ee378f7348f715c14d0594` — **cocok** dengan `lfs.oid` HuggingFace.
- Kompatibilitas terhadap target **terverifikasi**: `dflash.embedding_length` 5120 = target `n_embd`; `tokenizer.ggml.pre` = `qwen35`, n_vocab 248.320 — identik; `dflash.target_layers = [6,20,34,48,62]` muat di 64 layer target.
- `dflash.block_size = 8` ⇒ **`--spec-draft-n-max 7`** adalah nilai yang benar (draft = block_size − 1).
- `dflash.attention.sliding_window = 2048` pada kelima layer ⇒ KV drafter di-cap 2048 token/slot ≈ **0.17 GiB saja**. `--spec-draft-type-k/v q4_0` **tidak diperlukan**; biarkan F16 (lebih aman untuk KV-injection DFlash).

### 🔴 Phase 2 — TERBLOKIR: build llama.cpp belum mendukung DFlash **2**

```
E llama_model_load: error loading model: done_getting_tensors: wrong number of tensors; expected 81, got 58
```

Build produksi (`master @ 25ae3a9b3`, 18 Agu 2026 04:15 UTC) punya arch `dflash` — tetapi itu **DFlash 1**. Tidak satu pun metadata key DFlash 2 dikenali `src/llama-arch.cpp`: `conv_kernel_size`, `conv_group_size`, `selector_rank`, `selector_top_k`, `block_size`, `target_layers`. 23 tensor *local convolution + candidate selector* tidak punya slot di loader. **GGUF-nya sendiri tidak rusak** (SHA256 cocok) — loader-nya yang ketinggalan.

- Dukungan ada di **[PR #27342](https://github.com/ggml-org/llama.cpp/pull/27342)** — *"spec : add DFlash2 support (local convolution + candidate selector)"*, 20 file, +676/−83. Status **masih `open`, belum merged** per 2026-08-20.
- GGUF DFlash 2 dirilis 18 Agu 21:25 UTC, yaitu **17 jam setelah** commit build produksi — jarak ini tak terhindarkan.
- **Aksi berjalan:** build dari PR di worktree terpisah `/home/gspe-ai1/llama.cpp-dflash2` (branch `pr-27342` @ `5ecbe1ac1`), agar binary produksi tidak tersentuh. Toolchain: CUDA 13.0, `-DGGML_CUDA=ON -DGGML_CUDA_FA=ON -DGGML_NATIVE=ON`.

### 🔬 Temuan VRAM: 1M context dan DFLASH 2 adalah satu paket

Percobaan `--ctx-size 1048576` dengan drafter lama **gagal OOM**:

```
E ggml_backend_cuda_buffer_type_alloc_buffer: allocating 12288.00 MiB on device 0: cudaMalloc failed: out of memory
```

12.288 MiB = persis KV **F16** drafter Qwen2.5-Coder-0.5B pada 1M token (`24 layer x 2 x 2 head x 64 dim x 2 B x 1.048.576`), seluruhnya ditumpuk di CUDA0 oleh `--spec-draft-device CUDA0`. Jadi yang OOM **bukan model target**, melainkan drafter lama.

Proyeksi dengan DFLASH 2 pada 1.048.576 ctx:

| Komponen | VRAM |
| :--- | ---: |
| Baseline live (512K + draft-simple) | 47.8 GB |
| ➕ KV target 512K → 1M | +9.0 GiB |
| ➖ Buang Qwen2.5-Coder-0.5B (0.63 bobot + ~6.0 KV F16) | −6.6 GiB |
| ➕ Bobot DFlash2 Q4_K_M | +1.1 GiB |
| ➕ KV DFlash2 (SWA 2048) | +0.2 GiB |
| **Proyeksi total** | **≈ 51.5 GiB / 72 GiB** |

⚠️ Angka ini **proyeksi, belum diukur** — verifikasi nyata baru bisa dilakukan setelah build PR selesai.

---

## 5. Remaining Checklist
- [x] **Phase 1:** Unduh + verifikasi SHA-256 & kompatibilitas tokenizer drafter DFlash2.
- [ ] **Phase 2a:** Selesaikan build llama.cpp PR #27342 di `/home/gspe-ai1/llama.cpp-dflash2`.
- [ ] **Phase 2b:** Uji binary hasil build di **port 8002** (ctx kecil) untuk validasi `draft-dflash` load + acceptance rate, tanpa mengganggu produksi 8001.
- [ ] **Phase 2c:** Promote ke produksi: update `run-qwen.sh` (`--spec-type draft-dflash`, `--model-draft ...DFlash2-Q4_K_M.gguf`, `--spec-draft-n-max 7`), lalu naikkan `--ctx-size` ke 1048576 dan ukur VRAM nyata.
- [ ] **Phase 2d:** Sinkronkan `server-optimize.sh` dengan `run-qwen.sh`, atau turunkan statusnya menjadi referensi eksplisit di dokumen.
- [ ] **Phase 3:** Stress test multi-stream (`test/run_stress_test.sh`, `test/benchmark_concurrency.py`) → `test/results/benchmark_dflash2_results.json`.
- [ ] **Phase 4:** Verifikasi live throughput di dashboard Port 8987.
- [ ] **Phase 5:** Update `CHANGELOG.md` `[1.3.0]` dan commit & push ke `origin/main`.

---

## 6. Rollback & Safety
- Backup config produksi: `/home/gspe-ai1/llama.cpp/build/bin/run-qwen.pre-dflash2.bak.sh`
- Backup script repo: [`scripts/server-optimize.pre-dflash2.bak.sh`](../../scripts/server-optimize.pre-dflash2.bak.sh)
- **Config known-good:** `--spec-type draft-simple` + `Qwen2.5-Coder-0.5B-Q8_0.gguf` + `--ctx-size 524288` → VRAM 47.8 GB, stabil.
- Binary produksi tetap di `/home/gspe-ai1/llama.cpp/build/bin/`; build eksperimental terisolasi di `/home/gspe-ai1/llama.cpp-dflash2/build/`.
- **Insiden 2026-08-20 10:47–10:51:** `kill` manual memicu systemd merestart service dengan `run-qwen.sh` yang sudah diedit ke 1M + drafter lama → OOM crashloop, port 8001 down ±5 menit. Sudah dipulihkan ke config known-good. *Pelajaran: selalu `systemctl stop llamacpp.service` dulu, dan pastikan isi `run-qwen.sh` sudah diverifikasi sebelum service di-restart.*

---

## 7. Handover Instruction
1. Baca file ini dan [`docs/plans/dflash2_speculative_acceleration_plan.md`](../../docs/plans/dflash2_speculative_acceleration_plan.md).
2. **Baca §2 lebih dulu** — beberapa angka di dokumen lama masih keliru dan sedang dikoreksi bertahap.
3. Lanjutkan dari **Phase 2a**; cek dulu apakah PR #27342 sudah merged ke master (kalau sudah, pakai master, bukan worktree PR).
4. Selalu perbarui [`CHANGELOG.md`](../../CHANGELOG.md) setiap menyelesaikan milestone!
