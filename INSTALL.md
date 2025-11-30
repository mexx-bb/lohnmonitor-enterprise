# 📖 Lohnmonitor Enterprise - Installationsleitfaden

## ⚡ Schnell-Installation mit PowerShell (Empfohlen)

### One-Click Installation mit PowerShell

**Option 1: PowerShell-Skript direkt ausführen**
```powershell
# PowerShell als Administrator öffnen
# Rechtsklick auf Download-Lohnmonitor.ps1 → "Mit PowerShell ausführen"
.\Download-Lohnmonitor.ps1
```

**Option 2: One-Liner aus dem Internet (Schnellste Methode)**
```powershell
# PowerShell als Administrator öffnen und diesen Befehl ausführen:
irm https://raw.githubusercontent.com/mexx-bb/lohnmonitor-enterprise/main/Download-Lohnmonitor.ps1 | iex
```

Das PowerShell-Skript führt automatisch alle Schritte durch:
- ✅ Repository von GitHub herunterladen
- ✅ Node.js installieren (falls nötig)
- ✅ npm-Dependencies installieren
- ✅ Datenbank initialisieren
- ✅ Firewall konfigurieren
- ✅ Desktop-Verknüpfungen erstellen

---

## 📦 Alternative: Batch-Installation

### Schritt 1: Setup-Skript ausführen
```
Rechtsklick auf: setup-lohnmonitor.bat
→ "Als Administrator ausführen"
```

### Schritt 2: Warten (~20 Minuten)
Das Skript macht alles automatisch:
- ✅ Node.js installieren (falls nötig)
- ✅ Ordnerstruktur erstellen
- ✅ npm-Dependencies installieren
- ✅ Datenbank initialisieren
- ✅ Firewall konfigurieren

### Schritt 3: App starten
```
.\scripts\Start-Dev.ps1
```

### Schritt 4: Browser öffnen
```
http://localhost:5173
```

### Schritt 5: Anmelden
```
Benutzer: admin
Passwort: password
```

---

## 🔧 Detaillierte Installation

### Voraussetzungen prüfen
```powershell
# PowerShell als Admin öffnen
node --version        # Sollte v18+ sein
npm --version         # Sollte 9+ sein
git --version         # Optional, für Updates
```

### Schritt-für-Schritt

#### 1️⃣ Ordner erstellen
```
C:\Lohnmonitor-GitHub\
```

#### 2️⃣ Alle Dateien dort speichern
- setup-lohnmonitor.bat
- update-lohnmonitor.bat
- uninstall-lohnmonitor.bat
- create-shortcuts.bat
- Alle anderen Dateien... 

#### 3️⃣ Setup starten
```bash
Rechtsklick setup-lohnmonitor.bat → Administrator
```

#### 4️⃣ Nach Installation Shortcuts erstellen
```bash
Rechtsklick create-shortcuts.bat → Administrator
```

---

## 🌐 Nach Installation

### 1. Admin-Passwort ändern (WICHTIG!)
1. Melde dich als `admin` an
2. Gehe zu Einstellungen
3. Ändere dein Passwort

### 2. JWT-Secret ändern (SICHERHEIT!)
```powershell
# Datei öffnen:
notepad C:\Programme\LohnmonitorEnterprise\server\. env

# Zeile ändern:
JWT_SECRET=lohnmonitor-secret-key-2025-BITTE-AENDERN! 

# In etwas Sicheres:
JWT_SECRET=aB3$xKmP9@qW2nL8vT5cDfG4jH7sR1uE6
```

### 3.  SMTP konfigurieren (E-Mail-Alarme)
```
Datei: C:\Programme\LohnmonitorEnterprise\server\.env

SMTP_ENABLED=true
SMTP_HOST=mail.company.de
SMTP_PORT=587
SMTP_USER=noreply@company.de
SMTP_PASSWORD=your-actual-password
SMTP_FROM="Lohnmonitor <noreply@company.de>"
```

### 4.  Mitarbeiter importieren
1. Öffne App: http://localhost:5173
2.  Admin → Mitarbeiter → Importieren
3. Excel-Vorlage herunterladen
4. Mit Daten füllen
5. Hochladen

### 5.  Alarm testen
1. Admin → Automatische Erinnerungen
2. Klick auf "Test-Benachrichtigung"
3. Windows Toast sollte oben rechts erscheinen

---

## 🚀 Verwaltungs-Skripte

### Update einspielen
```bash
Rechtsklick update-lohnmonitor.bat → Administrator
```

**Was wird aktualisiert:**
- ✅ Backend-Code
- ✅ Frontend-Code
- ✅ npm-Dependencies
- ✅ Datenbank-Migrationen
- ⚠️ Deine `. env` wird NICHT überschrieben!

### Datenbank sichern
```powershell
.\scripts\Backup-Lohnmonitor. ps1
```

Backups in: `C:\Backups\Lohnmonitor\`

### Komplett deinstallieren
```bash
Rechtsklick uninstall-lohnmonitor.bat → Administrator
```

⚠️ **WARNUNG**: Löscht alles außer Backups!

### Desktop-Shortcuts erstellen
```bash
Rechtsklick create-shortcuts.bat → Administrator
```

Erstellt:
- Desktop-Shortcuts
- Start-Menu Gruppe
- Quick-Access Verknüpfung

---

## 🐛 Fehlerbehebung

### Problem: "color 0A\ ist nicht erkannt"
**Lösung**: Suche in allen `. bat` Dateien:
```
Suche:    color 0A\
Ersetze:  color 0A
```

### Problem: "Node.js nicht erkannt"
**Lösung**:
1. Windows neu starten
2.  Dann erneut versuchen
3. Falls immer noch: https://nodejs.org/ neu installieren

### Problem: "Port 5000 bereits in Verwendung"
```powershell
# Finde Prozess
netstat -ano | findstr :5000

# Killen
taskkill /PID 12345 /F
```

### Problem: "Datenbank-Fehler beim Login"
```powershell
# Datenbank zurücksetzen
cd C:\Programme\LohnmonitorEnterprise\server
npx prisma migrate reset
```

### Problem: "Admin-Passwort vergessen"
```powershell
# DB reset macht Admin auf Passwort "password" zurück
npx prisma migrate reset
```

---

## 📊 Ordnerstruktur nach Installation

```
C:\Programme\LohnmonitorEnterprise\
├── server/              (Backend)
│   ├── data/            (Datenbank: lohnmonitor.db)
│   ├── logs/            (Log-Dateien)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── utils/
│   ├── prisma/          (DB-Schema & Migrationen)
│   ├── package.json
│   ├── index.js
│   └── . env             (Konfiguration - NICHT ÄNDERN!)
├── client/              (Frontend)
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── .env
├── scripts/             (PowerShell-Skripte)
│   ├── Start-Dev.ps1
│   ├── Backup-Lohnmonitor.ps1
│   └── Manage-Users.ps1
├── templates/           (Excel-Vorlagen)
│   └── excel/
│       └── Mitarbeiter-Import-Vorlage.xlsx
├── backups/             (Datenbank-Sicherungen)
├── docs/                (Dokumentation)
└── setup-lohnmonitor-full-v3.ps1
```

---

## 🔐 Sicherheit Checkliste

- [ ] Admin-Passwort geändert
- [ ] JWT_SECRET geändert
- [ ] SMTP konfiguriert (falls E-Mails nötig)
- [ ] Firewall-Regeln konfiguriert
- [ ] Erste Backups erstellt
- [ ] Benutzer-Rollen konfiguriert

---

## 📞 Support

Bei Problemen:
1.  Prüfe Fehlermeldung in PowerShell/Browser
2. Konsultiere diese Dokumentation
3. Prüfe Logs: `C:\Programme\LohnmonitorEnterprise\server\logs\`
4. Versuche Update: `update-lohnmonitor.bat`

---

**Installation erfolgreich? ** 🎉 Dann weiter zu [README.md](./README.md)! 