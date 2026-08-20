# 🧠 CooperxMemory — Autonomous State & Handover Standard

> **Prinsip Dasar:** Terinspirasi dari arsitektur persistensi memori Claude Code (`CLAUDE.md` ledger) dan Hermes Agent (Semantic State vs Episodic Log Eviction), CooperAgent menerapkan sistem persistensi memori mandiri (**`CooperxMemory`**) untuk menjamin eksekusi *long-task* berjam-jam tanpa amnesia dan tanpa jeda *compaction freeze*.

---

## 1. Continuous State Checkpointing (`.agents/memory/session_state.md`)
1. Setiap kali agent menyelesaikan pembuatan/modifikasi file besar atau menjalankan unit test, agent **wajib** mencatat status terbaru ke file fisik:
   📁 `.agents/memory/session_state.md` (dan checklist `plan.md` di root proyek).
2. **Struktur Wajib `session_state.md`:**
   * **`## 1. Goal Utama & Arsitektur`**: Deskripsi ringkas apa yang sedang dibangun.
   * **`## 2. Milestone yang Telah Selesai`**: Daftar file yang telah dibuat, fungsi utama, dan status pengujian (`PASS`/`FAIL`).
   * **`## 3. Active Task in Progress`**: File/fungsi yang sedang dikerjakan saat ini beserta detail teknis penting.
   * **`## 4. Remaining Checklist`**: Sisa item checklist dari `plan.md`.

---

## 2. 90% Context Limit Warning & Handover Card Protocol
Ketika context session mencapai ambang batas **90%** (atau saat developer meminta ringkasan sesi):
1. Agent **DILARANG KERAS** memicu proses auto-compaction teks mentah 119K token.
2. Agent **WAJIB** memperbarui file `.agents/memory/session_state.md` hingga 100% mutakhir.
3. Agent **WAJIB** mengeluarkan **Handover Card** di antarmuka terminal/chat:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ CooperxMemory NOTICE: Context 90% Reached                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Seluruh progres kerja telah tersimpan aman di `.agents/memory/session_state.md` │
│                                                                             │
│ ✅ Selesai: [Daftar ringkas file & test yang sudah lulus]                   │
│ 🔄 Sedang Berjalan: [Modul yang sedang aktif dikerjakan]                    │
│ 📋 Sisa Tugas: [Checklist berikutnya di plan.md]                            │
│                                                                             │
│ 💡 CARA MELANJUTKAN DENGAN CONTEXT BERSIH (0 TOKEN):                        │
│ 1. Ketik `/clear` di terminal agent                                         │
│ 2. Ketik: "Lanjutkan session_state.md"                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Instant 0-Token Rehydration Protocol
Saat developer membuka sesi baru dan mengetik *"Lanjutkan session_state.md"* atau *"Lanjutkan tugas"*:
1. Agent cukup membaca satu file `.agents/memory/session_state.md` dan `plan.md` (~1.000–1.500 token).
2. Agent langsung memiliki pemahaman penuh (*100% Situational Awareness*) dalam waktu **<1 detik**.
3. Sesi berjalan dengan context bersih (0 token ampas log lama), memastikan kecepatan generasi maksimal (**27–45 TPS**) dan akurasi logika tertinggi.

---

## 4. Episodic vs Semantic Eviction
* **Episodic Data (Dibersihkan):** Output ratusan baris build log, traceback terminal lama, dan raw screenshot yang sudah diverifikasi tidak perlu disimpan di memori permanen.
* **Semantic State (Dipertahankan):** Interface tipe data, API contract, status unit test, dan path file wajib tersimpan di `.agents/memory/session_state.md`.
