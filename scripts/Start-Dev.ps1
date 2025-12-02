# Lohnmonitor Enterprise - Start Development Script
# Startet Backend und Frontend gleichzeitig

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          LOHNMONITOR ENTERPRISE v3.0.0                     ║" -ForegroundColor Cyan
Write-Host "║                Development Mode                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Pfade - verwende $PSScriptRoot für zuverlässige Pfadauflösung
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    # Fallback für Kontexte wo $PSScriptRoot nicht verfügbar ist
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
$rootDir = Split-Path -Parent $scriptDir
$serverDir = Join-Path $rootDir "server"
$clientDir = Join-Path $rootDir "client"

# Validiere dass die Pfade existieren
if (-not (Test-Path $serverDir)) {
    Write-Host "[FEHLER] Server-Verzeichnis nicht gefunden: $serverDir" -ForegroundColor Red
    Write-Host "[INFO] Aktuelles Skript-Verzeichnis: $scriptDir" -ForegroundColor Yellow
    Write-Host "[INFO] Ermitteltes Root-Verzeichnis: $rootDir" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $clientDir)) {
    Write-Host "[FEHLER] Client-Verzeichnis nicht gefunden: $clientDir" -ForegroundColor Red
    Write-Host "[INFO] Aktuelles Skript-Verzeichnis: $scriptDir" -ForegroundColor Yellow
    Write-Host "[INFO] Ermitteltes Root-Verzeichnis: $rootDir" -ForegroundColor Yellow
    exit 1
}

# Prüfe ob Node.js installiert ist
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion gefunden" -ForegroundColor Green
} catch {
    Write-Host "[FEHLER] Node.js nicht installiert!" -ForegroundColor Red
    Write-Host "Bitte installiere Node.js von: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Backend starten
if (-not $FrontendOnly) {
    Write-Host ""
    Write-Host "[INFO] Starte Backend..." -ForegroundColor Yellow
    
    # Prüfe ob node_modules existiert
    if (-not (Test-Path (Join-Path $serverDir "node_modules"))) {
        Write-Host "[INFO] Installiere Backend-Dependencies..." -ForegroundColor Yellow
        Push-Location $serverDir
        npm install
        Pop-Location
    }
    
    # Prüfe ob .env existiert
    $envFile = Join-Path $serverDir ".env"
    $envExample = Join-Path $serverDir ".env.example"
    if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
        Copy-Item $envExample $envFile
        Write-Host "[INFO] .env Datei erstellt aus .env.example" -ForegroundColor Yellow
    }
    
    # Prisma generieren und migrieren
    Push-Location $serverDir
    Write-Host "[INFO] Initialisiere Datenbank..." -ForegroundColor Yellow
    npx prisma generate
    npx prisma db push
    
    # Seed wenn Datenbank leer
    npx prisma db seed 2>$null
    Pop-Location
    
    # Backend als Job starten
    if (-not $BackendOnly) {
        $backendJob = Start-Job -ScriptBlock {
            param($dir)
            Set-Location $dir
            node index.js
        } -ArgumentList $serverDir
        Write-Host "[OK] Backend gestartet (Port 5000)" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Starte Backend im Vordergrund..." -ForegroundColor Yellow
        Push-Location $serverDir
        node index.js
        Pop-Location
        exit 0
    }
}

# Frontend starten
if (-not $BackendOnly) {
    Write-Host ""
    Write-Host "[INFO] Starte Frontend..." -ForegroundColor Yellow
    
    # Prüfe ob node_modules existiert
    if (-not (Test-Path (Join-Path $clientDir "node_modules"))) {
        Write-Host "[INFO] Installiere Frontend-Dependencies..." -ForegroundColor Yellow
        Push-Location $clientDir
        npm install
        Pop-Location
    }
    
    # Frontend starten
    Push-Location $clientDir
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " App läuft unter: http://localhost:5173" -ForegroundColor Green
    Write-Host " API Backend:     http://localhost:5000" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
    Write-Host " Login: admin / password" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " Drücke Ctrl+C zum Beenden" -ForegroundColor Gray
    Write-Host ""
    
    # Browser öffnen nach kurzer Verzögerung
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5173"
    
    # Frontend im Vordergrund starten
    npm run dev
    
    Pop-Location
}

# Aufräumen bei Beendigung
if ($backendJob) {
    Stop-Job $backendJob
    Remove-Job $backendJob
}
