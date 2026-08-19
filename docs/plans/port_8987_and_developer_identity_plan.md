# 📋 Technical Plan: Port 8987 Migration, setup.ps1 Fix & Developer Identity Tracking

> **Status:** APPROVED & READY TO EXECUTE  
> **Branch Target:** `feat/livefeed-history`  
> **Author:** AI Coding Agent (`agy`)  
> **Date:** 2026-08-19  

---

## 1. Executive Summary & Objective
Rencana ini mencakup tiga pembaruan sistem yang saling terintegrasi:
1. **Migrasi Port Publik Tim ke Port `8987`:** Mengonsolidasikan Web Dashboard, API Gateway, dan Health Check ke dalam satu port publik enterprise (`8987`), sementara port `8001` tetap menjadi port privat internal inferensi GPU (`llama.server`).
2. **Perbaikan Total Skrip Onboarding PowerShell (`setup.ps1`):** Memperbaiki galat parsing variable path (`$($env:USERPROFILE)`), here-strings (`@" ... "@`), dan memastikan kompatibilitas penuh dengan Windows PowerShell 5.1+ & PowerShell Core 7+.
3. **Penerapan Developer Identity Tracking:** Menggunakan identitas developer (nickname) via *Authorization Header* (`api_key = "dev-<nickname>"`) sehingga metrik pada **LIVE_FEED** dan **Token Tracker Leaderboard** menampilkan nama developer yang bersangkutan (misal: `lee (192.168.2.45)`), bukan sekadar IP atau `Direct/Unknown`.

---

## 2. Arsitektur Port & Topologi Aliran Data

```
+-----------------------------------------------------------------------------------------+
| HOST SERVER (192.168.2.143)                                                             |
|                                                                                         |
|   [Port 8987] (PUBLIC / TEAM ACCESS) <--------- Laptop Developer (Mac / Linux / Win)    |
|       │                                         - Web UI Dashboard:   http://...:8987/  |
|       │ (Next.js Dashboard & API Gateway)      - Grok Agent Gateway: http://...:8987/api/v1
|       │                                         - Onboarding Health:  http://...:8987/api/health
|       │                                                                                 |
|       ├── 1. Ekstraksi Developer Identity ("dev-lee" -> "lee (192.168.2.45)")           |
|       ├── 2. Daftarkan Sesi Aktif ke File Queue (LIVE_FEED)                             |
|       ├── 3. Sniff Token Chunk & Catat Akumulasi ke SQLite (usage.db)                   |
|       │                                                                                 |
|       ▼ (Forward Request)                                                               |
|   [Port 8001] (PRIVATE / INTERNAL GPU BACKEND)                                          |
|       └── llama.server (Qwen 27B Q8_0 pada 3x RTX 3090, context 131k, Flash Attention) |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Rincian Perubahan File & Komponen

### A. Onboarding & Tooling Scripts

#### 1. `setup.ps1` (Windows PowerShell)
- **Fix Variable Interpolation:** Ganti `$env:USERPROFILE\.grok\bin` menjadi `"$($env:USERPROFILE)\.grok\bin;$($env:LOCALAPPDATA)\Programs\grok\bin"`.
- **Fix Here-String Literal:** Pastikan tag pembuka `@" ` dan penutup `"@` berada di baris baru tanpa indentasi spasi untuk mencegah parser error.
- **Input Developer Nickname:**
  ```powershell
  $DEV_NAME = Read-Host "Masukkan nama/nickname Anda untuk tracking tim (contoh: lee, alex, budi) [default: dev-user]"
  if ([string]::IsNullOrWhiteSpace($DEV_NAME)) { $DEV_NAME = "dev-user" }
  ```
- **Update Default Endpoint:** `$DEFAULT_LAN_ENDPOINT = "http://192.168.2.143:8987/api/v1"`.
- **Update Health Check:** `$HEALTH_URL = $SERVER_URL.TrimEnd('/api/v1').TrimEnd('/v1') + "/api/health"`.
- **Generate Config:** Menulis `api_key = "dev-$DEV_NAME"`.

#### 2. `setup.sh` (Linux & macOS)
- **Input Developer Nickname:**
  ```bash
  read -rp "Masukkan nama/nickname Anda untuk tracking tim (contoh: lee, alex, budi) [default: dev-user]: " DEV_NAME
  DEV_NAME=${DEV_NAME:-dev-user}
  ```
- **Update Default Endpoint:** `DEFAULT_LAN_ENDPOINT="http://192.168.2.143:8987/api/v1"`.
- **Update Health Check:** `HEALTH_URL="${SERVER_URL%/api/v1}/api/health"`.
- **Generate Config:** Menulis `api_key = "dev-${DEV_NAME}"`.

#### 3. `config.default.toml`
- Mengubah template default `base_url` menjadi `http://192.168.2.143:8987/api/v1`.

---

### B. Dashboard & API Gateway

#### 1. `dashboard/package.json`
- Menyetel port `8987` secara eksplisit pada skrip npm:
  ```json
  "scripts": {
    "dev": "next dev -p 8987",
    "build": "next build",
    "start": "next start -p 8987",
    "lint": "next lint"
  }
  ```

#### 2. `dashboard/src/app/api/health/route.ts` [NEW]
- Menyediakan endpoint health check terpadu di port 8987 untuk memvalidasi kesiapan Gateway dan Llama Backend:
  ```typescript
  import { NextResponse } from 'next/server';
  import { checkHealth } from '@/lib/llama-poller';

  export const dynamic = 'force-dynamic';

  export async function GET() {
    const llama = await checkHealth();
    return NextResponse.json({
      status: llama.status === 'ok' ? 'ok' : 'degraded',
      gateway: 'online',
      llama_backend: llama.status
    });
  }
  ```

#### 3. `dashboard/src/app/api/v1/chat/completions/route.ts` & `completions/route.ts`
- Mengekstrak nama developer dari header `Authorization`:
  ```typescript
  const auth = req.headers.get('authorization') || '';
  let devName = '';
  if (auth.startsWith('Bearer dev-')) {
    devName = auth.slice('Bearer dev-'.length).trim();
  } else if (auth.startsWith('Bearer ')) {
    const key = auth.slice('Bearer '.length).trim();
    if (key !== 'sk-internal-team' && key.length > 0) devName = key;
  }

  const clientIdentifier = devName ? `${devName} (${ip})` : ip;

  registerClientIp(clientIdentifier);
  // ... Pada saat pencatatan token:
  logUsage(clientIdentifier, prompt_tokens, completion_tokens, modelName);
  ```

---

### C. Dokumentasi & Topology Guide

#### 1. `README.md` & `dashboard/README.md`
- Memperbarui seluruh referensi URL dan port menjadi `8987`.
- Menyertakan instruksi update untuk developer yang sudah ada (`git pull` lalu jalankan setup script ulang).

---

## 4. Rencana Verifikasi & Validasi

1. **PowerShell Script Parsing Test:**
   - Validasi sintaks `setup.ps1` agar tidak ada lagi `ParserError` atau `UnexpectedToken`.
2. **Next.js Production Build Test:**
   - Menjalankan `npm run build` di direktori `dashboard` untuk memastikan tidak ada kesalahan TypeScript.
3. **Gateway Health Check Verification:**
   - Menguji `curl -s http://127.0.0.1:8987/api/health`.
4. **Developer Identity Simulation Test:**
   - Mengirim request POST dengan header `Authorization: Bearer dev-lee` ke `http://127.0.0.1:8987/api/v1/chat/completions`.
   - Memastikan `usage.db` dan `LIVE_FEED` mencatat `lee (127.0.0.1)` secara tepat.
