@echo off
REM ====================================================================
REM LOHNMONITOR ENTERPRISE - ONE-CLICK SETUP
REM Windows Batch Script für automatisches Setup
REM ====================================================================

setlocal enabledelayedexpansion

color 0A
title Lohnmonitor Enterprise - Setup

echo. 
echo ====================================================================
echo  LOHNMONITOR ENTERPRISE v3 - ONE-CLICK SETUP
echo ====================================================================
echo. 

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Dieses Skript benötigt ADMINISTRATOR-RECHTE! 
    echo.
    echo Bitte:
    echo 1. Rechtsklick auf diese Datei
    echo 2. "Als Administrator ausführen"
    echo. 
    pause
    exit /b 1
)

echo [OK] Administrator-Rechte vorhanden
echo.

set INSTALL_PATH=C:\Programme\LohnmonitorEnterprise
set TEMP_DIR=%TEMP%\lohnmonitor-download
set GITHUB_REPO=https://github.com/mexx-bb/lohnmonitor-enterprise
set ZIP_FILE=%TEMP_DIR%\lohnmonitor-enterprise.zip
set SETUP_SCRIPT=setup-lohnmonitor-full-v3.ps1

echo [INFO] Installationspfad: %INSTALL_PATH%
echo [INFO] Temp-Verzeichnis: %TEMP_DIR%
echo. 

echo [SCHRITT 1] Erstelle Download-Verzeichnis...
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"
echo [OK] Download-Verzeichnis bereit
echo.

echo [SCHRITT 2] Prüfe Git Installation...
git --version >nul 2>&1

if %errorLevel% equ 0 (
    echo [OK] Git ist installiert
    echo.
    echo [SCHRITT 3] Klone Repository mit Git...
    echo. 
    
    if exist "%INSTALL_PATH%" (
        echo [WARNING] Ordner existiert bereits: %INSTALL_PATH%
        set /p OVERWRITE="Überschreiben?  (j/n): "
        if /i "%OVERWRITE%"=="j" (
            rmdir /s /q "%INSTALL_PATH%"
            echo [OK] Ordner gelöscht
        ) else (
            echo [INFO] Setup abgebrochen
            pause
            exit /b 0
        )
    )
    
    cd /d "%TEMP_DIR%"
    git clone %GITHUB_REPO%.git lohnmonitor-enterprise
    
    if %errorLevel% equ 0 (
        echo [OK] Repository geklont
        mkdir "%INSTALL_PATH%"
        xcopy "%TEMP_DIR%\lohnmonitor-enterprise\*" "%INSTALL_PATH%\" /E /I /Y
        echo [OK] Dateien nach %INSTALL_PATH% kopiert
    ) else (
        echo [ERROR] Git Clone fehlgeschlagen
        echo Versuche ZIP-Download...
        goto DOWNLOAD_ZIP
    )
) else (
    echo [WARNING] Git nicht installiert
    echo Versuche ZIP-Download stattdessen...
    goto DOWNLOAD_ZIP
)

goto SETUP_STARTEN

:DOWNLOAD_ZIP
echo. 
echo [SCHRITT 3] Lade ZIP-Archiv herunter...
echo [INFO] Das kann 1-2 Minuten dauern...
echo.

powershell -Command ^
    try { ^
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
        $ProgressPreference = 'SilentlyContinue'; ^
        Invoke-WebRequest -Uri '%GITHUB_REPO%/archive/main.zip' -OutFile '%ZIP_FILE%' -UseBasicParsing; ^
        Write-Host '[OK] ZIP heruntergeladen'; ^
        exit 0 ^
    } catch { ^
        Write-Host '[ERROR] Download fehlgeschlagen'; ^
        exit 1 ^
    }

if %errorLevel% neq 0 (
    echo [ERROR] ZIP-Download fehlgeschlagen
    echo. 
    echo Manueller Download erforderlich:
    echo 1. Gehe zu: %GITHUB_REPO%
    echo 2. Klick auf "Code" - "Download ZIP"
    echo 3. Entpacke nach: %INSTALL_PATH%
    echo 4. Starte: setup-lohnmonitor-full-v3.ps1
    echo.
    pause
    exit /b 1
)

echo [OK] ZIP-Datei vorhanden
echo.

echo [SCHRITT 4] Entpacke ZIP-Archiv... 

if exist "%INSTALL_PATH%" (
    echo [WARNING] Ordner existiert bereits: %INSTALL_PATH%
    set /p OVERWRITE="Überschreiben? (j/n): "
    if /i "%OVERWRITE%"=="j" (
        rmdir /s /q "%INSTALL_PATH%"
        echo [OK] Ordner gelöscht
    ) else (
        echo [INFO] Setup abgebrochen
        pause
        exit /b 0
    )
)

powershell -Command ^
    try { ^
        Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%TEMP_DIR%' -Force; ^
        Write-Host '[OK] ZIP entpackt'; ^
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

echo [OK] ZIP entpackt
echo.

for /d %%D in ("%TEMP_DIR%\lohnmonitor-enterprise-*") do (
    mkdir "%INSTALL_PATH%"
    xcopy "%%D\*" "%INSTALL_PATH%\" /E /I /Y
)

echo [OK] Dateien verschoben nach: %INSTALL_PATH%
echo.

:SETUP_STARTEN

echo [SCHRITT 5] Räume auf... 
if exist "%ZIP_FILE%" del /q "%ZIP_FILE%"
if exist "%TEMP_DIR%\lohnmonitor-enterprise" rmdir /s /q "%TEMP_DIR%\lohnmonitor-enterprise"
echo [OK] Temporäre Dateien gelöscht
echo.

echo [SCHRITT 6] Suche Setup-Skript... 

if exist "%INSTALL_PATH%\%SETUP_SCRIPT%" (
    echo [OK] Setup-Skript gefunden: %INSTALL_PATH%\%SETUP_SCRIPT%
    echo.
) else (
    echo [ERROR] Setup-Skript nicht gefunden! 
    echo Erwartet: %INSTALL_PATH%\%SETUP_SCRIPT%
    echo.
    pause
    exit /b 1
)

echo [SCHRITT 7] Prüfe Systemanforderungen...
echo. 

node --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js ! NODE_VERSION! installiert
) else (
    echo [INFO] Node.js nicht gefunden
    echo Das Setup wird Node.js automatisch herunterladen und installieren
)

npm --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [OK] npm !NPM_VERSION! installiert
) else (
    echo [INFO] npm nicht gefunden
    echo Das Setup wird npm automatisch installieren
)

echo. 

echo ====================================================================
echo  STARTE HAUPTSETUP...
echo ====================================================================
echo. 
echo Das Setup wird sich in einem neuen Fenster öffnen
echo Bitte NICHT SCHLIESSEN - es läuft ca. 15-20 Minuten
echo. 
pause

powershell -Command "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force; & '%INSTALL_PATH%\%SETUP_SCRIPT%'"

if %errorLevel% equ 0 (
    echo. 
    echo ====================================================================
    echo  [OK] SETUP ERFOLGREICH ABGESCHLOSSEN! 
    echo ====================================================================
    echo.
    echo Nächste Schritte:
    echo. 
    echo 1. Navigiere zu: %INSTALL_PATH%
    echo. 
    echo 2. Starte die App mit:
    echo    .\scripts\Start-Dev. ps1
    echo.
    echo 3. Öffne im Browser:
    echo    http://localhost:5173
    echo.
    echo 4. Login mit:
    echo    Benutzer: admin
    echo    Passwort: password
    echo.
    pause
) else (
    echo. 
    echo ====================================================================
    echo  [ERROR] SETUP HAT FEHLER! 
    echo ====================================================================
    echo. 
    echo Bitte prüfe die Meldungen oben und versuche erneut
    echo Falls Problem weiterhin besteht:
    echo 1. Öffne PowerShell als Administrator
    echo 2. Führe aus: cd %INSTALL_PATH%
    echo 3. Starte: .\%SETUP_SCRIPT%
    echo. 
    pause
    exit /b 1
)

endlocal
exit /b 0