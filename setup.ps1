# ==============================================================================
# Setup Script: CooperAgent (CooperxHarness - Grok Build & Pi Agent)
# Platform: Windows PowerShell Edition (Port 8987 Gateway & 256K Context)
# Repository: https://github.com/LyKhan77/grok-x-team-byLee.git
# ==============================================================================

#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$DEFAULT_LAN_ENDPOINT = "http://192.168.2.143:8987/api/v1"
$DEFAULT_LOCAL_ENDPOINT = "http://127.0.0.1:8987/api/v1"
$DEFAULT_MODEL_NAME = "qwen35"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Prepare ~/.local/bin
$LOCAL_BIN = Join-Path $env:USERPROFILE ".local\bin"
if (-not (Test-Path $LOCAL_BIN)) {
    New-Item -ItemType Directory -Path $LOCAL_BIN -Force | Out-Null
}

# Ensure LOCAL_BIN is in PATH for current session
if ($env:PATH -notmatch [regex]::Escape($LOCAL_BIN)) {
    $env:PATH = "$LOCAL_BIN;$env:PATH"
}

# Ensure LOCAL_BIN is in User Environment PATH permanently
try {
    $userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
    if ($userPath -notmatch [regex]::Escape($LOCAL_BIN)) {
        [Environment]::SetEnvironmentVariable("Path", "$LOCAL_BIN;$userPath", [EnvironmentVariableTarget]::User)
    }
} catch {}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   [+] CooperAgent Multi-Harness Setup (Windows PowerShell)      " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pilihan Coding Agent Harness
Write-Host "Pilih Coding Agent yang ingin dipasang/dikonfigurasi:" -ForegroundColor Yellow
Write-Host "  1) Grok Build (Fullscreen Rust TUI, Visual Diff Viewer) [Rekomendasi]"
Write-Host "  2) Pi Agent (Lightweight Inline CLI Coding Agent) [Alternatif Ringan]"
Write-Host "  3) Keduanya (Grok Build + Pi Agent)"
$AGENT_CHOICE = Read-Host "Pilihan [1/2/3, default: 1]"
if ([string]::IsNullOrWhiteSpace($AGENT_CHOICE)) { $AGENT_CHOICE = "1" }

# 2. Input Identitas Developer
Write-Host ""
Write-Host "--- Identitas Developer (CooperxTelemetry) ---" -ForegroundColor Cyan
$DEV_NAME = Read-Host "Masukkan nama/nickname Anda (contoh: lee, alex, budi, vincent) [default: dev-user]"
if ([string]::IsNullOrWhiteSpace($DEV_NAME)) {
    $DEV_NAME = "dev-user"
}
$DEV_NAME = $DEV_NAME.Trim().ToLower() -replace "[^a-zA-Z0-9_-]", ""
if ([string]::IsNullOrWhiteSpace($DEV_NAME)) { $DEV_NAME = "dev-user" }
Write-Host "[v] Identitas tersimpan: $DEV_NAME" -ForegroundColor Green

# 3. Pilihan Endpoint Server
Write-Host ""
Write-Host "--- Endpoint CooperAgent AI Server ---" -ForegroundColor Cyan
Write-Host "  1) Jaringan LAN Kantor ($DEFAULT_LAN_ENDPOINT) [Rekomendasi Laptop/PC]"
Write-Host "  2) Localhost Server ($DEFAULT_LOCAL_ENDPOINT) [Jika di server AI]"
Write-Host "  3) Custom Endpoint (IP / Domain / VPN Tunnel)"
$choice = Read-Host "Pilihan [1/2/3, default: 1]"

if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "1") {
    $SERVER_URL = $DEFAULT_LAN_ENDPOINT
} elseif ($choice -eq "2") {
    $SERVER_URL = $DEFAULT_LOCAL_ENDPOINT
} else {
    $custom = Read-Host "Masukkan URL Endpoint API (contoh: http://10.8.0.62:8987/api/v1)"
    if ([string]::IsNullOrWhiteSpace($custom)) {
        $SERVER_URL = $DEFAULT_LAN_ENDPOINT
    } else {
        $SERVER_URL = $custom
    }
}

# 4. Test Koneksi ke Server (Health Check)
$BASE_HOST = $SERVER_URL -replace "/api/v1.*$", "" -replace "/v1.*$", ""
$HEALTH_URL = "$BASE_HOST/api/health"
Write-Host ""
Write-Host "Menguji koneksi ke CooperAgent Gateway: $HEALTH_URL..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $HEALTH_URL -TimeoutSec 5 -ErrorAction Stop
    if ($response.status -eq "ok" -or "$response" -match "ok") {
        Write-Host "[v] Koneksi Berhasil! CooperAgent Gateway & GPU Backend aktif & sehat." -ForegroundColor Green
    } else {
        Write-Host "[v] Terhubung ke Gateway." -ForegroundColor Green
    }
} catch {
    Write-Host "[!] Peringatan: Tidak dapat terhubung ke $HEALTH_URL." -ForegroundColor Red
    Write-Host "Pastikan Anda terhubung ke Wi-Fi kantor / VPN dan server AI sedang aktif." -ForegroundColor Yellow
}

# 5. Instalasi & Konfigurasi Grok Build (jika opsi 1 atau 3)
if ($AGENT_CHOICE -eq "1" -or $AGENT_CHOICE -eq "3") {
    Write-Host ""
    Write-Host "--- Mengonfigurasi Grok Build (Rust TUI) ---" -ForegroundColor Cyan
    if (Get-Command "grok" -ErrorAction SilentlyContinue) {
        Write-Host "[v] Grok CLI terdeteksi di sistem." -ForegroundColor Green
    } else {
        Write-Host "Mengunduh installer resmi xAI Grok untuk Windows..." -ForegroundColor Yellow
        try {
            Invoke-Expression (Invoke-RestMethod "https://x.ai/cli/install.ps1")
            $env:PATH += ";$($env:USERPROFILE)\.grok\bin;$($env:LOCALAPPDATA)\Programs\grok\bin"
        } catch {
            Write-Host "[!] Gagal mengunduh installer otomatis. Silakan pasang Grok CLI manual jika diperlukan." -ForegroundColor Red
        }
    }

    $GROK_DIR = Join-Path $env:USERPROFILE ".grok"
    if (-not (Test-Path $GROK_DIR)) {
        New-Item -ItemType Directory -Path $GROK_DIR -Force | Out-Null
    }

    $CONFIG_FILE = Join-Path $GROK_DIR "config.toml"
    $configLines = @(
        "# Auto-generated by CooperAgent Setup Script (Windows Edition)",
        "[cli]",
        "auto_update = false",
        "",
        "[features]",
        "telemetry = false",
        "",
        "[session]",
        "load_envrc = true",
        "",
        "[models]",
        "default = 'internal-qwen'",
        "stream_tool_calls = true",
        "temperature = 1.0",
        "top_p = 0.95",
        "min_p = 0.0",
        "repeat_penalty = 1.0",
        "max_completion_tokens = 12288",
        "max_tokens = 12288",
        "max_output_tokens = 12288",
        "",
        "[model.internal-qwen]",
        "model = '$DEFAULT_MODEL_NAME'",
        "base_url = '$SERVER_URL'",
        "name = 'CooperAgent Qwen 3.8 (27B Q8 - 128K Dedicated)'",
        "description = 'Dedicated 128K Context Window via Port 8987 Gateway'",
        "api_backend = 'chat_completions'",
        "context_window = 131072",
        "max_completion_tokens = 12288",
        "max_tokens = 12288",
        "max_output_tokens = 12288",
        "temperature = 1.0",
        "top_p = 0.95",
        "min_p = 0.0",
        "repeat_penalty = 1.0",
        "presence_penalty = 0.0",
        "api_key = 'dev-$DEV_NAME'"
    )
    $configContent = $configLines -join "`r`n"
    [System.IO.File]::WriteAllText($CONFIG_FILE, $configContent, [System.Text.Encoding]::UTF8)
    Write-Host "[v] Konfigurasi Grok tersimpan di: $CONFIG_FILE" -ForegroundColor Green
}

# 6. Konfigurasi Pi Agent (pi.dev) (jika opsi 2 atau 3)
if ($AGENT_CHOICE -eq "2" -or $AGENT_CHOICE -eq "3") {
    Write-Host ""
    Write-Host "--- Mengonfigurasi Pi Agent (pi.dev) ---" -ForegroundColor Cyan

    # 1. Coba install official pi.dev package via npm jika npm tersedia
    if (Get-Command "npm" -ErrorAction SilentlyContinue) {
        Write-Host "Memeriksa / Menginstall official Pi Agent (@earendil-works/pi-coding-agent)..." -ForegroundColor Yellow
        try {
            npm install -g --ignore-scripts @earendil-works/pi-coding-agent 2>$null
            Write-Host "[v] Official Pi Agent (pi.dev) terpasang via npm." -ForegroundColor Green
        } catch {}
    }

    $PI_AGENT_DIR = Join-Path (Join-Path $env:USERPROFILE ".pi") "agent"
    if (-not (Test-Path $PI_AGENT_DIR)) {
        New-Item -ItemType Directory -Path $PI_AGENT_DIR -Force | Out-Null
    }
    
    $baseV1 = "$BASE_HOST/v1"

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    # A. Write ~/.pi/agent/models.json (Official pi.dev model definition)
    $MODELS_JSON = Join-Path $PI_AGENT_DIR "models.json"
    $modelsObj = [ordered]@{
        providers = [ordered]@{
            cooperagent = [ordered]@{
                name = "CooperAgent In-House"
                baseUrl = $baseV1
                api = "openai-completions"
                apiKey = "dev-$DEV_NAME"
                models = @(
                    [ordered]@{
                        id = $DEFAULT_MODEL_NAME
                        name = "CooperAgent Qwen 3.8 (27B Q8 - 128K)"
                        contextWindow = 131072
                        maxTokens = 12288
                    }
                )
            }
        }
    }
    [System.IO.File]::WriteAllText($MODELS_JSON, ($modelsObj | ConvertTo-Json -Depth 5), $utf8NoBom)

    # B. Write ~/.pi/agent/settings.json (Default model selection for pi.dev)
    $SETTINGS_JSON = Join-Path $PI_AGENT_DIR "settings.json"
    $settingsObj = [ordered]@{
        defaultModel = "cooperagent/$DEFAULT_MODEL_NAME"
    }
    [System.IO.File]::WriteAllText($SETTINGS_JSON, ($settingsObj | ConvertTo-Json -Depth 3), $utf8NoBom)

    Write-Host "[v] Konfigurasi resmi pi.dev tersimpan di: $MODELS_JSON" -ForegroundColor Green

    # Pasang fallback launcher jika binary pi belum terdeteksi
    if (-not (Get-Command "pi" -ErrorAction SilentlyContinue)) {
        $piScript = Join-Path $SCRIPT_DIR "scripts\pi_agent.py"
        if (Test-Path $piScript) {
            $cmdText = "@echo off" + "`r`n" + "python `"$piScript`" %*"
            [System.IO.File]::WriteAllText((Join-Path $LOCAL_BIN "pi.cmd"), $cmdText, [System.Text.Encoding]::ASCII)
            Write-Host "[v] Executable CLI launcher 'pi' terpasang ke PATH." -ForegroundColor Green
        }
    }
}

# 7. Pasang Git Hooks Otomatis (jika git diinisialisasi)
if (Test-Path (Join-Path $SCRIPT_DIR ".git")) {
    $hooksPath = (Join-Path $SCRIPT_DIR "scripts/hooks").Replace("\", "/")
    git config core.hooksPath "$hooksPath" 2>$null
    Write-Host "[v] Git pre-commit secret protection hooks diaktifkan." -ForegroundColor Green
}

# 8. Pasang shortcut standardize untuk Windows
$standardizePy = Join-Path $SCRIPT_DIR "scripts\standardize.py"
if (Test-Path $standardizePy) {
    $cmdText = "@echo off" + "`r`n" + "python `"$standardizePy`" %*"
    [System.IO.File]::WriteAllText((Join-Path $LOCAL_BIN "cooper-standardize.cmd"), $cmdText, [System.Text.Encoding]::ASCII)
    [System.IO.File]::WriteAllText((Join-Path $LOCAL_BIN "grok-standardize.cmd"), $cmdText, [System.Text.Encoding]::ASCII)
    Write-Host "[v] Shortcut cooper-standardize berhasil dipasang." -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "[+] Setup Selesai! Selamat datang di CooperAgent (Windows)!" -ForegroundColor Green
Write-Host "  - Menjalankan Grok:      Ketik 'grok' di PowerShell folder project Anda."
Write-Host "  - Menjalankan Pi Agent:  Ketik 'pi' di PowerShell folder project Anda."
Write-Host "  - Persistensi Memori:    Gunakan CooperxMemory (.agents/memory/session_state.md)."
Write-Host "  - Pantau Dashboard:      Buka http://192.168.2.143:8987/"
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
