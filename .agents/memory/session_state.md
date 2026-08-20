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

### ✅ Phase 2a — Build llama.cpp dengan dukungan DFlash 2 — SELESAI

Build produksi (`master @ 25ae3a9b3`) hanya mendukung DFlash **1**:
```
E llama_model_load: error loading model: done_getting_tensors: wrong number of tensors; expected 81, got 58
```
Tidak satu pun metadata key DFlash 2 dikenali `src/llama-arch.cpp` (`conv_kernel_size`, `conv_group_size`, `selector_rank`, `selector_top_k`, `block_size`, `target_layers`). GGUF-nya tidak rusak — loader-nya yang ketinggalan.

Dukungan ada di **[PR #27342](https://github.com/ggml-org/llama.cpp/pull/27342)** (`spec : add DFlash2 support`), **masih `open`** per 2026-08-20. Build dibuat di worktree terpisah:

- Lokasi: `/home/gspe-ai1/llama.cpp-dflash2` (branch `pr-27342` @ `5ecbe1ac1`), binary `build/bin/llama-server`, self-contained lewat RUNPATH ke dir-nya sendiri.
- Toolchain: CUDA 13.0, `-DGGML_CUDA=ON -DGGML_CUDA_FA=ON -DGGML_NATIVE=ON`.
- ⚠️ Branch PR membawa **17 commit** yang belum ada di build produksi; hanya **1** di antaranya `support DFlash2`, 16 sisanya commit upstream lain. Promote = lompatan 17 commit, bukan sekadar menambah DFlash 2.

### ✅ Phase 2b — Validasi terisolasi — LOLOS

Uji CPU-only pada port 8002 (produksi GPU tak tersentuh):
```
common_speculative_impl_draft_dflash: adding speculative implementation 'draft-dflash'
 - n_max=7, n_min=2, p_min=0.00
 - block_size=8, mask_token_id=248070, n_extract=5, sample_from_anchor=true
...
draft acceptance = 0.64463 (156 accepted / 242 generated), mean len = 5.46
```
**Acceptance length 5.46** — sesuai target plan 4.5–6.5 dan eval resmi HF Q4_K_M (5.39).

⚠️ Keterbatasan uji ini: `--device none` berarti graph DFlash 2 di jalur **CUDA** tidak tersentuh sama sekali. Itu sebabnya promote tetap gagal (lihat 2c).

### ✅ Phase 2c — Promote BERHASIL (percobaan ke-2, 11:22)

**Percobaan pertama (11:06) gagal** crashloop `SIGABRT`:
```
ggml-backend.cpp:930: pre-allocated tensor (output.weight) in a buffer (CUDA2)
                      that cannot run the operation (NONE)
```
Backtrace: `ggml_backend_sched_backend_id_from_cur` ← `split_graph` ← `graph_reserve` ← `resolve_fused_ops` ← `llama_context()` ← `common_speculative_init_result` — saat **konteks drafter** dibuat.

**Root cause:** drafter DFlash 2 **tidak punya `output.weight` maupun `tok_embd.weight` sendiri**. Tensor non-blok-nya hanya `enc.output_norm`, `fc`, `output_norm`, `selector_hidden`, `selector_predecessor`, `selector_successor` — lm_head dan embedding **dipinjam dari target**. Dengan `--tensor-split 1,1,1`, `output.weight` target mendarat di **CUDA2**, sementara `--spec-draft-device CUDA0` membatasi scheduler konteks drafter ke CUDA0 + CPU. Tensor yang sudah teralokasi di buffer CUDA2 tak terjadwalkan → abort.

Ini menjelaskan kenapa semua pelapor sukses di PR #27342 memakai **satu GPU**, dan kenapa seluruh uji CPU lolos (di sana `output.weight` ada di buffer CPU yang dikenal scheduler drafter).

**Perbaikan:** `--spec-draft-device CUDA0,CUDA1,CUDA2`. Promote ke-2 pada 11:22 **berhasil**:
```
common_speculative_impl_draft_dflash: adding speculative implementation 'draft-dflash'
 - n_max=7, n_min=2, block_size=8, n_extract=5, sample_from_anchor=true
srv  llama_server: model loaded
srv  llama_server: listening on http://0.0.0.0:8001
```
Alias `qwen35` utuh, `n_ctx` 131.072/slot, 4 slot.

**Pengukuran live pertama:** 400 token / 7.24 s = **55.21 TPS** single stream (termasuk prompt eval) — dari baseline ~27 TPS, yaitu **≈2.1×**. Di bawah target plan 70 TPS.

### 🔬 VRAM terukur & koreksi asumsi SWA

| | GPU0 | GPU1 | GPU2 | Total |
| :--- | ---: | ---: | ---: | ---: |
| Baseline `draft-simple` @ 524288 | 16.355 | 15.769 | 15.705 | **47.829 MiB** |
| DFLASH 2 (KV drafter F16) @ 524288 | 18.737 | 18.087 | 18.541 | **55.365 MiB** |
| Δ | +2.382 | +2.318 | +2.836 | **+7.536 MiB** |

⚠️ **Koreksi:** catatan sebelumnya mengklaim KV drafter di-cap SWA 2048 (~0.17 GiB). **Itu salah.** `llama-model.cpp` memakai `llama_kv_cache_iswa` (cache berjendela) **hanya bila `dsv4_hc_mult > 0`**, yaitu varian **DSpark**; DFlash 2 biasa jatuh ke `default` dengan **KV ukuran penuh `n_ctx_seq`**. Metadata `dflash.attention.sliding_window = 2048` diabaikan untuk varian ini.

KV drafter sebenarnya = `5 layer x 2 x 8 head x 128 dim x sizeof(type)`:

| tipe | per token | @ 524288 | @ 1048576 |
| :--- | ---: | ---: | ---: |
| F16 | 20.480 B | 10,0 GiB | 20,0 GiB |
| q4_0 | 5.760 B | 2,8 GiB | 5,6 GiB |

Komponen tetap (bobot + mmproj + compute buffer), diturunkan dari datapoint terukur: **35.909 MiB**.

### 📐 Proyeksi kapasitas context (kapasitas 73.728 MiB)

| ctx | KV drafter F16 | KV drafter q4_0 |
| :--- | ---: | ---: |
| 655.360 (4x160K) | 60.229 MiB ✅ | 51.029 MiB ✅ |
| 720.896 (4x176K) | 62.661 MiB ✅ | 52.541 MiB ✅ |
| 786.432 (4x192K) | 65.093 MiB ✅ | 54.053 MiB ✅ |
| 917.504 (4x224K) | 69.957 MiB ⚠️ tipis | 57.077 MiB ✅ |
| **1.048.576 (4x256K)** | 74.821 MiB ❌ OOM | **60.101 MiB ✅** (20.034/GPU, sisa 4.542) |

**Kesimpulan:** target 4 x 256K **tercapai**, tetapi mensyaratkan `--spec-draft-type-k q4_0 --spec-draft-type-v q4_0`. Tanpa itu, plafon praktisnya ~786K. Proyeksi ini berdiri di atas satu datapoint terukur — komponen tetap dianggap konstan terhadap ctx, jadi naikkan bertahap dan ukur, jangan lompat.

### ✅ Phase 3 — Tuning terukur (2026-08-20 14:xx)

Konfigurasi produksi saat ini (`run-qwen.sh`), semua terverifikasi live:

```
--spec-type draft-dflash  --spec-draft-device CUDA0,CUDA1,CUDA2  --spec-draft-n-max 4
--ctx-size 688128  --parallel 4        -> n_ctx_slot = 172.032 (168K/user), kv_unified = false
--cache-ram 0                          -> --cache-idle-slots otomatis nonaktif
--temp 1.0 --top-p 0.95 --top-k 20 --min-p 0.0 --presence-penalty 0.0
--repeat-penalty 1.0 --repeat-last-n 0 --reasoning-effort xhigh
--cache-type-k/v q4_0  --ubatch-size 1024  --flash-attn on  --mmproj aktif
```

| Metrik | Sebelum tuning | Sesudah |
| :--- | ---: | ---: |
| TPS konkuren | 13,1 | **25,3** |
| Acceptance rate | 0,26 – 0,43 | **0,70 – 0,78** |
| Mean len | 2,84 – 3,99 | 3,81 – 4,10 |
| Context per user | 131.072 | **172.032** |
| VRAM | 55.457 (75%) | **59.565 (80%)** |

⚠️ Rasio TPS 1,9x bersifat indikatif — "sebelum" diukur dengan 3 sekuens aktif, "sesudah" dengan 2. Acceptance rate tidak ambigu (metrik sama, banyak sampel).

**Yang terbukti berhasil:**
- Sampling default Qwen3.8 thinking-mode. `repeat-penalty 1.10` bekerja di setiap langkah dan menolak draft token; mematikannya menaikkan acceptance ~2x.
- `--spec-draft-n-max 7 -> 4`. Acceptance ~3 membuat draft 7 token memboroskan verifikasi.
- Alokasi statis 4x168K: adil secara konstruksi, tiap user dijamin porsinya.

### ❌ Percobaan `--kv-unified` — GAGAL, jangan diulang tanpa uji ulang

Dicoba pada pool 655.360, hasilnya regresi berat:
- VRAM **69.997 MiB (94%)** versus proyeksi 60.321 — meleset 9,7 GB
- Latensi kolaps: request **16 token = 35,4 detik** dengan 3 slot sibuk

Dua penyebab yang dicurigai (tidak dipisahkan): tekanan VRAM di 94%, dan penggusuran slot idle ke prompt cache RAM yang menyalin KV gigabyte pada **setiap task baru**.

**Penyebab meleset proyeksi:** model VRAM saya hanya menghitung KV dan mengabaikan buffer yang berskala `n_ctx_seq`. `--kv-unified` menaikkan `n_ctx_seq` dari `n_ctx/n_parallel` menjadi `n_ctx` (di-cap `n_ctx_train` = 262.144), sehingga buffer tersebut membengkak.

**Trade-off yang perlu diingat:** `--kv-unified` dinamis tetapi **tidak adil** — tidak ada cap per-slot, satu sesi rakus bisa menghabiskan pool. Alokasi statis adil secara konstruksi. llama.cpp tidak menyediakan mekanisme yang dinamis sekaligus adil.

### 🔬 Lever kecepatan yang BELUM dicoba
1. `--spec-draft-p-min` (default 0.00) — menghentikan drafting saat drafter tidak yakin; menyasar pemborosan verifikasi di bawah konkurensi.
2. `--spec-draft-n-max 3` — turunkan lagi dari 4.
3. Hapus `--tensor-split`, jalankan 3 instance single-GPU dengan bobot Q4/Q6. Berpotensi terbesar; artikel Inco AI membuktikan model + drafter muat di satu GPU 24 GB pada Q4.

### 📦 Aset tersedia
- `Qwen3.8-27B-UD-Q6_K.gguf` sedang diunduh (~11 GB dari 22 GB) untuk opsi Langkah 3. Hapus bila tidak dipakai.
- Bobot Q6_K membebaskan ~6,6 GiB dibanding Q8_0 dan memberi decode ~1,3x lebih cepat (decode = 91,7% waktu server).

### ✅ Phase 3b — Vision fix + hasil akhir (2026-08-20 15:45)

**Vision terbukti rusak** dan sudah diperbaiki. Uji langsung dengan gambar PNG 64x64 (merah kiri-atas, biru kanan-bawah, putih di dua kuadran sisanya):

```
SEBELUM: HTTP 500 decode() failed: failed to process speculative batch
SESUDAH: "Red is in the top-left, blue in the bottom-right, and white fills
          the other two squares."   <- faktual benar, 8,6 detik
```

Penyebab: target Qwen3.8 memakai M-RoPE; baris embedding dari chunk gambar mtmd membawa posisi non-linear yang tidak dapat disimpan draft cache 1D DFlash. Perbaikan dari [z-lab/llama.cpp-fork PR #1](https://github.com/z-lab/llama.cpp-fork/pull/1) (1 file, +74/-5), patch tersimpan di [`scripts/dflash2_vision_fix.patch`](../../scripts/dflash2_vision_fix.patch). **PR upstream masih open.**

Binary produksi kini: **`/home/gspe-ai1/llama.cpp-dflash2/build-vfix/bin/llama-server`**
Rollback: `sed -i 's|build-vfix|build|' run-qwen.sh && sudo systemctl restart llamacpp.service`

**Hasil akhir terukur:**

| Metrik | Awal sesi | Akhir |
| :--- | ---: | ---: |
| Decode TPS single-stream | ~27 | **70,75** ← target plan >=70 tercapai |
| Acceptance rate | 0,26 - 0,43 | **0,66 - 0,82** |
| Mean len | 2,84 - 3,99 | 3,64 - 4,27 |
| Context per user | 131.072 | **172.032** (adil, dijamin) |
| VRAM | 55.457 (75%) | **59.329 (80%)** |
| Vision | 🔴 HTTP 500 | ✅ berfungsi |

⚠️ TPS di bawah konkurensi masih bervariasi — task 20517 (4.299 token, context panjang) hanya 10,41 TPS meski acceptance 0,817. Belum ada benchmark terkontrol; `test/benchmark_concurrency.py` siap, butuh jendela hening.

**Catatan operasional:** `TimeoutStopUSec=1min 30s`. Proses lama menunggu generasi aktif selesai sebelum keluar, jadi restart bisa memakan sampai 90 detik sebelum systemd meng-SIGKILL. Ini normal, bukan hang.

### 🔬 Phase 3 — Sweep n-max (SIAP, menunggu jendela hening)

**Hipotesis:** `--spec-draft-n-max` diturunkan 7 → 4 saat acceptance masih 0,26–0,43. Setelah sampling diselaraskan ke rekomendasi Qwen, acceptance naik ke 0,70–0,82 dan `mean_len` terukur (4,27) **mentok tepat di plafon yang dipaksakan n-max 4**. Optimumnya kemungkinan bergeser kembali ke atas.

**Model prediksi** (dekomposisi dari anchor terukur 400 token / 5.639 ms, mean_len 3,80):
```
53,6 ms per verification pass  =  13,8 ms baca bobot (26%)  +  39,8 ms overhead (74%)
```
Overhead ~40 ms ini **tervalidasi silang** dengan rig lain (1×4090, Q4_K_XL: 42,7 ms), memberi keyakinan pada modelnya.

| Skenario | mean_len | TPS prediksi | vs sekarang |
| :--- | ---: | ---: | ---: |
| Q8_0 + n-max 4 (sekarang) | 3,80 | 70,6 *(terukur)* | 1,00× |
| Q6_K + n-max 4 | 3,80 | 75,3 | 1,06× |
| Q8_0 + **n-max 6** | ~4,80 | 89,2 | 1,26× |
| Q8_0 + **n-max 7** | ~5,40 | 100,4 | 1,41× |

⚠️ mean_len untuk n-max 6/7 adalah **ekstrapolasi**, dan model tidak memperhitungkan kenaikan biaya verifikasi (8 token vs 5 per pass) — angka 100,4 hampir pasti optimistis.

**Kesimpulan Q6_K:** hanya +6%, karena bobot cuma 26% dari waktu per pass. Lever n-max 4–7× lebih besar dan gratis. Q6_K sudah diunduh (22 GB, ukuran cocok) dan disimpan sebagai opsi, **tidak dipasang**.

**Perkakas siap:**
- [`test/bench_nmax.py`](../../test/bench_nmax.py) — benchmark terkontrol, stdlib saja. Mengambil angka otoritatif dari `print_timing` server (decode TPS murni + acceptance), bukan latensi end-to-end klien. Parser terverifikasi.
- [`scripts/dflash2_nmax_sweep.sh`](../../scripts/dflash2_nmax_sweep.sh) — orkestrasi sweep. **Butuh sudo** (systemctl restart) dan **jendela hening**. Mengembalikan n-max awal otomatis, termasuk saat di-interrupt (trap).

  `sudo bash scripts/dflash2_nmax_sweep.sh 4 6 7`

### 🚨 Temuan: konkurensi mendegradasi mean_len, bukan hanya waktu per pass

Terukur saat 4 slot penuh:
```
gen=248   decode  1,51 TPS  acceptance 0,506  mean_len 3,02
gen=1380  decode 16,60 TPS  acceptance 0,525  mean_len 3,10
```
Bandingkan saat lengang: decode 70,75 TPS, acceptance 0,702, mean_len 3,80–4,27.

Jadi konkurensi menurunkan **acceptance itu sendiri** (0,70 → 0,51), bukan sekadar membagi GPU. Ini menjelaskan keluhan 8–15 TPS dari developer. Penyebabnya belum diketahui dan **belum diselidiki**.

---

## 5. Remaining Checklist
- [x] **Phase 1:** Unduh + verifikasi SHA-256 & kompatibilitas tokenizer drafter DFlash2.
- [x] **Phase 2a:** Build llama.cpp PR #27342 di `/home/gspe-ai1/llama.cpp-dflash2` — selesai.
- [x] **Phase 2b:** Validasi terisolasi — acceptance length 5.46, lolos.
- [ ] **Phase 2c:** Promote ke produksi — **percobaan pertama gagal**, root cause ditemukan dan perbaikan (`--spec-draft-device CUDA0,CUDA1,CUDA2`) sudah masuk skrip. Butuh jendela maintenance untuk uji live.
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
- **Insiden 2026-08-20 11:05–11:07:** Promote pertama gagal `SIGABRT` di konteks drafter (`output.weight` di CUDA2 vs `--spec-draft-device CUDA0`); crashloop, port 8001 down ±1 menit sampai rollback. *Pelajaran: uji terisolasi yang seluruhnya di CPU tidak membuktikan apa pun tentang penempatan multi-GPU — permukaan uji harus mencerminkan topologi produksi.*
- **Insiden 2026-08-20 10:47–10:51:** `kill` manual memicu systemd merestart service dengan `run-qwen.sh` yang sudah diedit ke 1M + drafter lama → OOM crashloop, port 8001 down ±5 menit. Sudah dipulihkan ke config known-good. *Pelajaran: selalu `systemctl stop llamacpp.service` dulu, dan pastikan isi `run-qwen.sh` sudah diverifikasi sebelum service di-restart.*

---

## 7. Handover Instruction
1. Baca file ini dan [`docs/plans/dflash2_speculative_acceleration_plan.md`](../../docs/plans/dflash2_speculative_acceleration_plan.md).
2. **Baca §2 lebih dulu** — beberapa angka di dokumen lama masih keliru dan sedang dikoreksi bertahap.
3. Lanjutkan dari **Phase 2a**; cek dulu apakah PR #27342 sudah merged ke master (kalau sudah, pakai master, bukan worktree PR).
4. Selalu perbarui [`CHANGELOG.md`](../../CHANGELOG.md) setiap menyelesaikan milestone!
