# 🧠 CooperxMemory — Autonomous State & Handover Standard

> **Prinsip Dasar:** Terinspirasi arsitektur persistensi memori Claude Code (`CLAUDE.md` ledger) dan Hermes Agent (Semantic State vs Episodic Log Eviction), CooperAgent menerapkan persistensi memori mandiri (**`CooperxMemory`**) untuk menjamin eksekusi *long-task* berjam-jam tanpa amnesia dan tanpa jeda *compaction freeze*.
>
> **Revisi 2026-08-20** — ambang diturunkan 90% → 88%, ditambah bagian `Files Modified`, namespace per developer, pre-compaction cleanup, dan tiga lapis penegakan kepatuhan.

---

## 0. Parameter Operasional (WAJIB sinkron dengan server)

| Parameter | Nilai | Konsekuensi bila salah |
| :--- | :--- | :--- |
| `n_ctx_slot` server | **172.032** (4 slot × 168K) | — |
| `context_window` klien | **172.032** | Klien mengira punya lebih dari yang ada → overflow diam-diam |
| `max_tokens` klien | **12.288** | 🔴 Server memuat `prompt + max_tokens` dalam satu slot. `max_tokens` besar memangkas plafon prompt satu-lawan-satu dan **menyebabkan compaction failed** |
| Ambang handover | **88%** = 151.388 token | — |
| Sisa untuk output saat handover | 20.644 token | Cukup untuk `max_tokens` 12.288 + margin 40% |

**Aritmetika yang harus selalu dipenuhi:**
```
ambang(%) × n_ctx_slot  +  max_tokens  ≤  n_ctx_slot
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

1. Agent **DILARANG** memicu auto-compaction teks mentah. Jedanya ~4,5 menit: prefill ~110 detik ditambah generasi ringkasan ~4.000 token pada ~25 t/s.
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
│    1. Ketik `/clear`                                                        │
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
- Task yang memang butuh working context >151.388 token tetap harus compact di tengah jalan.
