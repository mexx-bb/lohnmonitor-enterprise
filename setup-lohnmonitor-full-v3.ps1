@echo off
REM ====================================================================
REM LOHNMONITOR ENTERPRISE - CREATE SHORTCUTS
REM ====================================================================

setlocal enabledelayedexpansion

color 0E
title Lohnmonitor Enterprise - Shortcuts erstellen

echo. 
echo ====================================================================
echo  LOHNMONITOR ENTERPRISE - SHORTCUTS ERSTELLEN
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
set DESKTOP=%USERPROFILE%\Desktop
set STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs
set ICON_PATH=%INSTALL_PATH%\client\public\favicon.ico

echo [SCHRITT 1] Prüfe Installation...
echo.

if not exist "%INSTALL_PATH%" (
    echo [ERROR] Lohnmonitor nicht installiert!
    echo         Pfad: %INSTALL_PATH%
    echo.
    echo Bitte führe zuerst aus: setup-lohnmonitor.bat
    echo.
    pause
    exit /b 1
)

echo [OK] Installation gefunden
echo.

echo [SCHRITT 2] Erstelle Shortcuts...
echo.

echo [INFO] Erstelle "Start Lohnmonitor" auf Desktop... 

powershell -Command ^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell. CreateShortcut('%DESKTOP%\Start Lohnmonitor.lnk'); ^
    $Shortcut. TargetPath = 'C:\Windows\System32\powershell.exe'; ^
    $Shortcut.Arguments = '-ExecutionPolicy Bypass -File "%INSTALL_PATH%\scripts\Start-Dev.ps1"'; ^
    $Shortcut.WorkingDirectory = '%INSTALL_PATH%'; ^
    $Shortcut. Description = 'Starte Lohnmonitor Enterprise'; ^
    $Shortcut.WindowStyle = 1; ^
    $Shortcut.Save()

if %errorLevel% equ 0 (
    echo [OK] Desktop-Shortcut erstellt
)

echo [INFO] Erstelle "Backup erstellen" auf Desktop...

powershell -Command ^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\Backup Lohnmonitor.lnk'); ^
    $Shortcut.TargetPath = 'C:\Windows\System32\powershell.exe'; ^
    $Shortcut.Arguments = '-ExecutionPolicy Bypass -File "%INSTALL_PATH%\scripts\Backup-Lohnmonitor.ps1"'; ^
    $Shortcut. WorkingDirectory = '%INSTALL_PATH%'; ^
    $Shortcut.Description = 'Erstelle Datenbank-Backup'; ^
    $Shortcut.WindowStyle = 1; ^
    $Shortcut.Save()

if %errorLevel% equ 0 (
    echo [OK] Backup-Shortcut erstellt
)

echo [INFO] Erstelle "Browser-Zugriff" auf Desktop...

powershell -Command ^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\Lohnmonitor Browser.lnk'); ^
    $Shortcut.TargetPath = 'http://localhost:5173'; ^
    $Shortcut.Description = 'Öffne Lohnmonitor im Browser'; ^
    $Shortcut.Save()

if %errorLevel% equ 0 (
    echo [OK] Browser-Shortcut erstellt
)

echo. 

echo [SCHRITT 3] Erstelle Start-Menu Gruppe...
echo.

if not exist "%STARTMENU%\Lohnmonitor" (
    mkdir "%STARTMENU%\Lohnmonitor"
    echo [OK] Start-Menu Ordner erstellt
)

echo [INFO] Erstelle Start-Menu Shortcut...

powershell -Command ^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell.CreateShortcut('%STARTMENU%\Lohnmonitor\Start Lohnmonitor.lnk'); ^
    $Shortcut.TargetPath = 'C:\Windows\System32\powershell. exe'; ^
    $Shortcut.Arguments = '-ExecutionPolicy Bypass -File "%INSTALL_PATH%\scripts\Start-Dev.ps1"'; ^
    $Shortcut.WorkingDirectory = '%INSTALL_PATH%'; ^
    $Shortcut. Description = 'Starte Lohnmonitor Enterprise'; ^
    $Shortcut.WindowStyle = 1; ^
    $Shortcut.Save()

if %errorLevel% equ 0 (
    echo [OK] Start-Menu Shortcut erstellt
)

echo [INFO] Erstelle Backup-Shortcut im Start-Menu...

powershell -Command ^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell.CreateShortcut('%STARTMENU%\Lohnmonitor\Backup erstellen.lnk'); ^
    $Shortcut.TargetPath = 'C:\Windows\System32\powershell. exe'; ^
    $Shortcut.Arguments = '-ExecutionPolicy Bypass -File "%INSTALL_PATH%\scripts\Backup-Lohnmonitor.ps1"'; ^
    $Shortcut.WorkingDirectory = '%INSTALL_PATH%'; ^
    $Shortcut.Description = 'Erstelle Datenbank-Backup'; ^
    $Shortcut.WindowStyle = 1; ^
    $Shortcut.Save()

if %errorLevel% equ 0 (
    echo [OK] Start-Menu Backup-Shortcut erstellt
)

echo [INFO] Erstelle Uninstall-Shortcut... 

powershell -Command ^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell.CreateShortcut('%STARTMENU%\Lohnmonitor\Lohnmonitor deinstallieren.lnk'); ^
    $Shortcut. TargetPath = 'C:\Windows\System32\cmd.exe'; ^
    $Shortcut.Arguments = '/c "%INSTALL_PATH%\uninstall-lohnmonitor.bat"'; ^
    $Shortcut.WorkingDirectory = '%INSTALL_PATH%'; ^
    $Shortcut.Description = 'Deinstalliere Lohnmonitor Enterprise'; ^
    $Shortcut.WindowStyle = 1; ^
    $Shortcut.Save()

if %errorLevel% equ 0 (
    echo [OK] Uninstall-Shortcut erstellt
)

echo.

echo [SCHRITT 4] Erstelle Quick-Access Shortcut...
echo.

powershell -Command ^
    $WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Recent\Lohnmonitor Ordner.lnk'); ^
    $Shortcut.TargetPath = '%INSTALL_PATH%'; ^
    $Shortcut. Description = 'Öffne Lohnmonitor-Installationsordner'; ^
    $Shortcut.Save()

if %errorLevel% equ 0 (
    echo [OK] Quick-Access Shortcut erstellt
)

echo. 

echo [SCHRITT 5] Autostart konfigurieren (optional)...
echo.

set /p AUTOSTART="Soll Lohnmonitor beim Windows-Start automatisch starten?  (j/N): "

if /i "%AUTOSTART%"=="j" (
    powershell -Command ^
        $WshShell = New-Object -ComObject WScript.Shell; ^
        $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Lohnmonitor Autostart.lnk'); ^
        $Shortcut.TargetPath = 'C:\Windows\System32\powershell. exe'; ^
        $Shortcut.Arguments = '-ExecutionPolicy Bypass -WindowStyle Hidden -File "%INSTALL_PATH%\scripts\Start-Dev.ps1"'; ^
        $Shortcut.WorkingDirectory = '%INSTALL_PATH%'; ^
        $Shortcut.Description = 'Lohnmonitor Auto-Start'; ^
        $Shortcut.Save()
    
    echo [OK] Autostart aktiviert
    echo [INFO] Lohnmonitor startet beim nächsten Hochfahren automatisch
) else (
    echo [INFO] Autostart nicht aktiviert
)

echo. 

echo ====================================================================
echo  [OK] SHORTCUTS ERFOLGREICH ERSTELLT!
echo ====================================================================
echo.

echo Erstellte Shortcuts:
echo. 
echo [DESKTOP]
echo  ✓ Start Lohnmonitor. lnk
echo  ✓ Backup Lohnmonitor.lnk
echo  ✓ Lohnmonitor Browser.lnk
echo. 

echo [START MENU] (Lohnmonitor-Gruppe)
echo  ✓ Start Lohnmonitor. lnk
echo  ✓ Backup erstellen.lnk
echo  ✓ Lohnmonitor deinstallieren.lnk
echo.

echo [QUICK ACCESS]
echo  ✓ Lohnmonitor Ordner
echo. 

if /i "%AUTOSTART%"=="j" (
    echo [AUTOSTART]
    echo  ✓ Startet beim Hochfahren automatisch
    echo.
)

echo Du kannst Lohnmonitor jetzt einfach starten:
echo  1. Doppelklick auf "Start Lohnmonitor" auf dem Desktop
echo  2.  Oder über Start-Menu - Lohnmonitor - Start Lohnmonitor
echo. 

echo Browser wird automatisch geöffnet:
echo  http://localhost:5173
echo. 

pause
endlocal
exit /b 0