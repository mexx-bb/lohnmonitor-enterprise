# 💼 Lohnmonitor Enterprise v3

**Vollständiges Lohnmanagementsystem für Pflegedienste**

Lokale Web-Anwendung für Windows-Server (Intranet), ohne externe Abhängigkeiten oder Internetanbindung.

---

## 🎯 Features

### 📊 **Mitarbeiterverwaltung**
- ✅ Komplettes Mitarbeiterdatenmanagement
- ✅ Soft-Delete & Archivierung
- ✅ Rollen-basierte Zugriffskontrolle (Admin/Viewer/Editor)
- ✅ Excel-Import/Export mit Validierung
- ✅ Audit-Log für alle Änderungen

### 💰 **Gehaltsberechnung**
- ✅ Automatische Dreisatz-Berechnung
- ✅ Variable & feste Zulagen
- ✅ AVR Bayern 2026 Tarif-Automatik
- ✅ Stufenaufstieg automatisch berechnet
- ✅ Jährlich änderbare Basiskonfiguration

### 🔔 **Automatische Erinnerungen**
- ✅ Windows Toast-Benachrichtigungen
- ✅ E-Mail-Alarme (SMTP-konfigurierbar)
- ✅ Admin-UI für Alarm-Konfiguration
- ✅ Anpassbare Schwellenwerte & Zeitplanung
- ✅ Cron-basierte automatische Prüfung

### 📄 **Dokumentation & Reporting**
- ✅ PDF-Anschreiben für Stufenaufstieg
- ✅ Excel-Export von Daten
- ✅ Audit-Trail für Compliance
- ✅ Backup/Restore-Funktionalität

---

## 🛠️ Tech-Stack

| Komponente | Technologie |
|-----------|------------|
| **Backend** | Node.js / Express.js |
| **Frontend** | React / Vite / Tailwind CSS |
| **Datenbank** | SQLite |
| **ORM** | Prisma |
| **PDF** | pdfmake |
| **Excel** | xlsx |
| **Authentifizierung** | JWT |

---

## 📋 Systemanforderungen

- **Windows**: Windows Server 2019+ oder Windows 10/11
- **RAM**: Mindestens 4 GB
- **Speicher**: Mindestens 2-3 GB frei
- **Netzwerk**: Lokales Intranet (kein Internet nötig)

---

## 🚀 Schnellstart

### Option 1: Docker (Empfohlen für plattformunabhängige Installation)

```bash
# Repository klonen
git clone https://github.com/mexx-bb/lohnmonitor-enterprise.git
cd lohnmonitor-enterprise

# Container starten
docker compose up -d

# Öffnen: http://localhost:8080
```

📚 Ausführliche Docker-Anleitung: **[DOCKER.md](./DOCKER.md)**

### Option 2: Windows-Installation (PowerShell)
```powershell
# PowerShell als Administrator öffnen und ausführen:
.\Download-Lohnmonitor.ps1

# ODER: One-Liner direkt aus dem Internet:
irm https://raw.githubusercontent.com/mexx-bb/lohnmonitor-enterprise/main/Download-Lohnmonitor.ps1 | iex
```

### Alternative: Batch-Installation
```bash
# Batch-Skript ausführen (Rechtsklick → Als Administrator ausführen)
setup-lohnmonitor.bat
```

### 2. App starten (Windows-Installation)
```powershell
# Im Installationsverzeichnis:
.\scripts\Start-Dev.ps1
```

### 3. Im Browser öffnen
```
Docker:   http://localhost:8080
Windows:  http://localhost:5173
```

### 4. Anmelden
```
Benutzer: admin
Passwort: password
```

---

## 📖 Dokumentation

- **[DOCKER.md](./DOCKER.md)** - Docker-Anleitung & Container-Deployment
- **[INSTALL.md](./INSTALL.md)** - Detaillierte Installationsanleitung
- **[API-DOKUMENTATION.md](./docs/API-DOKUMENTATION.md)** - Backend-API
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Fehlerbehebung

---

## 🎮 Benutzerrollen

### **Admin** 🔐
- Vollzugriff auf alle Funktionen
- Benutzer- & Einstellungsverwaltung
- Alarm-Konfiguration
- Audit-Log Einsicht

### **Editor** ✏️
- Mitarbeiterdaten bearbeiten
- Daten importieren/exportieren
- Gehaltsberechnungen sehen

### **Viewer** 👁️
- Lesezugriff nur
- Namen maskiert (Datenschutz)
- Eingeschränkte Ansicht

---

## 📦 Skripte

| Skript | Funktion |
|--------|---------|
| `Download-Lohnmonitor.ps1` | One-Click Download & Installation (PowerShell) |
| `setup-lohnmonitor-full-v3.ps1` | Vollständige lokale Installation (PowerShell) |
| `setup-lohnmonitor.bat` | Vollständige Installation (Batch) |
| `update-lohnmonitor.bat` | Aktualisierung einspielen |
| `uninstall-lohnmonitor.bat` | Komplett deinstallieren |
| `create-shortcuts.bat` | Desktop-Shortcuts erstellen |
| `Start-Dev.ps1` | Backend + Frontend starten |
| `Backup-Lohnmonitor.ps1` | Datenbank sichern |

---

## 🔒 Sicherheit

- **JWT-Token** für Authentifizierung
- **Passwort-Hashing** mit bcrypt
- **Firewall-Integration** für Port-Schutz
- **Soft-Delete** für Datenschutz
- **Audit-Logging** für Compliance

⚠️ **WICHTIG**: JWT-Secret & Admin-Passwort nach Installation ändern!

---

## 💾 Datenbank

**SQLite lokal** (`lohnmonitor.db`)
- Keine externe DB nötig
- Automatische Backups
- Leicht zu portieren

Migrationen: Mit Prisma
```bash
npx prisma migrate dev
npx prisma studio  # UI zum Daten-Browsing
```

---

## 🐛 Support & Bugs

Bugs melden über GitHub Issues oder Dokumentation prüfen.

---

## 📄 Lizenz

**Proprietary** - Nur für autorisierten Gebrauch

---

**Version**: 3.0.0  
**Letzte Aktualisierung**: 2025-01-28  
**Entwicklung**: Mexx-BB