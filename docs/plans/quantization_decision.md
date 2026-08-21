# Keputusan Kuantisasi Qwen3.8-27B + DFLASH 2 — CooperxCompute

> ⚠️ **DOKUMEN HISTORIS.** Isinya mencatat keadaan dan rencana pada saat ditulis,
> bukan konfigurasi yang berjalan sekarang. Untuk keadaan terkini lihat
> [`ARCHITECTURE.md`](../../ARCHITECTURE.md) dan [`CHANGELOG.md`](../../CHANGELOG.md).
> Konfigurasi live per 2026-08-21: **3 slot × 131.072**, KV `q8_0`,
> `--spec-draft-n-max 5`, ambang compaction 85%, VRAM 75,3%.

Status: analisis, belum dieksekusi. Tanggal: 2026-08-21.
Basis: pengukuran server sendiri, bukan estimasi pihak ketiga.

## 1. Fakta terukur

Arsitektur (dari metadata GGUF, bukan asumsi):

```
qwen35, dense (tidak ada expert_count -> BUKAN MoE)
block_count             65
full_attention_interval 4      -> hanya 16 layer memegang KV
attention.head_count_kv 4
attention.key_length    256    (value_length sama)
```

KV per token = 16 layer x 2 (K,V) x (4 x 256) nilai:

| tipe | byte/nilai | KV/token | @ ctx 688.128 |
|---|---:|---:|---:|
| q4_0 | 0,5625 | 18 KiB | 11,8 GiB |
| q5_1 | 0,75 | 24 KiB | 15,8 GiB |
| q8_0 | 1,0625 | 34 KiB | 22,3 GiB |
| f16 | 2,0 | 64 KiB | 42,0 GiB |

Distribusi context nyata (309 request, journal hari ini):

```
median  75.156      p75 122.910     p90 152.440     p99 171.943
>= 32K : 81,2%      >= 64K : 56,3%      >= 128K : 17,5%
```

VRAM terukur sekarang: 59,9 GiB / 72 GiB = 83,2%
  bobot Q8_0 27,1 + KV q4_0 11,8 + sisa 21,0 (drafter, drafter-KV f16, compute buffer)

## 2. Temuan utama: bobot mendominasi, KV tidak

Baca memori per verification pass (layer-split = sekuensial, ~900 GB/s efektif):

| context | Q8_0+q4_0 | Q6_K+q4_0 | Q4_K_M+q8_0 |
|---|---:|---:|---:|
| median 75K | 30,5 GB / ~34 ms | 23,4 GB / ~26 ms | 20,7 GB / ~23 ms |
| p90 152K | 31,9 GB / ~36 ms | 24,8 GB / ~28 ms | 23,3 GB / ~26 ms |

Bahkan pada p90 152K, KV hanya 2,6 GiB melawan bobot 27,1 GiB — rasio 1:10.
Konsekuensi:

- **Kuantisasi bobot adalah pengungkit kecepatan.** Turun satu tingkat memangkas
  20-30% waktu pass.
- **Kuantisasi KV bukan pengungkit kecepatan, melainkan pengungkit kualitas.**
  Naik dari q4_0 ke q8_0 hanya menambah ~8% bandwidth, tapi +10,5 GiB VRAM.
  Yang mengikat adalah VRAM, bukan bandwidth.

Catatan: perkiraan lama "bobot 13,8 ms (26% dari pass)" tidak konsisten dengan
aritmetika ini (27,1 GiB / 900 GB/s = ~32 ms). Angka lama itu tidak dipakai lagi.

## 3. Ruang solusi (aritmetika VRAM, band target 80-84%)

| skenario | VRAM | % | ctx/user | |
|---|---:|---:|---:|---|
| Q8_0 + q4_0 (sekarang) | 59,9 | 83,2% | 172.032 | dalam band |
| Q8_0 + q8_0 @168K | 70,4 | 97,8% | 172.032 | mustahil |
| Q6_K + q8_0 @168K | 63,8 | 88,6% | 172.032 | lewat band |
| Q6_K + q8_0 @128K | 58,5 | 81,2% | 131.072 | memotong p90 |
| **Q6_K + q5_1 @168K** | **57,2** | **79,5%** | 172.032 | muat |
| **Q4_K_M + q8_0 @168K** | **60,1** | **83,5%** | 172.032 | muat |

**Q8_0 tidak bisa dipertahankan bersama KV berkualitas.** Mempertahankan bobot
near-lossless memaksa KV 4-bit — justru pada beban context panjang, di mana
literatur konsisten menyatakan KV lebih sensitif daripada bobot.

## 4. Kualitas menurut literatur

Perplexity relatif FP16: Q8_0 +0,1-0,3% | Q6_K +0,5-1,5% | Q4_K_M +1,5-3%.
Q4_K_M digambarkan "terlihat pada edge case, terutama tugas yang menuntut
penalaran presisi atau output terstruktur" — persis beban coding agent
(tool call, JSON, diff patch).

Untuk KV: tugas context panjang (>=4K) lebih sensitif terhadap kuantisasi KV
daripada kuantisasi bobot. Ada pula laporan q4_0 KV **lebih lambat** daripada
q8_0 pada 110K context karena overhead dequantisasi per token — belum diverifikasi
di server ini, dan wajib diukur sebelum dipercaya.

## 5. Rekomendasi bertahap

Tidak sekaligus. Tiap langkah satu variabel, dengan kriteria putusan di muka.

**Langkah 1 — Q8_0 -> UD-Q6_K, KV tetap q4_0, ctx tetap 168K.**
File sudah ada di disk (20,5 GiB, belum terpakai). VRAM turun ke ~53,3 GiB (74%).
Prediksi: waktu pass -23%, TPS single-stream 70,8 -> ~87.
Biaya kualitas kecil (+0,5-1,5% ppl). Risiko rendah, rollback = ganti path model.
Kriteria: pertahankan bila TPS median naik >=10% DAN tidak ada regresi pada
tool-call/JSON pass rate.

**Langkah 2 — pakai headroom untuk KV: q4_0 -> q5_1.**
Setelah langkah 1 tersisa ~10 GiB sebelum 84%; q5_1 memakai +4,0 GiB -> 79,5%.
Verifikasi dulu kernel flash-attn mendukung q5_1 tanpa jatuh ke jalur lambat;
bila tidak, pertahankan q4_0 dan pertimbangkan Q4_K_M + q8_0.

**Langkah 3 — hanya jika langkah 1-2 kurang: Q4_K_M + q8_0 @168K (83,5%).**
Rekomendasi riset Perplexity. Kecepatan tertinggi, tapi menukar kualitas bobot
justru pada dimensi yang paling dipakai tim (output terstruktur).

## 6. Koreksi terhadap riset Perplexity

Arah besarnya benar: turunkan bobot, naikkan KV. Yang keliru untuk kasus ini:

1. **"ctx-size 262144, ~64K per user"** — median context nyata tim adalah 75K dan
   p90 152K. Konfigurasi ini akan memotong 56% request. Rekomendasi paling
   sentral di dokumen itu justru merusak alur kerja tim.
2. **"Jangan alokasikan 168K x 4 statis, 672K terlalu berat"** — sudah berjalan
   di 83,2% VRAM secara stabil. Terbantah oleh pengukuran.
3. **"--split-mode layer lebih aman daripada --tensor-split"** — dikotomi palsu.
   Di llama.cpp, `--tensor-split` menetapkan proporsi layer per GPU *di bawah*
   split-mode layer (default). Bukan alternatif satu sama lain.
4. **batch 512 / ubatch 128** — optimum terukur di sini 4096/1024. Saran itu akan
   memperlambat prefill secara signifikan.
5. **`--n-gpu-layers all`** — bukan nilai valid; gunakan angka (999).
6. **`--cont-batching`, `--cache-prompt`** — sudah default aktif pada build ini.
7. **Estimasi TPS "15-35 per user"** — kita di median 30,3, sudah di batas atas.

Yang tetap layak diambil: usul menguji `--spec-draft-n-max 5`. Acceptance turun
seiring n membesar (0,512 pada n=6; 0,401 pada n=7), jadi n=5 belum diuji dan
bisa jadi lebih baik.

## 7. Yang wajib diukur, bukan diasumsikan

```
TPS median & p90 per skenario (nmax_stats.sh)
acceptance & mean_len
VRAM puncak per GPU
tool-call / JSON valid rate pada repo internal
akurasi retrieval context panjang (>100K)
prefill t/s pada prompt panjang
```
