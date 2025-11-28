@echo off
REM ====================================================================
REM LOHNMONITOR ENTERPRISE - UNINSTALL SCRIPT
REM ====================================================================

setlocal enabledelayedexpansion

color 0C
title Lohnmonitor Enterprise - Uninstall

echo.
echo ====================================================================
echo  LOHNMONITOR ENTERPRISE - DEINSTALLATION
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

echo. 
echo [WARNING] WARNUNG - IRREVERSIBLER VORGANG! 
echo. 
echo Diese Aktion wird:
echo  1. Alle Lohnmonitor-Dateien LÖSCHEN
echo  2.  Datenbank und Daten ENTFERNEN
echo  3. Windows-Dienste DEINSTALLIEREN
echo  4.  Firewall-Regeln ENTFERNEN
echo. 
echo DATENBANKEN WERDEN GELÖSCHT - Nur fortfahren wenn Backups vorhanden! 
echo.

set /p CONFIRM="Wirklich fortfahren? (j/N): "
if /i not "%CONFIRM%"=="j" (
    echo [INFO] Deinstallation abgebrochen
    pause
    exit /b 0
)

echo. 
echo [SCHRITT 1] Stoppe und entferne Windows-Dienste...
echo. 

sc query LohnmonitorBackend >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] Stoppe LohnmonitorBackend... 
    net stop LohnmonitorBackend >nul 2>&1
    echo [INFO] Entferne LohnmonitorBackend...
    sc delete LohnmonitorBackend >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] LohnmonitorBackend entfernt
    )
)

sc query LohnmonitorFrontend >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] Stoppe LohnmonitorFrontend...
    net stop LohnmonitorFrontend >nul 2>&1
    echo [INFO] Entferne LohnmonitorFrontend...
    sc delete LohnmonitorFrontend >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] LohnmonitorFrontend entfernt
    )
)

where nssm >nul 2>&1
if %errorLevel% equ 0 (
    nssm status LohnmonitorBackend >nul 2>&1
    if %errorLevel% equ 0 (
        echo [INFO] Entferne NSSM-Service LohnmonitorBackend... 
        nssm remove LohnmonitorBackend confirm >nul 2>&1
        echo [OK] NSSM-Service entfernt
    )
    
    nssm status LohnmonitorFrontend >nul 2>&1
    if %errorLevel% equ 0 (
        echo [INFO] Entferne NSSM-Service LohnmonitorFrontend... 
        nssm remove LohnmonitorFrontend confirm >nul 2>&1
        echo [OK] NSSM-Service entfernt
    )
)

echo. 

echo [SCHRITT 2] Entferne Firewall-Regeln...
echo.

netsh advfirewall firewall delete rule name="Lohnmonitor Backend" >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Firewall-Regel "Lohnmonitor Backend" entfernt
)

netsh advfirewall firewall delete rule name="Lohnmonitor Frontend" >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Firewall-Regel "Lohnmonitor Frontend" entfernt
)

echo. 

echo [SCHRITT 3] Erstelle finales Backup...
echo.

if exist "%INSTALL_PATH%\server\data\lohnmonitor.db" (
    if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"
    
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
    
    set BACKUP_FILE=%BACKUP_PATH%\lohnmonitor_FINAL_! mydate!_!mytime! .db
    
    copy "%INSTALL_PATH%\server\data\lohnmonitor. db" "!BACKUP_FILE!" >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] Finales Backup erstellt:
        echo     ! BACKUP_FILE!
    )
)

echo.

echo [SCHRITT 4] Lösche Installationsverzeichnis...
echo     Pfad: %INSTALL_PATH%
echo.

if exist "%INSTALL_PATH%" (
    echo [INFO] Lösche Dateien (das kann 1-2 Minuten dauern)...
    rmdir /s /q "%INSTALL_PATH%" >nul 2>&1
    
    if %errorLevel% equ 0 (
        echo [OK] Verzeichnis gelöscht: %INSTALL_PATH%
    ) else (
        echo [WARNING] Einige Dateien konnten nicht gelöscht werden
        echo [INFO] Bitte manuell löschen: %INSTALL_PATH%
    )
) else (
    echo [INFO] Verzeichnis existiert nicht
)

echo. 

echo [SCHRITT 5] Räume Registry auf...
echo.

reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\LohnmonitorEnterprise" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Registry-Einträge entfernt
)

echo. 

echo ====================================================================
echo  [OK] DEINSTALLATION ABGESCHLOSSEN!
echo ====================================================================
echo.

echo Was wurde entfernt:
echo  ✓ Installationsverzeichnis: %INSTALL_PATH%
echo  ✓ Windows-Dienste (Backend ^& Frontend)
echo  ✓ Firewall-Regeln
echo  ✓ Registry-Einträge
echo. 

echo Finales Backup (falls erstellt):
echo  ✓ %BACKUP_PATH%
echo.

echo NICHT gelöscht (manuell löschen wenn gewünscht):
echo  • %BACKUP_PATH%
echo  • Eventuelle Log-Dateien außerhalb Installation
echo  • Node.js (bleibt installiert)
echo.

echo Lohnmonitor Enterprise wurde vollständig deinstalliert. 
echo.

pause
endlocal
exit /b 0