# Lohnmonitor Enterprise - Backup Script
# Erstellt Backups der SQLite-Datenbank

param(
    [string]$BackupDir = "C:\Backups\Lohnmonitor"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          LOHNMONITOR ENTERPRISE - BACKUP                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Pfade
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$serverDir = Join-Path $rootDir "server"
$dataDir = Join-Path $serverDir "data"
$dbFile = Join-Path $dataDir "lohnmonitor.db"

# Prüfe ob Datenbank existiert
if (-not (Test-Path $dbFile)) {
    Write-Host "[FEHLER] Datenbank nicht gefunden: $dbFile" -ForegroundColor Red
    exit 1
}

# Backup-Verzeichnis erstellen
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[INFO] Backup-Verzeichnis erstellt: $BackupDir" -ForegroundColor Yellow
}

# Backup erstellen
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path $BackupDir "lohnmonitor_backup_$timestamp.db"

try {
    Copy-Item $dbFile $backupFile -Force
    
    $fileSize = (Get-Item $backupFile).Length / 1KB
    Write-Host "[OK] Backup erstellt: $backupFile" -ForegroundColor Green
    Write-Host "[INFO] Dateigröße: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Gray
    
    # Alte Backups aufräumen (älter als 30 Tage)
    $oldBackups = Get-ChildItem $BackupDir -Filter "lohnmonitor_backup_*.db" | 
                  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
    
    if ($oldBackups) {
        Write-Host ""
        Write-Host "[INFO] Lösche $($oldBackups.Count) alte Backup(s)..." -ForegroundColor Yellow
        $oldBackups | Remove-Item -Force
    }
    
    # Zeige aktuelle Backups
    Write-Host ""
    Write-Host "Aktuelle Backups:" -ForegroundColor Cyan
    Get-ChildItem $BackupDir -Filter "lohnmonitor_backup_*.db" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 5 |
        ForEach-Object {
            $size = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  - $($_.Name) ($size KB)" -ForegroundColor Gray
        }
    
} catch {
    Write-Host "[FEHLER] Backup fehlgeschlagen: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Backup erfolgreich abgeschlossen!" -ForegroundColor Green
