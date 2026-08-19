# 📈 CooperAgent Telemetry Dashboard

Dashboard monitoring dan API Gateway untuk GSPExGrok Agent. Dibangun dengan Next.js 14 (App Router) dan merepresentasikan desain antarmuka murni **Dark Mode Terminal User Interface (TUI)**.

---

## 🎨 UI & Design Topology

Seluruh antarmuka di-build mengikuti spesifikasi ketat di file **[`DESIGN.md`](DESIGN.md)**.
Aturan utamanya meliputi:
- **100% Monospace Font:** (Berkeley Mono / JetBrains Mono).
- **Dark Mode Manpage Layout:** Single column, *high whitespace*, canvas `#201d1d`, ink `#fdfcfc`.
- **No SVG Icons/Emojis:** Murni text-based rendering dan ASCII styling (`[+]`, `[x]`, `████░░`).
- **Data Visualization:** Menggunakan CSS Grid map dan *sparkline* buatan tangan, dirender di dalam *Interactive Modals* agar tampilan tetap *compact*.

---

## 🚀 Instalasi & Menjalankan Dashboard

1. **Masuk ke folder dashboard:**
   ```bash
   cd dashboard
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan Server (Development / Production):**
   ```bash
   npm run dev
   # atau untuk production:
   # npm run build && npm run start
   ```
   *Dashboard dan API Gateway akan aktif di `http://localhost:8987` atau `http://192.168.2.143:8987/`*

---

## 🗺️ Arsitektur & Struktur Direktori

```text
dashboard/
├── DESIGN.md                  # Single Source of Truth untuk standar UI/UX
├── PRD.md                     # Product Requirement Document untuk metrik
├── src/
│   ├── app/
│   │   ├── page.tsx           # Entry point / Main Layout (Single-Column)
│   │   ├── globals.css        # CSS Reset, CSS Variables untuk Dark Mode TUI
│   │   └── api/               # API Routes (Telemetry poller, Chat Proxy)
│   ├── components/
│   │   ├── ui/                # UI Primitive (TuiSection, dll)
│   │   └── ribbon-cards/      # Modul monitoring MVP (GPU, Slots, Live Feed)
│   └── lib/                   # Utility scripts (llama-poller, dll)
```

---

## 📡 API Gateway Proxy (Under Development)

Dashboard ini juga bertindak sebagai API Gateway proxy yang menangkap `Client IP` dari developer yang menggunakan IDE/Terminal, meneruskannya ke `llama-server`, dan merekap utilisasinya.

Endpoint utama:
- `POST /api/v1/chat/completions` (Proxy to Llama.cpp)
- `POST /api/v1/completions` (Proxy to Llama.cpp)
- `GET /api/telemetry/live` (Aggregator endpoint untuk frontend)
