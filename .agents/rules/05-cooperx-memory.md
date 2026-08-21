# 🧠 CooperxMemory — Autonomous State & Handover Standard

> **Prinsip Dasar:** Terinspirasi arsitektur persistensi memori Claude Code (`CLAUDE.md` ledger) dan Hermes Agent (Semantic State vs Episodic Log Eviction), CooperAgent menerapkan persistensi memori mandiri (**`CooperxMemory`**) untuk menjamin eksekusi *long-task* berjam-jam tanpa amnesia dan tanpa jeda *compaction freeze*.
>
> **Revisi 2026-08-20** — ambang diturunkan 90% → 88%, ditambah bagian `Files Modified`, namespace per developer, pre-compaction cleanup, dan tiga lapis penegakan kepatuhan.

---

## 0. Parameter Operasional (WAJIB sinkron dengan server)

> **Revisi 2026-08-21 (fase 1)** — `n_ctx` **172.032** (3 slot × 168K), ambang
> handover **88% = 151.388 token**.
>
> Ambang dipilih dari pengukuran, bukan angka bulat. Pertumbuhan context per
> giliran (695 request): median 287, p75 986, **p90 6.421**, p95 17.015 token.
> Margin 88% = 8.356 token menampung 91,5% giliran. Ambang 91% hanya menyisakan
> 3.195 — di bawah p90 — dan **truncation sudah terjadi 2x hari ini** pada
> `n_tokens = 172031`, bukan risiko teoretis.
>
> Menaikkan ambang tidak mempercepat compaction: biayanya didominasi generasi
> (~3.463 token terukur dari checkpoint nyata), bukan prefill. Ambang 80% dan 91%
> sama-sama menghasilkan compaction ~1,4 menit.
>
> Riwayat: pada konfigurasi 4-slot lama TPS per user runtuh ke 3,9, sehingga
> ringkasan 3.463 token memakan ~15 menit. Itu akar "compaction failed".
>
> Lihat `docs/plans/long_task_horizon.md`.

| Parameter | Nilai | Konsekuensi bila salah |
| :--- | :--- | :--- |
| `n_ctx_slot` server | **172.032** (3 slot × 168K) | — |
| `context_window` klien | **172.032** | Klien mengira punya lebih dari yang ada → overflow diam-diam |
| `max_tokens` klien | **12.288** | 🔴 Server memuat `prompt + max_tokens` dalam satu slot. `max_tokens` besar memangkas plafon prompt satu-lawan-satu dan **menyebabkan compaction failed** |
| Ambang handover | **88%** = 151.388 token | Di atas ini, compaction masuk zona lambat |
| Sisa untuk output saat handover | 20.644 token | `max_tokens` 12.288 + margin 8.356 |
| Plafon keras "jangan lewat" | **sedang diukur** | Fase 1 menguji apakah tebing 128.000 masih ada dengan KV q8_0 |

**Aritmetika yang harus selalu dipenuhi:**
```
ambang(%) × n_ctx_slot  +  max_tokens  ≤  n_ctx_slot

88% × 172.032 + 12.288 = 163.676  ≤  172.032   ✔ margin  8.356
85% × 172.032 + 12.288 = 158.515  ≤  172.032   ✔ margin 13.517  ← cadangan bila truncation muncul

Margin harus menampung pertumbuhan satu giliran. Terukur dari 695 request:
median 287, p75 986, p90 6.421, p95 17.015 token. Margin 8.356 menampung 91,5%
giliran; 14,7% giliran menambah >3.000 token, jadi marginnya tidak berlebihan.
```
Melanggar ini menghasilkan HTTP 500 saat compaction, bukan degradasi halus.

---

## 1. Struktur Memori — Dua Lapis

### 1.1 Project Ledger (bersama): `.agents/memory/session_state.md`
State arsitektural yang bertahan lintas developer dan lintas sesi: tujuan, milestone terverifikasi, keputusan teknis, blocker.

### 1.2 Session State (per developer): `.agents/memory/sessions/<dev-id>.md`
State sesi kerja aktif satu developer. `<dev-id>` = identitas dari gateway (`dev-tuf`, `vincent`, …).

> **Kenapa dipisah:** dua developer yang menulis ke satu file akan saling menimpa. Riset memori agent 2026 menyebut *namespace isolation* sebagai syarat wajib saat beberapa agent berbagi memory store.

---

## 2. Struktur Wajib `session_state.md` dan `sessions/<dev-id>.md`

Setiap bagian **wajib diisi atau ditandai kosong secara eksplisit**. Bagian yang dibiarkan hilang dianggap pelanggaran.

```markdown
## Session Intent          # Apa yang sedang dikejar sesi ini, satu paragraf
## Files Modified          # WAJIB path lengkap + status. Lihat §2.1
## Key Decisions           # Keputusan teknis + alasannya, bukan hanya hasilnya
## Milestone / ToDo        # Checklist dengan status eksplisit [x] / [ ] / [~]
## Active Task             # Yang sedang dikerjakan detik ini
## Next Steps              # Langkah konkret berikutnya, bisa dieksekusi tanpa konteks tambahan
## Blockers                # Kosongkan eksplisit dengan "(tidak ada)" bila memang tidak ada
```

### 2.1 `## Files Modified` — bagian paling rawan
Riset compaction 2026 menemukan **semua** metode summarization hanya mencetak skor **2,19–2,45 dari 5,0** dalam melacak file yang dimodifikasi; ringkasan bebas *"silently discard precise technical details"*. Karena itu format ini wajib, bukan opsional:

```markdown
## Files Modified
- `path/lengkap/file.py`      — dibuat    — test: PASS
- `path/lain/module.ts`       — diubah    — test: BELUM
- `scripts/deploy.sh`         — dihapus   — —
```

Path relatif dari root repo, **tidak boleh disingkat**.

---

## 3. Kepatuhan — Tiga Lapis Penegakan

Instruksi teks saja terbukti rapuh. Kepatuhan ditegakkan berlapis, dari yang paling lemah ke paling kuat.

### Lapis 1 — Pemicu eksplisit (disiplin agent)
Agent **WAJIB** memperbarui memori segera setelah **salah satu** kondisi berikut, tanpa menunggu diminta:

1. Satu item di `## Milestone / ToDo` berubah menjadi **selesai** ← *pemicu utama*
2. File dibuat, diubah, atau dihapus **dan** telah diverifikasi (test/lint lulus)
3. Keputusan arsitektural diambil (pilihan library, perubahan kontrak API, pola desain)
4. Blocker ditemukan atau teratasi
5. Context mencapai **88%**
6. Sebelum menjalankan `git commit`

Kondisi-kondisi ini **observable** — tidak ada ruang tafsir seperti "setelah file besar".

### Lapis 2 — Konfirmasi yang terlihat
Setiap kali memori diperbarui, agent **WAJIB** mencetak satu baris di terminal:

```
✓ CooperxMemory: <nama-item-todo> → sessions/<dev-id>.md  (Files Modified: N entri)
```

Baris ini membuat kelalaian **terlihat oleh developer** saat itu juga. Tidak ada baris = tidak ada checkpoint.

### Lapis 3 — Gerbang mekanis (git pre-commit hook)
`scripts/hooks/pre-commit` **menolak commit** bila ada file sumber yang di-stage sementara tidak ada file memori yang ikut diperbarui. Ini satu-satunya lapisan yang tidak bergantung pada kepatuhan model.

Bypass hanya untuk keadaan darurat: `git commit --no-verify` (dan wajib dijelaskan di pesan commit).

---

## 4. Protokol Handover 88%

Ketika context mencapai **88%** (151.388 token) atau developer meminta ringkasan:

1. Auto-compaction adalah jaring pengaman, bukan jalur utama. Durasinya kini ~1,4 menit, tetapi ia terpicu oleh ambang alih-alih batas tugas sehingga meringkas keadaan setengah jadi apa pun yang tertangkap.
2. Agent **WAJIB** menjalankan *pre-compaction cleanup* (§5) lebih dulu.
3. Agent **WAJIB** memperbarui `sessions/<dev-id>.md` dan `session_state.md` hingga 100% mutakhir.
4. Agent **WAJIB** mengeluarkan Handover Card:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠️  CooperxMemory: Context 88% (151.388 / 172.032)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Progres tersimpan di `.agents/memory/sessions/<dev-id>.md`                   │
│                                                                             │
│ ✅ Selesai      : [item ToDo yang sudah [x]]                                │
│ 📝 File diubah  : [jumlah entri di Files Modified]                          │
│ 🔄 Sedang jalan : [Active Task]                                             │
│ 📋 Berikutnya   : [Next Steps]                                              │
│ 🚧 Blocker      : [Blockers, atau "(tidak ada)"]                            │
│                                                                             │
│ 💡 LANJUTKAN DENGAN CONTEXT BERSIH (~1 detik, bukan ~4,5 menit):            │
│    1. Ketik `/new`                                                        │
│    2. Ketik: "Lanjutkan session_state.md"                                   │
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

## 6. Rehydration 0-Token

Saat developer membuka sesi baru dan mengetik *"Lanjutkan session_state.md"* atau *"Lanjutkan tugas"*:

1. Agent membaca `.agents/memory/sessions/<dev-id>.md` lalu `.agents/memory/session_state.md` (~1.000–1.500 token).
2. Agent **WAJIB** mengonfirmasi apa yang dipahaminya sebelum melanjutkan — satu ringkasan 3 baris: Active Task, Next Steps, Blockers. Ini mencegah melanjutkan dari state yang basi tanpa disadari.
3. Sesi berjalan dengan context bersih tanpa ampas log lama.

---

## 7. Episodic vs Semantic Eviction

* **Episodic (dibuang):** ratusan baris build log, traceback lama yang sudah teratasi, raw screenshot yang sudah diverifikasi, pembacaan file berulang.
* **Semantic (dipertahankan):** interface tipe data, kontrak API, status unit test, path file lengkap, keputusan arsitektural beserta alasannya.

---

## 8. Batasan yang Diketahui

Jujur soal apa yang **belum** terpecahkan:

- Ekstraksi lintas-sesi masih heuristik. Riset 2026: *"identifying what from session N should persist to session N+1 remains heuristic"* — belum ada solusi matang di industri.
- Lapis 1 dan 2 tetap bergantung pada kepatuhan model. Hanya Lapis 3 yang mekanis, dan itu hanya menggigit saat commit.
- Task yang butuh working context >151.388 token harus dipecah lewat rantai sesi (§9), bukan dipaksakan dalam satu context.

---

## 9. Rantai Sesi (diadaptasi dari Hermes Agent)

Hermes tidak memperlakukan sesi panjang sebagai satu context yang terus tumbuh.
Sesi **dipecah** menjadi induk dan anak, dengan alasan pemecahan dicatat eksplisit
(`end_reason = 'compression'`), sehingga rantai sesi bisa ditelusuri balik.

Kita adaptasi: setiap sesi punya header di `sessions/<dev-id>.md`.

```markdown
## Sesi 2026-08-21-b
Induk      : 2026-08-21-a
Alasan     : ambang 88%          # 88%-threshold | task-boundary | manual | crash
Task aktif : Deploy config parallel 3
```

Aturan:

1. **Rantai tidak boleh putus.** Sesi baru yang melanjutkan pekerjaan WAJIB mengisi
   `Induk`. Sesi yang benar-benar baru mengisi `Induk: (tidak ada)`.
2. **Alasan wajib eksplisit.** `task-boundary` adalah yang sehat; `88%-threshold`
   yang sering muncul menandakan disiplin §10 gagal.
3. **Rehydration hanya membaca sesi terakhir**, bukan seluruh rantai. Rantai
   ditelusuri hanya saat menjawab "kenapa dulu diputuskan begini".

---

## 10. Compact di Batas Tugas, Bukan di Ambang (diadaptasi dari Command Code)

> "The best time to run compaction is before auto-compact fires — at a task
> boundary or right after a conclusion is reached, because compacting at a moment
> you choose gives the summarizer a clean story to compress, instead of whatever
> mid-task state the threshold happens to catch."

Ambang 88% adalah **jaring pengaman**, bukan jadwal. Agent WAJIB menawarkan
handover pada setiap batas tugas alami, berapa pun context saat itu:

* Sebuah milestone/ToDo berpindah ke `[x]`
* Sebuah bug selesai diverifikasi
* Sebuah keputusan arsitektural diambil dan dicatat
* Sebelum memulai investigasi besar yang akan menyedot banyak file

Alasannya bukan penghematan token, melainkan **kualitas ringkasan**: meringkas di
tengah investigasi menghasilkan ringkasan tentang keadaan setengah jadi, dan sesi
berikutnya mewarisi kebingungan itu.

Metrik kesehatan harness: **proporsi handover dengan alasan `task-boundary`.**
Bila `88%-threshold` mendominasi, harness gagal meski tidak pernah error.

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
  2. Project ledger (session_state.md)
  3. Checkpoint sesi (sessions/<dev-id>.md)

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

## 12. Batas Keras Memori (diadaptasi dari Hermes Agent)

Hermes membatasi memori always-on secara keras dan **mengembalikan error alih-alih
membuang entri diam-diam**. Kita adopsi prinsip gagal-berisik itu.

| Berkas | Batas | Bila terlampaui |
| :--- | ---: | :--- |
| `sessions/<dev-id>.md` | 400 baris | Arsipkan ke `sessions/archive/<dev-id>-<tanggal>.md`, sisakan sesi terakhir |
| `session_state.md` | 250 baris | Pangkas §Key Decisions yang sudah masuk `docs/plans/` |

Agent **DILARANG** memangkas isi memori diam-diam agar muat. Bila batas terlampaui,
agent WAJIB mengatakannya kepada developer dan meminta keputusan apa yang diarsipkan.
Memori yang menyusut tanpa sepengetahuan pemiliknya lebih berbahaya daripada
memori yang penuh.
