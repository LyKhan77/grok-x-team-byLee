# Rencana Implementasi: Fase 4 — Custom Team Coding Rules, Security Guidelines & Hooks

## Goal Description
Membangun standarisasi aturan *software engineering* internal (**Coding Rules & Skills**) yang akan otomatis dipatuhi oleh coding agent (`grok` / `agy` / LLM developer) saat bekerja di repository proyek tim. Standarisasi ini mencakup konvensi arsitektur kode, standar *Conventional Commits*, pedoman privasi dan keamanan data (anti-leak), metodologi *Test-Driven Development* (TDD), serta script *pre-commit hook* untuk menjamin kualitas kode tim.

Semua dokumen rencana dan laporan hasil implementasi disimpan terpusat di folder **`temp/`** di dalam repositori.

---

## User Review Required
> [!NOTE]
> Format aturan disimpan dalam folder standar `.agents/rules/` sehingga dapat dibaca secara otomatis oleh berbagai coding agent (Grok, Antigravity, Cursor, Claude Code, dll) secara agnostik.

> [!IMPORTANT]
> Skrip `scripts/install-hooks.sh` akan disediakan agar setiap developer dapat mengaktifkan hook git pre-commit (validasi format commit dan pencegahan leak API key) hanya dengan satu baris perintah.

---

## Proposed Directory & Architecture

```
gspexgrok-agent/
├── .agents/
│   └── rules/
│       ├── 00-general-engineering.md   # Prinsip dasar clean code, YAGNI, & error handling
│       ├── 01-git-conventions.md        # Standar format commit (feat, fix, refactor) & branch
│       ├── 02-security-privacy.md       # Anti-secret leakage, input sanitization, data privacy
│       ├── 03-testing-standards.md      # Metodologi TDD & pengujian unit/integrasi
│       └── 04-language-guidelines.md    # Standar Python, Rust, dan TypeScript
├── scripts/
│   ├── hooks/
│   │   └── pre-commit                   # Hook validasi format commit & secret scanning
│   └── install-hooks.sh                 # 1-Click installer Git pre-commit hook
└── temp/
    ├── fase4_rules_skills_plan.md       # Salinan rencana implementasi Fase 4
    └── fase4_walkthrough.md             # Walkthrough hasil implementasi
```

---

## Proposed Changes & Files

### Component 1: Team Coding Rules (`.agents/rules/`)

#### [NEW] [.agents/rules/00-general-engineering.md](file:///home/gspe-ai1/project/gspexgrok-agent/.agents/rules/00-general-engineering.md)
Prinsip dasar rekayasa perangkat lunak:
- **YAGNI & Kesederhanaan:** Prioritaskan solusi paling minimal dan andal; hindari over-engineering.
- **Error Handling:** Tidak boleh mengabaikan error (`except: pass` atau `unwrap()` tanpa konteks). Semua error harus informatif.
- **Maintainability:** Penamaan variabel/fungsi eksplisit dan modularitas fungsi tunggal (*Single Responsibility*).

#### [NEW] [.agents/rules/01-git-conventions.md](file:///home/gspe-ai1/project/gspexgrok-agent/.agents/rules/01-git-conventions.md)
Standar versi kontrol tim:
- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, `chore:`.
- **Branch Naming:** `feature/<ticket-id>-<short-name>`, `bugfix/<ticket-id>-<short-name>`, `hotfix/<short-name>`.
- **Atomic Commits:** Setiap commit harus independen dan lulus build.

#### [NEW] [.agents/rules/02-security-privacy.md](file:///home/gspe-ai1/project/gspexgrok-agent/.agents/rules/02-security-privacy.md)
Keamanan & privasi kode:
- **Zero Secrets in Code:** Larangan mutlak menaruh API key, token, private key, atau kata sandi dalam source code (wajib menggunakan environment variables `.env`).
- **Data Sovereignty:** Seluruh inferensi dan pemrosesan kode hanya boleh melalui AI Server internal.
- **Security Best Practices:** Constant-time comparison untuk auth token, parameter binding SQL (anti-injection), dan sanitasi input.

#### [NEW] [.agents/rules/03-testing-standards.md](file:///home/gspe-ai1/project/gspexgrok-agent/.agents/rules/03-testing-standards.md)
Standar pengujian & QA:
- **TDD (Test-Driven Development):** Buat test sebelum implementasi kode fitur/bugfix.
- **Pemisahan Unit & Integration Test:** Unit test harus cepat, terisolasi, dan menggunakan mock untuk network IO eksternal.

#### [NEW] [.agents/rules/04-language-guidelines.md](file:///home/gspe-ai1/project/gspexgrok-agent/.agents/rules/04-language-guidelines.md)
Panduan spesifik bahasa:
- **Python:** Wajib Type Hints (`typing`), Async IO (`asyncio`/`httpx`), formatter `ruff`/`black`.
- **Rust:** Wajib `clippy` clean, pemanfaatan ownership/borrowing secara aman (hindari `unsafe` kecuali terdokumentasi), `cargo test`.
- **TypeScript:** Strict mode enabled, hindari `any` (gunakan `unknown` atau schema validator seperti `zod`).

---

### Component 2: Git Hooks & Automation

#### [NEW] [scripts/hooks/pre-commit](file:///home/gspe-ai1/project/gspexgrok-agent/scripts/hooks/pre-commit)
Script hook bash yang otomatis dijalankan sebelum commit:
- Memeriksa apakah ada secret/token yang tidak sengaja ter-stage (regex detection for AWS keys, private keys, API keys).
- Memeriksa file berbahaya atau file besar yang tidak sengaja masuk ke stage.

#### [NEW] [scripts/install-hooks.sh](file:///home/gspe-ai1/project/gspexgrok-agent/scripts/install-hooks.sh)
Script otomatisasi pemasangan hook ke `.git/hooks/pre-commit`.

---

## Verification Plan

### Automated Tests
1. Verifikasi struktur folder `.agents/rules/` dan kelengkapan 5 file aturan.
2. Uji coba script installer:
   ```bash
   chmod +x scripts/install-hooks.sh
   ./scripts/install-hooks.sh
   ```
3. Uji validasi pre-commit hook terhadap dummy secret untuk memastikan hook memblokir commit yang berisiko.

### Manual Verification
1. Pastikan coding rules dapat dibaca dengan jelas dan komprehensif.
2. Tinjau dokumen rencana di [temp/fase4_rules_skills_plan.md](file:///home/gspe-ai1/project/gspexgrok-agent/temp/fase4_rules_skills_plan.md).
