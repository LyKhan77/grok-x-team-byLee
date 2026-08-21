# 🧠 Disiplin Context — Standar CooperxCompute

> **Revisi 2026-08-21** — Berkas memori per-sesi di repo (`.agents/memory/`)
> **dihapus**. State sesi bersifat lokal per mesin: Grok CLI menyimpannya di
> `~/.grok/memory/` dan `~/.grok/sessions/`, dan mencarinya otomatis pada
> giliran pertama tiap sesi. Menyalinnya ke git hanya menghasilkan sumber
> kebenaran kedua yang cepat basi.
>
> Yang wajib terbagi lewat git hanya tiga: `AGENTS.md` (instruksi kerja),
> `CHANGELOG.md` (apa yang berubah + bukti), dan `docs/plans/` (analisis dan
> alasan keputusan). Lihat [`docs/harness_scope.md`](../../docs/harness_scope.md).
>
> Dokumen ini kini hanya mengatur **disiplin context**: ambang, penghematan
> token, dan kapan menyerahkan pekerjaan ke sesi berikutnya.

## 0. Parameter Operasional (WAJIB sinkron dengan server)

> **Revisi 2026-08-21 (rollback)** — `n_ctx` **131.072** (3 slot × 128K), ambang
> handover **85% = 111.411 token**.
>
> Percobaan menaikkan ke 168K dibatalkan. Pada 3 slot, jendela 300 detik yang
> gagal memenuhi 11,4 TPS melonjak dari **1,4% menjadi 29,2%**, dan p10 jatuh
> dari 11,2 ke 2,2 TPS. Horizon lebih panjang tidak berguna bila compaction gagal
> tiga dari sepuluh kali.
>
> Ambang 85% dipilih dari batas margin, bukan angka bulat: margin harus menampung
> pertumbuhan satu giliran (p90 = 6.421 token). Pada `n_ctx` 131.072, ambang
> maksimum yang memenuhi syarat itu adalah **85,7%**; 88% hanya menyisakan 3.441.
>
> **Batas keras yang menentukan segalanya:** Grok membatalkan compaction setelah
> **300 detik wall-clock** per percobaan, tiga percobaan per permintaan —
> `"compact failed: exceeded wall-clock budget 300s (runaway generation)"`.
> Ringkasan terukur 3.422 token, jadi throughput minimum adalah **11,4 TPS**.
> Di bawah itu compaction mustahil selesai berapa kali pun diulang, dan tiga
> kegagalan berturut membuang 15 menit. Itulah akar "compaction failed".
>
> Verifikasi dengan `bash scripts/compaction_audit.sh`.

| Parameter | Nilai | Konsekuensi bila salah |
| :--- | :--- | :--- |
| `n_ctx_slot` server | **131.072** (3 slot × 128K) | — |
| `context_window` klien | **131.072** | Klien mengira punya lebih dari yang ada → overflow diam-diam |
| `max_tokens` klien | **12.288** | 🔴 Server memuat `prompt + max_tokens` dalam satu slot. `max_tokens` besar memangkas plafon prompt satu-lawan-satu dan **menyebabkan compaction failed** |
| Ambang handover | **85%** = 111.411 token | Di atas ini, compaction masuk zona lambat |
| Sisa untuk output saat handover | 19.661 token | `max_tokens` 12.288 + margin 7.373 |
| Plafon keras "jangan lewat" | **sedang diukur** | Fase 1 menguji apakah tebing 128.000 masih ada dengan KV q8_0 |

**Aritmetika yang harus selalu dipenuhi:**
```
ambang(%) × n_ctx_slot  +  max_tokens  ≤  n_ctx_slot

85% × 131.072 + 12.288 = 123.699  ≤  131.072   ✔ margin  7.373
80% × 131.072 + 12.288 = 117.146  ≤  131.072   ✔ margin 13.927  ← cadangan bila truncation muncul

Ambang maksimum agar margin tetap >= p90 (6.421) adalah **85,7%**. Angka 88%
hanya menyisakan 3.441 — di bawah p90, jadi truncation akan jadi rutin.

Margin harus menampung pertumbuhan satu giliran. Terukur dari 695 request:
median 287, p75 986, p90 6.421, p95 17.015 token. Margin 8.356 menampung 91,5%
giliran; 14,7% giliran menambah >3.000 token, jadi marginnya tidak berlebihan.
```
Melanggar ini menghasilkan HTTP 500 saat compaction, bukan degradasi halus.

---

## 3. Kepatuhan — gerbang mekanis

Satu-satunya lapisan yang tidak bergantung pada kepatuhan model adalah
`scripts/hooks/pre-commit`: commit yang mengubah kode tetapi tidak menyentuh
`CHANGELOG.md` atau `docs/` akan **ditolak**.

Lapisan lain (instruksi di `AGENTS.md`, tawaran handover di batas tugas)
bergantung pada model dan bisa terlewat. Itu keterbatasan yang diketahui,
bukan sesuatu yang sudah terpecahkan.

## 4. Protokol Handover 85%

Ketika context mencapai **85%** (111.411 token) atau developer meminta ringkasan:

1. Auto-compaction adalah jaring pengaman, bukan jalur utama. Durasinya kini ~1,4 menit, tetapi ia terpicu oleh ambang alih-alih batas tugas sehingga meringkas keadaan setengah jadi apa pun yang tertangkap.
2. Agent **WAJIB** menjalankan *pre-compaction cleanup* (§5) lebih dulu.
3. Agent **WAJIB** memperbarui `CHANGELOG.md`, dan `docs/plans/<slug>.md` bila sedang mengerjakan task panjang.
4. Agent **WAJIB** mengeluarkan Handover Card:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠️  CooperxMemory: Context 85% (111.411 / 131.072)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Progres tersimpan di `docs/plans/<slug>.md` + CHANGELOG.md                   │
│                                                                             │
│ ✅ Selesai      : [item ToDo yang sudah [x]]                                │
│ 📝 File diubah  : [jumlah entri di Files Modified]                          │
│ 🔄 Sedang jalan : [Active Task]                                             │
│ 📋 Berikutnya   : [Next Steps]                                              │
│ 🚧 Blocker      : [Blockers, atau "(tidak ada)"]                            │
│                                                                             │
│ 💡 LANJUTKAN DENGAN CONTEXT BERSIH (~1 detik, bukan ~4,5 menit):            │
│    1. Ketik `/new`                                                        │
│    2. Ketik: "Lanjutkan docs/plans/<slug>.md"                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Auto-compact adalah jaring pengaman, bukan jalur utama.** Handover + rehydration menelan ~1.000–1.500 token (≈1 detik); inline compaction menelan ~4,5 menit. Bila auto-compact menyala, itu tanda handover terlewat.

---

## 5. Pre-Compaction Cleanup (deterministik, sebelum handover)

Menghemat **15–30% token tanpa kehilangan informasi**. Dilakukan sebelum handover atau compaction:

| Aksi | Aturan |
| :--- | :--- |
| **Dedup pembacaan file** | Bila file yang sama dibaca N kali, simpan hanya pembacaan terakhir. Ganti yang lama dengan `[deduplicated: <timestamp>]` |
| **Buang error yang teratasi** | Bila tool call berikutnya atas target yang sama berhasil, buang pesan error sebelumnya |
| **Kanonikalisasi output** | JSON → compact-JSON; stacktrace → 20 baris pertama + 5 baris terakhir |
| **Buang log build lama** | Output build/test yang sudah diverifikasi lulus tidak perlu disimpan mentah |

---

## 7. Episodic vs Semantic Eviction

* **Episodic (dibuang):** ratusan baris build log, traceback lama yang sudah teratasi, raw screenshot yang sudah diverifikasi, pembacaan file berulang.
* **Semantic (dipertahankan):** interface tipe data, kontrak API, status unit test, path file lengkap, keputusan arsitektural beserta alasannya.

---

## 8. Batasan yang Diketahui

Jujur soal apa yang **belum** terpecahkan:

- Ekstraksi lintas-sesi masih heuristik. Riset 2026: *"identifying what from session N should persist to session N+1 remains heuristic"* — belum ada solusi matang di industri.
- Lapis 1 dan 2 tetap bergantung pada kepatuhan model. Hanya Lapis 3 yang mekanis, dan itu hanya menggigit saat commit.
- Task yang butuh working context >111.411 token harus dipecah lewat rantai sesi (§9), bukan dipaksakan dalam satu context.

---

## 10. Compact di Batas Tugas, Bukan di Ambang (diadaptasi dari Command Code)

> "The best time to run compaction is before auto-compact fires — at a task
> boundary or right after a conclusion is reached, because compacting at a moment
> you choose gives the summarizer a clean story to compress, instead of whatever
> mid-task state the threshold happens to catch."

Ambang 85% adalah **jaring pengaman**, bukan jadwal. Agent WAJIB menawarkan
handover pada setiap batas tugas alami, berapa pun context saat itu:

* Sebuah milestone/ToDo berpindah ke `[x]`
* Sebuah bug selesai diverifikasi
* Sebuah keputusan arsitektural diambil dan dicatat
* Sebelum memulai investigasi besar yang akan menyedot banyak file

Alasannya bukan penghematan token, melainkan **kualitas ringkasan**: meringkas di
tengah investigasi menghasilkan ringkasan tentang keadaan setengah jadi, dan sesi
berikutnya mewarisi kebingungan itu.

Metrik kesehatan harness: **proporsi handover dengan alasan `task-boundary`.**
Bila `85%-threshold` mendominasi, harness gagal meski tidak pernah error.

---

## 11. Stabilitas Prefix — jangan rusak prompt cache

Terukur di server ini: prefill median hanya **238 token** per request karena KV
per slot dipakai ulang. Tetapi **8 request (2,2%) dengan prefill >20K menyumbang
72,3% dari seluruh beban prefill**, puncaknya 151.712 token — sesi yang kehilangan
prefix-nya dan harus diproses ulang dari nol.

Prefix cache hanya bertahan selama **awal prompt tidak berubah satu byte pun**.
Karena itu urutan context bersifat wajib, bukan selera:

```
[ STABIL — jangan diubah di tengah sesi ]
  1. System prompt + rules
  2. Rencana task bila ada (docs/plans/<slug>.md)

[ VOLATIL — hanya boleh tumbuh di bagian bawah ]
  4. File yang sedang dibaca
  5. Percakapan kerja
```

Aturan:

1. **Jangan menyisipkan apa pun di atas.** Menambahkan satu baris di ledger
   membatalkan cache seluruh prompt di bawahnya — biaya prefill 100K token.
2. **Perbarui ledger di akhir sesi atau saat handover**, bukan setiap milestone
   di tengah sesi, kecuali memang sedang handover.
3. **Jangan resume context lama** untuk melanjutkan tugas; mulai sesi bersih lalu
   baca checkpoint. Resume memaksa prefill penuh — itulah 72,3% beban prefill.

---

