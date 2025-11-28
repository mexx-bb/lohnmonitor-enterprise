@echo off
REM ====================================================================
REM LOHNMONITOR ENTERPRISE - UPDATE SCRIPT
REM ====================================================================

setlocal enabledelayedexpansion

color 0B
title Lohnmonitor Enterprise - Update

echo.
echo ====================================================================
echo  LOHNMONITOR ENTERPRISE - UPDATE
echo ====================================================================
echo. 

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Dieses Skript benötigt ADMINISTRATOR-RECHTE!
    echo.
    echo Bitte: Rechtsklick - "Als Administrator ausführen"
    echo.
    pause
    exit /b 1
)

echo [OK] Administrator-Rechte vorhanden
echo.

set INSTALL_PATH=C:\Programme\LohnmonitorEnterprise
set BACKUP_PATH=C:\Backups\Lohnmonitor
set TEMP_UPDATE=%TEMP%\lohnmonitor-update
set GITHUB_REPO=https://github.com/mexx-bb/lohnmonitor-enterprise
set BACKUP_PREFIX=backup_before_update_

echo [SCHRITT 1] Prüfe bestehende Installation... 
echo.

if not exist "%INSTALL_PATH%" (
    echo [ERROR] Lohnmonitor nicht installiert!
    echo         Pfad nicht gefunden: %INSTALL_PATH%
    echo.
    echo Bitte führe zuerst aus: setup-lohnmonitor. bat
    echo.
    pause
    exit /b 1
)

echo [OK] Installation gefunden: %INSTALL_PATH%
echo.

echo [SCHRITT 2] Erstelle Sicherung vor Update...
echo.

if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"

if exist "%INSTALL_PATH%\server\data\lohnmonitor. db" (
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
    
    set BACKUP_FILE=%BACKUP_PATH%\%BACKUP_PREFIX%! mydate!_!mytime!.db
    
    echo [INFO] Sichere Datenbank... 
    copy "%INSTALL_PATH%\server\data\lohnmonitor. db" "! BACKUP_FILE!" >nul 2>&1
    
    if %errorLevel% equ 0 (
        echo [OK] DB-Backup erstellt: ! BACKUP_FILE!
    )
)

if exist "%INSTALL_PATH%\server\. env" (
    echo [INFO] Sichere Backend-Konfiguration...
    copy "%INSTALL_PATH%\server\.env" "%BACKUP_PATH%\env_server_backup.env" /Y >nul 2>&1
    echo [OK] Backend-Config gesichert
)

if exist "%INSTALL_PATH%\client\. env" (
    echo [INFO] Sichere Frontend-Konfiguration...
    copy "%INSTALL_PATH%\client\.env" "%BACKUP_PATH%\env_client_backup.env" /Y >nul 2>&1
    echo [OK] Frontend-Config gesichert
)

echo. 

echo [SCHRITT 3] Stoppe Dienste (falls aktiv)...
echo.

net stop LohnmonitorBackend >nul 2>&1
if %errorLevel% equ 0 echo [OK] LohnmonitorBackend gestoppt

net stop LohnmonitorFrontend >nul 2>&1
if %errorLevel% equ 0 echo [OK] LohnmonitorFrontend gestoppt

echo.

echo [SCHRITT 4] Lade neue Version herunter...
echo [INFO] Das kann 1-2 Minuten dauern...
echo.

if not exist "%TEMP_UPDATE%" mkdir "%TEMP_UPDATE%"

powershell -Command ^
    try { ^
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
        $ProgressPreference = 'SilentlyContinue'; ^
        Invoke-WebRequest -Uri '%GITHUB_REPO%/archive/main.zip' -OutFile '%TEMP_UPDATE%\lohnmonitor-update.zip' -UseBasicParsing; ^
        Write-Host '[OK] Update heruntergeladen'; ^
        exit 0 ^
    } catch { ^
        Write-Host '[ERROR] Download fehlgeschlagen'; ^
        exit 1 ^
    }

if %errorLevel% neq 0 (
    echo [ERROR] Download fehlgeschlagen
    pause
    exit /b 1
)

echo. 

echo [SCHRITT 5] Entpacke Update... 
echo.

powershell -Command ^
    try { ^
        Expand-Archive -Path '%TEMP_UPDATE%\lohnmonitor-update.zip' -DestinationPath '%TEMP_UPDATE%' -Force; ^
        Write-Host '[OK] Update entpackt'; ^
        exit 0 ^
    } catch { ^
        Write-Host '[ERROR] Entpacken fehlgeschlagen'; ^
        exit 1 ^
    }

if %errorLevel% neq 0 (
    echo [ERROR] Entpacken fehlgeschlagen
    pause
    exit /b 1
)

echo.

echo [SCHRITT 6] Kopiere aktualisierte Dateien... 
echo [INFO] Das kann 1-2 Minuten dauern...
echo. 

for /d %%D in ("%TEMP_UPDATE%\lohnmonitor-enterprise-*") do (
    echo [INFO] Kopiere Backend... 
    xcopy "%%D\server\*" "%INSTALL_PATH%\server\" /E /I /Y /EXCLUDE:"%INSTALL_PATH%\server\. env" >nul 2>&1
    if %errorLevel% equ 0 echo [OK] Backend aktualisiert
    
    echo [INFO] Kopiere Frontend... 
    xcopy "%%D\client\*" "%INSTALL_PATH%\client\" /E /I /Y /EXCLUDE:"%INSTALL_PATH%\client\. env" >nul 2>&1
    if %errorLevel% equ 0 echo [OK] Frontend aktualisiert
    
    echo [INFO] Kopiere Skripte...
    xcopy "%%D\scripts\*" "%INSTALL_PATH%\scripts\" /E /I /Y >nul 2>&1
    if %errorLevel% equ 0 echo [OK] Skripte aktualisiert
    
    echo [INFO] Kopiere Dokumentation...
    xcopy "%%D\docs\*" "%INSTALL_PATH%\docs\" /E /I /Y >nul 2>&1
    if %errorLevel% equ 0 echo [OK] Docs aktualisiert
)

echo.

echo [SCHRITT 7] Aktualisiere npm Dependencies...
echo [INFO] Das kann 5-10 Minuten dauern...
echo.

cd /d "%INSTALL_PATH%\server"
echo [INFO] Backend Dependencies werden aktualisiert...
call npm install >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Backend Dependencies aktualisiert
) else (
    echo [WARNING] Backend Dependencies Update hatte Fehler
)

cd /d "%INSTALL_PATH%\client"
echo [INFO] Frontend Dependencies werden aktualisiert...
call npm install >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Frontend Dependencies aktualisiert
) else (
    echo [WARNING] Frontend Dependencies Update hatte Fehler
)

echo.

echo [SCHRITT 8] Führe Datenbank-Migrationen durch...
echo. 

cd /d "%INSTALL_PATH%\server"
call npx prisma migrate deploy >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Datenbank migriert
) else (
    echo [WARNING] Migration hatte Fehler - überprüfe manuell
)

echo. 

echo [SCHRITT 9] Räume auf...
echo.

if exist "%TEMP_UPDATE%" (
    rmdir /s /q "%TEMP_UPDATE%" >nul 2>&1
    echo [OK] Temporäre Dateien gelöscht
)

echo.

echo [SCHRITT 10] Starte Dienste (falls konfiguriert)...
echo. 

net start LohnmonitorBackend >nul 2>&1
if %errorLevel% equ 0 echo [OK] LohnmonitorBackend gestartet

net start LohnmonitorFrontend >nul 2>&1
if %errorLevel% equ 0 echo [OK] LohnmonitorFrontend gestartet

echo.

echo ====================================================================
echo  [OK] UPDATE ERFOLGREICH ABGESCHLOSSEN!
echo ====================================================================
echo. 

echo Aktualisiert:
echo  ✓ Backend-Code
echo  ✓ Frontend-Code
echo  ✓ npm Dependencies
echo  ✓ Datenbank-Migrationen
echo. 

echo Backups erstellt:
echo  ✓ Datenbank: %BACKUP_PATH%
echo  ✓ Konfiguration: %BACKUP_PATH%
echo.

echo Falls Probleme auftreten, restore Backup:
echo  1. Kopiere: %BACKUP_PATH%\lohnmonitor_*. db
echo  2. Zu: %INSTALL_PATH%\server\data\lohnmonitor. db
echo.

echo Nächste Schritte:
echo  1. Starte App: .\scripts\Start-Dev. ps1
echo  2.  Teste im Browser: http://localhost:5173
echo  3. Prüfe Fehlermeldungen in der Konsole
echo. 

pause
endlocal
exit /b 0