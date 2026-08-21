# Rencana: Horizon Long-Task, Compaction Cepat, dan Ingatan Lintas Sesi

Tanggal: 2026-08-21. Status: **rencana, belum dieksekusi.**

## 1. Akar lambatnya compaction sudah teridentifikasi — dan sebagian sudah hilang

Compaction = prefill ~80% context + generasi ringkasan (~4.000 token).

| kondisi | prefill | generasi | total |
| :--- | ---: | ---: | ---: |
| ctx 131K, **4 slot lama** (3,9 TPS) | 157s | 1.026s | **19,7 menit** |
| ctx 131K, **3 slot sekarang** (41,5 TPS) | 157s | 96s | **4,2 menit** |

Angka 15–20 menit yang Anda alami cocok persis dengan baris pertama. Penyebabnya
bukan compaction itu sendiri, melainkan **TPS yang runtuh saat 4 slot sibuk** —
dan itu sudah diperbaiki. Perubahan hari ini kemungkinan besar sudah memangkasnya
~5x tanpa tindakan tambahan. **Belum diverifikasi** karena belum ada compaction
sejak restart.

## 2. Yang belum dimanfaatkan sama sekali: memory native Grok

```
[memory] enabled  -> DEFAULT false. Blok ini tidak ada di config kita.
~/.grok/memory/   -> kosong, belum pernah dipakai.
```

Fitur yang sudah ada dan tidak kita pakai:

| Fitur | Fungsi |
| :--- | :--- |
| `initial_injection.enabled = true` | Memory dicari **otomatis pada giliran pertama tiap sesi** |
| `/flush` | Ringkasan LLM sesi berjalan → log sesi bertanggal, terindeks, **dapat dicari sesi berikutnya** |
| `session.save_on_end = true` | Ringkasan metadata otomatis: topik, berkas yang disentuh, tool yang dipakai |
| `memory_search` / `memory_get` | Agent dapat mencari sesi lampau — inilah "memilih sesi mana" |
| `grok --resume <ID_ATAU_JUDUL>` | Melanjutkan sesi tertentu; `-c` melanjutkan yang terakhir |

Ini menjawab permintaan "setelah `/clear` agent masih ingat inti sesi sebelumnya"
tanpa membangun apa pun — cukup dinyalakan.

Catatan privasi: auto-save **tidak** merekam perintah shell (sering memuat token/
API key). `/flush` merekamnya sebagai ringkasan LLM, bukan verbatim.

## 3. Ketegangan yang harus disadari

Menaikkan context membuat compaction **lebih jarang** tetapi **lebih lama tiap
kali**, karena input yang diringkas lebih besar:

```
ctx 131K @80% -> 4,2 menit per compaction
ctx 168K @80% -> 5,0 menit per compaction
ctx 256K @80% -> 6,8 menit per compaction
```

Jadi "naikkan context agar tidak mudah ter-compact" memindahkan biaya, bukan
menghapusnya: lebih sedikit jeda, tetapi tiap jeda lebih panjang.

Yang benar-benar mengurangi **keduanya** hanya satu: **memperkecil transkrip**.
Itu berarti reduksi output tool dan `/flush` di batas tugas — bukan context lebih besar.

## 4. Anggaran VRAM (dari 55.517 MiB terukur)

```
base (bobot, drafter, buffer, state SSM) = 42.461 MiB   <- diperlakukan konstan
KV q8_0 = 34 KiB/token
```

| ctx/user | slot | total ctx | KV | total | % |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 131.072 (sekarang) | 3 | 393.216 | 13.056 | 55.517 | 75,3% |
| 163.840 | 3 | 491.520 | 16.320 | 58.781 | 79,7% |
| **172.032** | **3** | **516.096** | **17.136** | **59.597** | **80,8%** |
| 180.224 | 3 | 540.672 | 17.952 | 60.413 | 81,9% |
| 196.608 | 3 | 589.824 | 19.584 | 62.045 | 84,2% (lewat) |
| 262.144 | 2 | 524.288 | 17.408 | 59.869 | 81,2% |

**Kaveat:** `base` diperlakukan konstan. Prediksi terakhir saya meleset 6,4 poin
karena asumsi serupa. Menaikkan ctx per slot kemungkinan **menambah** compute
buffer, jadi 80,8% adalah batas bawah perkiraan, bukan angka pasti.

## 5. Rencana bertahap

### Fase 0 — tanpa restart, tanpa risiko (lakukan lebih dulu)

```toml
auto_compact_threshold_percent = 80     # dari 72, sesuai permintaan

[memory]
enabled = true
```

Ambang 80% pada ctx 131.072 = 104.858 token; +max_tokens 12.288 = 117.146,
aman di bawah plafon kinerja 128.000.

Ubah alur kerja: **`/flush` di tiap batas tugas**, bukan menunggu ambang.
Ini yang membuat sesi berikutnya mengingat inti tanpa memuat transkrip lama.

### Fase 1 — verifikasi dulu, jangan langsung menaikkan context

Sebelum menaikkan apa pun, buktikan dua hal:

1. Compaction sekarang berapa lama? Prediksi 4,2 menit. Ukur dengan satu sesi
   yang sengaja didorong ke ambang.
2. Apakah tebing >128K masih ada? Tebing itu terukur pada **KV q4_0**, dan
   literatur menyebut q4_0 ~37% lebih lambat dari q8_0 pada context 110K karena
   overhead dequantisasi. Kita sudah pindah ke q8_0, jadi tebingnya mungkin
   sudah hilang — tetapi belum diukur karena plafon 131K mencegahnya.

Tanpa (2), menaikkan ke 168K berarti memasukkan kembali rezim yang dulu runtuh.

### Fase 2 — naikkan context ke 168K per user

Syarat: Fase 1 membuktikan tebing >128K tidak muncul lagi.

```
--parallel 3  --ctx-size 516096      # 3 x 172.032
auto_compact_threshold_percent = 80  # 137.626 token; +12.288 = 149.914 <= 172.032
```

Prediksi 80,8%. Verifikasi wajib setelah start; bila melewati 84%, turunkan ke
163.840 (79,7%).

### Fase 3 — reduksi output tool (pengungkit yang belum disentuh)

Satu-satunya perubahan yang memperkecil frekuensi **dan** durasi compaction.

| Tool | Sekarang | Seharusnya |
| :--- | :--- | :--- |
| shell | seluruh stdout | 200–500 baris inline + artifact |
| git diff | diff penuh | `--stat`, lalu path yang relevan saja |
| test | seluruh log | exit code, jumlah lulus/gagal, nama yang gagal, kutipan error |
| baca berkas | `cat` penuh | rentang baris / simbol |
| search | seluruh hasil | batas jumlah, ekstensi, scope direktori |

Target: rasio token mentah ke inline > 5x.

## 6. Yang TIDAK direkomendasikan

**parallel 2 @ 256K (81,2%).** Menggoda untuk long-task, tetapi dengan 4 developer
berarti dua orang selalu mengantre. Fairness yang Anda minta lebih penting
daripada horizon maksimum untuk satu orang.

**Langsung ke 196.608 (84,2%).** Sudah di ambang atas band sebelum memperhitungkan
pertumbuhan compute buffer.

## 7. Kriteria putusan, ditetapkan sebelum mengukur

| Yang diukur | Lanjut bila | Batalkan bila |
| :--- | :--- | :--- |
| Durasi compaction (Fase 1) | < 6 menit | > 10 menit → kejar Fase 3 dulu |
| TPS pada ctx >128K, 3 slot | > 20 TPS | < 10 TPS → tetap 131K |
| VRAM setelah Fase 2 | <= 84% | > 84% → turun ke 163.840 |
| TPS per user, 3 slot | >= 25 TPS | < 15 TPS → kembali ke 131K |
