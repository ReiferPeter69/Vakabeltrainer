# Vokabeltrainer Ultra Edition

Ein moderner, browserbasierter Vokabeltrainer mit intelligentem Leitner-Lernsystem - komplett offline-fähig.

## Features

### Lernsystem
- **Leitner-Boxen**: 5 Boxen für verteiltes Wiederholen (Spaced Repetition)
- **Lernstrategien**: Smart, Zufällig, Schwierigste zuerst, Alle Karten
- **Zwei Modi**: Karteikarten (Flip) und Schreiben (Eintippen)
- **Lernrichtungen**: Vorder→Rückseite, Rück→Vorder, oder gemischt
- **Fehleranalyse**: Character-Level-Diff zeigt genau, wo Fehler liegen
- **Korrektur-Modus**: Bei falscher Antwort muss die richtige Lösung abgeschrieben werden

### Organisation
- **Ordner-System**: Verschachtelte Ordner für strukturierte Vokabelsammlung
- **Massen-Import**: Schnelles Importieren via Semikolon-getrennter Textdatei
- **Farbcodierung**: Individuelle Farben für Ordner und Karten
- **Suchfunktion**: Schnelle Volltextsuche in allen Karten

### Daten & Sicherheit
- **Auto-Backup**: Automatische Sicherung alle 5 Minuten
- **Export**: JSON-Backup oder CSV-Export
- **Import**: Wiederherstellung aus Backup-Dateien
- **Teilen**: Ordner als Datei, Link oder via Web Share API teilen
- **Undo**: 5-Sekunden-Rückgängig-Funktion bei Löschungen

### Benutzererfahrung
- **Dark/Light Theme**: Umschaltbar mit Speicherung
- **Lern-Serie (Streak)**: Tracking der täglichen Lernaktivität
- **Confetti-Animation**: Belohnung bei richtigen Antworten
- **Sprachausgabe**: Text-to-Speech für Aussprache
- **Offline-fähig**: Funktioniert komplett ohne Internet

## Bedienung

### Schnellstart
1. `index.html` im Browser öffnen
2. Über das **+**-Button neue Karten oder Ordner erstellen
3. Zum **Lernen**-Tab wechseln und Session starten

### Karten erstellen
- Einzelne Karte: **+ → Neue Karte**
- Massen-Import: **+ → Import** (Format: `Vorderseite;Rückseite;Hinweis`)
- Ordner: **+ → Neuer Ordner**

### Lernen
1. Quelle wählen (aktueller Ordner oder alle Karten)
2. Strategie wählen:
   - **Smart (Leitner)**: Sortiert nach Box-Priorität
   - **Zufällig**: 20 zufällige Karten
   - **Schwierigste**: Karten mit niedrigster Box zuerst
   - **Alle**: Der vollständige Vorrat
3. Modus wählen: Flip oder Schreiben
4. Session starten!

### Teilen
- Ordner teilen: Ordner öffnen → **Share**-Icon klicken
- Drei Optionen: Datei-Download, Link kopieren, System-Teilen

## Technologie

- **Frontend**: Vanilla HTML, CSS, JavaScript (keine Frameworks nötig)
- **Speicher**: localStorage (Client-seitig, kein Server)
- **Icons**: Font Awesome 6.4

## Dateistruktur

```
Vokabeltainer/
├── index.html    # Hauptdatei
├── style.css     # Stylesheet
├── script.js     # Anwendungslogik
└── README.md     # Diese Datei
```

## Datenschutz

Alle Daten werden ausschließlich lokal im Browser (localStorage) gespeichert. Es werden keine Daten an Server übermittelt.

## Lizenz

Open Source - frei verwendbar und modifizierbar.