# 🐳 Docker-Anleitung für Lohnmonitor Enterprise

Diese Anleitung erklärt, wie Sie Lohnmonitor Enterprise als Docker-Container gemäß der [Docker-Dokumentation](https://www.docker.com) verwenden können.

---

## 📋 Voraussetzungen

1. **Docker installieren**: Folgen Sie der offiziellen [Docker-Installationsanleitung](https://docs.docker.com/get-docker/)
2. **Docker Compose installieren**: Normalerweise in Docker Desktop enthalten, oder separat installieren: [Docker Compose Installation](https://docs.docker.com/compose/install/)

### Schnell-Check:
```bash
# Docker-Version prüfen
docker --version

# Docker Compose Version prüfen
docker compose version
```

---

## 🚀 Schnellstart mit Docker Compose

### Schritt 1: Repository klonen
```bash
git clone https://github.com/mexx-bb/lohnmonitor-enterprise.git
cd lohnmonitor-enterprise
```

### Schritt 2: Umgebungsvariablen konfigurieren (optional)
```bash
# Beispielkonfiguration kopieren
cp .env.docker.example .env

# Konfiguration anpassen (optional)
nano .env  # oder: notepad .env (Windows)
```

### Schritt 3: Container starten
```bash
# Container bauen und starten
docker compose up -d

# Logs anzeigen (optional)
docker compose logs -f
```

### Schritt 4: Anwendung öffnen
```
http://localhost:8080
```

### Schritt 5: Anmelden
```
Benutzer: admin
Passwort: password
```

⚠️ **WICHTIG**: Ändern Sie das Admin-Passwort nach dem ersten Login!

---

## 🛠️ Docker-Befehle

### Container-Management

| Befehl | Beschreibung |
|--------|-------------|
| `docker compose up -d` | Container im Hintergrund starten |
| `docker compose down` | Container stoppen und entfernen |
| `docker compose restart` | Container neu starten |
| `docker compose logs -f` | Logs live anzeigen |
| `docker compose ps` | Status der Container anzeigen |

### Container neu bauen (nach Updates)

```bash
# Neuesten Code abrufen
git pull

# Container neu bauen und starten
docker compose up -d --build
```

### Container stoppen und Daten löschen

```bash
# Container stoppen
docker compose down

# Container stoppen UND Volumes löschen (ACHTUNG: Daten gehen verloren!)
docker compose down -v
```

---

## ⚙️ Konfiguration

### Umgebungsvariablen

Erstellen Sie eine `.env`-Datei im Hauptverzeichnis:

```env
# Sicherheit (WICHTIG: Ändern Sie diesen Wert!)
SESSION_SECRET=ihr-geheimer-schluessel-hier

# Port für die Webanwendung
CLIENT_PORT=8080

# E-Mail-Konfiguration (optional)
SMTP_ENABLED=true
SMTP_HOST=smtp.firma.de
SMTP_PORT=587
SMTP_USER=benutzer@firma.de
SMTP_PASSWORD=ihr-passwort
SMTP_FROM="Lohnmonitor <noreply@firma.de>"
SMTP_TO=hr@firma.de

# Alarm-Einstellungen
ALARM_DAYS_THRESHOLD=40
ALARM_CHECK_ENABLED=true
CRON_SCHEDULE=0 8 * * *

# Basis-Wochenstunden
BASIS_WOCHENSTUNDEN=40
```

### Anderer Port verwenden

Um die Anwendung auf einem anderen Port zu starten:

```bash
# Option 1: In .env-Datei setzen
CLIENT_PORT=3000

# Option 2: Direkt beim Start angeben
CLIENT_PORT=3000 docker compose up -d
```

---

## 💾 Datenpersistenz

### Datenbank-Speicherort

Die SQLite-Datenbank wird in einem Docker-Volume gespeichert:
- **Volume-Name**: `lohnmonitor-enterprise_lohnmonitor-data`
- **Datenbank-Datei**: `lohnmonitor.db`

### Backup erstellen

```bash
# Backup des Volumes erstellen
docker run --rm -v lohnmonitor-enterprise_lohnmonitor-data:/data -v $(pwd)/backup:/backup alpine tar cvf /backup/lohnmonitor-backup.tar /data

# Unter Windows (PowerShell):
docker run --rm -v lohnmonitor-enterprise_lohnmonitor-data:/data -v ${PWD}/backup:/backup alpine tar cvf /backup/lohnmonitor-backup.tar /data
```

### Backup wiederherstellen

```bash
# Backup wiederherstellen
docker run --rm -v lohnmonitor-enterprise_lohnmonitor-data:/data -v $(pwd)/backup:/backup alpine sh -c "cd / && tar xvf /backup/lohnmonitor-backup.tar"
```

---

## 🔧 Erweiterte Nutzung

### Einzelne Container bauen

```bash
# Nur Backend bauen
docker build -t lohnmonitor-server ./server

# Nur Frontend bauen
docker build -t lohnmonitor-client ./client
```

### Container manuell ausführen (ohne Compose)

```bash
# Netzwerk erstellen
docker network create lohnmonitor-network

# Backend starten
docker run -d \
  --name lohnmonitor-server \
  --network lohnmonitor-network \
  -v lohnmonitor-data:/app/data \
  -e SESSION_SECRET=ihr-geheimer-schluessel \
  lohnmonitor-server

# Frontend starten
docker run -d \
  --name lohnmonitor-client \
  --network lohnmonitor-network \
  -p 8080:80 \
  lohnmonitor-client
```

### In Container einloggen (Debugging)

```bash
# In Server-Container
docker exec -it lohnmonitor-server sh

# In Client-Container
docker exec -it lohnmonitor-client sh
```

---

## 🔒 Sicherheitshinweise

1. **SESSION_SECRET ändern**: Verwenden Sie einen zufälligen, langen String
   ```bash
   # Zufälligen Secret generieren (Linux/Mac)
   openssl rand -base64 32
   ```

2. **Admin-Passwort ändern**: Nach dem ersten Login sofort ändern

3. **Firewall konfigurieren**: Nur benötigte Ports freigeben

4. **HTTPS verwenden**: Für Produktionsumgebungen einen Reverse Proxy (z.B. Traefik, nginx) mit SSL-Zertifikaten vorschalten

---

## 🐛 Fehlerbehebung

### Container startet nicht

```bash
# Logs anzeigen
docker compose logs server
docker compose logs client

# Container-Status prüfen
docker compose ps
```

### Port bereits in Verwendung

```bash
# Anderen Port verwenden
CLIENT_PORT=9000 docker compose up -d
```

### Datenbank zurücksetzen

```bash
# Container stoppen
docker compose down

# Volume löschen
docker volume rm lohnmonitor-enterprise_lohnmonitor-data

# Neu starten (erstellt neue Datenbank)
docker compose up -d
```

### Container komplett neu bauen

```bash
# Alles stoppen und entfernen
docker compose down -v --rmi all

# Neu bauen und starten
docker compose up -d --build
```

---

## 📊 Systemanforderungen

| Ressource | Minimum | Empfohlen |
|-----------|---------|-----------|
| **RAM** | 512 MB | 1 GB |
| **CPU** | 1 Core | 2 Cores |
| **Speicher** | 500 MB | 2 GB |
| **Docker** | 20.10+ | Aktuellste Version |

---

## 📖 Weiterführende Links

- [Docker-Dokumentation](https://docs.docker.com/)
- [Docker Compose Referenz](https://docs.docker.com/compose/)
- [Lohnmonitor Enterprise README](./README.md)
- [Lohnmonitor Enterprise Installation](./INSTALL.md)

---

**Version**: 3.0.0  
**Docker-Support seit**: 2025-01
