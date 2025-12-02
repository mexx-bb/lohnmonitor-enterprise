<#
.SYNOPSIS
    Lohnmonitor Enterprise - Vollständiges Setup-Skript
    
.DESCRIPTION
    Dieses PowerShell-Skript führt die vollständige Installation von
    Lohnmonitor Enterprise durch, nachdem die Dateien bereits heruntergeladen wurden.
    Es installiert Node.js (falls nötig), Dependencies, und konfiguriert das System.
    
.NOTES
    Version:        3.0.0
    Autor:          Mexx-BB
    Erstellung:     2025
    Voraussetzung:  Windows 10/11 oder Windows Server 2019+
    
.EXAMPLE
    # In PowerShell als Administrator ausführen:
    .\setup-lohnmonitor-full-v3.ps1
#>

#Requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter(HelpMessage = "Überspringt die Node.js-Installation")]
    [switch]$SkipNodeInstall,
    
    [Parameter(HelpMessage = "Automatische Installation ohne Bestätigung")]
    [switch]$Unattended
)

# ============================================================================
# KONFIGURATION
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# Pfade - verwende $PSScriptRoot für zuverlässige Pfadauflösung
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    # Fallback für Kontexte wo $PSScriptRoot nicht verfügbar ist
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
$RootDir = $ScriptDir
$ServerDir = Join-Path $RootDir "server"
$ClientDir = Join-Path $RootDir "client"

# Farben
$ColorSuccess = "Green"
$ColorError = "Red"
$ColorWarning = "Yellow"
$ColorInfo = "Cyan"
$ColorHeader = "Magenta"

# Node.js Download URL
$NodeJsUrl = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi"

# ============================================================================
# HILFSFUNKTIONEN
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $ColorHeader
    Write-Host "║  $Text" -ForegroundColor $ColorHeader
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $ColorHeader
    Write-Host ""
}

function Write-Step {
    param([string]$Text)
    Write-Host "[SCHRITT] $Text" -ForegroundColor $ColorInfo
}

function Write-Success {
    param([string]$Text)
    Write-Host "[OK] $Text" -ForegroundColor $ColorSuccess
}

function Write-Warn {
    param([string]$Text)
    Write-Host "[WARNUNG] $Text" -ForegroundColor $ColorWarning
}

function Write-Err {
    param([string]$Text)
    Write-Host "[FEHLER] $Text" -ForegroundColor $ColorError
}

function Write-Info {
    param([string]$Text)
    Write-Host "[INFO] $Text" -ForegroundColor $ColorInfo
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Confirm-Continue {
    param([string]$Message = "Fortfahren?")
    
    if ($Unattended) {
        return $true
    }
    
    $response = Read-Host "$Message (J/N)"
    return $response -match "^[jJyY]"
}

# ============================================================================
# INSTALLATIONS-FUNKTIONEN
# ============================================================================

function Test-NodeInstalled {
    try {
        $nodeVersion = & node --version 2>$null
        if ($nodeVersion) {
            Write-Success "Node.js $nodeVersion ist installiert"
            return $true
        }
    }
    catch {
        # Node.js nicht gefunden
    }
    return $false
}

function Install-NodeJs {
    Write-Step "Installiere Node.js..."
    
    $tempDir = Join-Path $env:TEMP "lohnmonitor-setup"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }
    
    $msiPath = Join-Path $tempDir "node-installer.msi"
    
    Write-Info "Lade Node.js herunter von $NodeJsUrl..."
    
    try {
        # TLS 1.2 für HTTPS
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        # Download
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($NodeJsUrl, $msiPath)
        
        Write-Success "Node.js heruntergeladen"
        
        Write-Info "Installiere Node.js (dauert ca. 2-3 Minuten)..."
        
        # Installation mit msiexec
        $arguments = "/i `"$msiPath`" /qn /norestart"
        $process = Start-Process msiexec -ArgumentList $arguments -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Success "Node.js erfolgreich installiert"
            
            # PATH aktualisieren
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            
            return $true
        }
        else {
            Write-Err "Node.js Installation fehlgeschlagen (Exit Code: $($process.ExitCode))"
            return $false
        }
    }
    catch {
        Write-Err "Fehler beim Node.js Download/Installation: $_"
        return $false
    }
    finally {
        if (Test-Path $msiPath) {
            Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
        }
    }
}

function Install-Dependencies {
    Write-Step "Installiere Abhängigkeiten..."
    
    try {
        # Server Dependencies
        if (Test-Path (Join-Path $ServerDir "package.json")) {
            Write-Info "Installiere Server-Dependencies..."
            Push-Location $ServerDir
            
            $npmOutput = & npm install 2>&1
            $npmExitCode = $LASTEXITCODE
            Pop-Location
            
            if ($npmExitCode -ne 0) {
                Write-Err "npm install für Server fehlgeschlagen (Exit Code: $npmExitCode)"
                Write-Host $npmOutput -ForegroundColor Gray
                return $false
            }
            Write-Success "Server-Dependencies installiert"
        }
        else {
            Write-Warn "server/package.json nicht gefunden"
        }
        
        # Client Dependencies
        if (Test-Path (Join-Path $ClientDir "package.json")) {
            Write-Info "Installiere Client-Dependencies..."
            Push-Location $ClientDir
            
            $npmOutput = & npm install 2>&1
            $npmExitCode = $LASTEXITCODE
            Pop-Location
            
            if ($npmExitCode -ne 0) {
                Write-Err "npm install für Client fehlgeschlagen (Exit Code: $npmExitCode)"
                Write-Host $npmOutput -ForegroundColor Gray
                return $false
            }
            Write-Success "Client-Dependencies installiert"
        }
        else {
            Write-Warn "client/package.json nicht gefunden"
        }
        
        return $true
    }
    catch {
        Write-Err "Fehler bei der Installation der Abhängigkeiten: $_"
        return $false
    }
}

function Initialize-Database {
    Write-Step "Initialisiere Datenbank..."
    
    try {
        # Erstelle .env falls nicht vorhanden
        $envPath = Join-Path $ServerDir ".env"
        $envExamplePath = Join-Path $ServerDir ".env.example"
        
        if (-not (Test-Path $envPath) -and (Test-Path $envExamplePath)) {
            Copy-Item $envExamplePath $envPath
            Write-Info ".env Datei aus Vorlage erstellt"
        }
        
        # Erstelle data-Verzeichnis
        $dataDir = Join-Path $ServerDir "data"
        if (-not (Test-Path $dataDir)) {
            New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
            Write-Info "Data-Verzeichnis erstellt"
        }
        
        # Prisma Setup
        Push-Location $ServerDir
        
        Write-Info "Generiere Prisma Client..."
        $prismaGenerate = & npx prisma generate 2>&1
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            Write-Err "Prisma generate fehlgeschlagen"
            Write-Host $prismaGenerate -ForegroundColor Gray
            return $false
        }
        
        Write-Info "Führe Datenbank-Migrationen aus..."
        $prismaDb = & npx prisma db push 2>&1
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            Write-Err "Prisma db push fehlgeschlagen"
            Write-Host $prismaDb -ForegroundColor Gray
            return $false
        }
        
        Write-Info "Seed Datenbank..."
        # Seed is optional and may fail if already seeded
        $prismaSeed = & npx prisma db seed 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Info "Seed übersprungen (bereits vorhanden oder nicht konfiguriert)"
        }
        
        Pop-Location
        
        Write-Success "Datenbank initialisiert"
        return $true
    }
    catch {
        Write-Err "Fehler bei der Datenbank-Initialisierung: $_"
        return $false
    }
}

function Set-FirewallRules {
    Write-Step "Konfiguriere Firewall..."
    
    try {
        # Port 5000 für Backend
        $ruleName5000 = "Lohnmonitor Enterprise - Backend (Port 5000)"
        $existingRule5000 = Get-NetFirewallRule -DisplayName $ruleName5000 -ErrorAction SilentlyContinue
        
        if (-not $existingRule5000) {
            New-NetFirewallRule -DisplayName $ruleName5000 -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000 | Out-Null
            Write-Info "Firewall-Regel für Port 5000 erstellt"
        }
        else {
            Write-Info "Firewall-Regel für Port 5000 existiert bereits"
        }
        
        # Port 5173 für Frontend
        $ruleName5173 = "Lohnmonitor Enterprise - Frontend (Port 5173)"
        $existingRule5173 = Get-NetFirewallRule -DisplayName $ruleName5173 -ErrorAction SilentlyContinue
        
        if (-not $existingRule5173) {
            New-NetFirewallRule -DisplayName $ruleName5173 -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 | Out-Null
            Write-Info "Firewall-Regel für Port 5173 erstellt"
        }
        else {
            Write-Info "Firewall-Regel für Port 5173 existiert bereits"
        }
        
        Write-Success "Firewall konfiguriert"
        return $true
    }
    catch {
        Write-Warn "Firewall-Konfiguration fehlgeschlagen: $_"
        Write-Info "Manuelle Firewall-Konfiguration möglicherweise erforderlich"
        return $true  # Nicht kritisch
    }
}

function New-Shortcuts {
    Write-Step "Erstelle Verknüpfungen..."
    
    $desktop = [Environment]::GetFolderPath("Desktop")
    $startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Lohnmonitor"
    
    try {
        # Start-Menu Ordner erstellen
        if (-not (Test-Path $startMenu)) {
            New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
        }
        
        $WshShell = New-Object -ComObject WScript.Shell
        
        # Desktop: Start Lohnmonitor
        $shortcut = $WshShell.CreateShortcut("$desktop\Start Lohnmonitor.lnk")
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$RootDir\scripts\Start-Dev.ps1`""
        $shortcut.WorkingDirectory = $RootDir
        $shortcut.Description = "Starte Lohnmonitor Enterprise"
        $shortcut.WindowStyle = 1
        $shortcut.Save()
        Write-Info "Desktop-Verknüpfung 'Start Lohnmonitor' erstellt"
        
        # Desktop: Backup Lohnmonitor
        $shortcut = $WshShell.CreateShortcut("$desktop\Backup Lohnmonitor.lnk")
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$RootDir\scripts\Backup-Lohnmonitor.ps1`""
        $shortcut.WorkingDirectory = $RootDir
        $shortcut.Description = "Erstelle Datenbank-Backup"
        $shortcut.WindowStyle = 1
        $shortcut.Save()
        Write-Info "Desktop-Verknüpfung 'Backup Lohnmonitor' erstellt"
        
        # Desktop: Browser öffnen
        $shortcut = $WshShell.CreateShortcut("$desktop\Lohnmonitor Browser.lnk")
        $shortcut.TargetPath = "http://localhost:5173"
        $shortcut.Description = "Öffne Lohnmonitor im Browser"
        $shortcut.Save()
        Write-Info "Desktop-Verknüpfung 'Lohnmonitor Browser' erstellt"
        
        # Start-Menu: Start Lohnmonitor
        $shortcut = $WshShell.CreateShortcut("$startMenu\Start Lohnmonitor.lnk")
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$RootDir\scripts\Start-Dev.ps1`""
        $shortcut.WorkingDirectory = $RootDir
        $shortcut.Description = "Starte Lohnmonitor Enterprise"
        $shortcut.WindowStyle = 1
        $shortcut.Save()
        Write-Info "Start-Menu-Verknüpfung erstellt"
        
        # Start-Menu: Backup
        $shortcut = $WshShell.CreateShortcut("$startMenu\Backup erstellen.lnk")
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$RootDir\scripts\Backup-Lohnmonitor.ps1`""
        $shortcut.WorkingDirectory = $RootDir
        $shortcut.Description = "Erstelle Datenbank-Backup"
        $shortcut.WindowStyle = 1
        $shortcut.Save()
        Write-Info "Start-Menu Backup-Verknüpfung erstellt"
        
        Write-Success "Verknüpfungen erstellt"
        return $true
    }
    catch {
        Write-Warn "Fehler beim Erstellen der Verknüpfungen: $_"
        return $true  # Nicht kritisch
    }
}

function Show-CompletionMessage {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $ColorSuccess
    Write-Host "║                                                            ║" -ForegroundColor $ColorSuccess
    Write-Host "║     INSTALLATION ERFOLGREICH ABGESCHLOSSEN!               ║" -ForegroundColor $ColorSuccess
    Write-Host "║                                                            ║" -ForegroundColor $ColorSuccess
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $ColorSuccess
    Write-Host ""
    Write-Host "Installationspfad: $RootDir" -ForegroundColor $ColorInfo
    Write-Host ""
    Write-Host "Nächste Schritte:" -ForegroundColor $ColorHeader
    Write-Host ""
    Write-Host "  1. App starten:" -ForegroundColor White
    Write-Host "     Doppelklick auf 'Start Lohnmonitor' auf dem Desktop" -ForegroundColor Gray
    Write-Host "     ODER: .\scripts\Start-Dev.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Im Browser öffnen:" -ForegroundColor White
    Write-Host "     http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Anmelden:" -ForegroundColor White
    Write-Host "     Benutzer: admin" -ForegroundColor Gray
    Write-Host "     Passwort: password" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. WICHTIG - Sicherheit:" -ForegroundColor $ColorWarning
    Write-Host "     - Admin-Passwort ändern" -ForegroundColor Gray
    Write-Host "     - JWT_SECRET in server\.env ändern" -ForegroundColor Gray
    Write-Host ""
}

# ============================================================================
# HAUPTPROGRAMM
# ============================================================================

try {
    Write-Header "LOHNMONITOR ENTERPRISE v3.0 - SETUP"
    
    Write-Host "Installationsverzeichnis: $RootDir"
    Write-Host ""
    
    # Administrator-Rechte prüfen
    if (-not (Test-Administrator)) {
        Write-Err "Dieses Skript benötigt Administrator-Rechte!"
        Write-Host ""
        Write-Host "Bitte starten Sie PowerShell als Administrator und führen Sie das Skript erneut aus."
        Write-Host ""
        
        if (-not $Unattended) {
            Write-Host "Drücken Sie eine beliebige Taste zum Beenden..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        exit 1
    }
    
    Write-Success "Administrator-Rechte vorhanden"
    Write-Host ""
    
    # Prüfe Verzeichnisstruktur
    if (-not (Test-Path $ServerDir) -or -not (Test-Path $ClientDir)) {
        Write-Err "Ungültige Installationsstruktur!"
        Write-Host "Erwartet: $ServerDir und $ClientDir"
        exit 1
    }
    
    Write-Success "Installationsstruktur gültig"
    Write-Host ""
    
    # Bestätigung
    if (-not $Unattended) {
        Write-Host "Diese Installation wird:" -ForegroundColor $ColorInfo
        Write-Host "  - Node.js prüfen/installieren (falls nötig)"
        Write-Host "  - Alle npm-Abhängigkeiten installieren"
        Write-Host "  - Datenbank initialisieren"
        Write-Host "  - Firewall-Regeln erstellen"
        Write-Host "  - Desktop-Verknüpfungen erstellen"
        Write-Host ""
        
        if (-not (Confirm-Continue "Installation starten?")) {
            Write-Info "Installation abgebrochen"
            exit 0
        }
    }
    
    Write-Host ""
    
    # 1. Node.js prüfen/installieren
    if (-not $SkipNodeInstall) {
        if (-not (Test-NodeInstalled)) {
            Write-Info "Node.js nicht gefunden"
            
            if ($Unattended -or (Confirm-Continue "Node.js automatisch installieren?")) {
                if (-not (Install-NodeJs)) {
                    throw "Node.js Installation fehlgeschlagen"
                }
                
                # Prüfe erneut
                if (-not (Test-NodeInstalled)) {
                    Write-Warn "Node.js wurde installiert, aber ist noch nicht im PATH verfügbar."
                    Write-Info "Bitte starten Sie ein neues PowerShell-Fenster und führen Sie das Skript erneut aus."
                    exit 1
                }
            }
            else {
                throw "Node.js ist erforderlich. Bitte installieren Sie Node.js manuell von https://nodejs.org/"
            }
        }
    }
    
    # 2. Abhängigkeiten installieren
    if (-not (Install-Dependencies)) {
        throw "Abhängigkeiten konnten nicht installiert werden"
    }
    
    # 3. Datenbank initialisieren
    if (-not (Initialize-Database)) {
        throw "Datenbank konnte nicht initialisiert werden"
    }
    
    # 4. Firewall konfigurieren
    Set-FirewallRules | Out-Null
    
    # 5. Verknüpfungen erstellen
    New-Shortcuts | Out-Null
    
    # Fertig!
    Show-CompletionMessage
    
    if (-not $Unattended) {
        Write-Host ""
        $startNow = Read-Host "Lohnmonitor jetzt starten? (J/N)"
        if ($startNow -match "^[jJyY]") {
            $startScript = Join-Path $RootDir "scripts\Start-Dev.ps1"
            if (Test-Path $startScript) {
                & $startScript
            }
        }
        else {
            Write-Host ""
            Write-Host "Drücken Sie eine beliebige Taste zum Beenden..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    }
    
    exit 0
}
catch {
    Write-Host ""
    Write-Err "Installation fehlgeschlagen!"
    Write-Err $_.Exception.Message
    Write-Host ""
    Write-Host "Details:" -ForegroundColor $ColorError
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Write-Host ""
    
    if (-not $Unattended) {
        Write-Host "Drücken Sie eine beliebige Taste zum Beenden..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    
    exit 1
}
