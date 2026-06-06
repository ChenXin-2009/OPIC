# OPIC — Open Integrated Cosmos (Offener Integrierter Kosmos)

<div align="center">
  <img src="../public/LOGO/logolwBG.svg" alt="OPIC Logo" width="300">
</div>

**Ein webbasiertes Multi-Skalen-Universum-Visualisierungs- und astronomisches Datenintegrationssystem**

[English](../README_EN.md) | [中文](../README.md) | [日本語](./README_JA.md) | [한국어](./README_KO.md) | [Français](./README_FR.md) | [Español](./README_ES.md) | [Русский](./README_RU.md)

---

## Projektübersicht

OPIC ist eine interaktive Universum-Visualisierungsanwendung, die mit Three.js, Cesium und Next.js erstellt wurde. Durch echte astronomische Daten und präzise Bahnberechnungen präsentiert sie eine dynamische Simulation von der Erdoberfläche bis zum Rand des beobachtbaren Universums.

Das Projekt entwickelt sich zu einer modularen Plugin-Architektur (MOD Manager), die es ermöglicht, Funktionen zur Laufzeit unabhängig zu laden, zu konfigurieren und zu wechseln, ohne die Anwendung neu zu starten.

### Demonstration

<div align="center">
  <img src="./images/earth-to-universe-zoom.gif" alt="Demonstration des Zooms von der Erde zum Universum" width="300">
  <p><em>Nahtlose Zoom-Erfahrung von Gebäuden auf der Erdoberfläche bis zum Panorama des Universums</em></p>
</div>

## Hauptfunktionen

### Erdvisualisierung (Cesium-Integration)

- Hochpräzise gekachelte Erde: Globales Gelände- und Bildrendering basierend auf Cesium
- Multi-Source-Kartenwechsel: Unterstützung für Bing Maps, OpenStreetMap, ArcGIS, Tianditu und andere Bildquellen
- Echte Erdgeländehöhendaten
- Entfernungsadaptive Anpassung: Cesium-Kacheln in kurzer Entfernung, Wechsel zu Three.js-Kugel in großer Entfernung, sanfter Übergang
- Echtzeit-Synchronisation des Kamerastatus zwischen Three.js und Cesium

### Sonnensystem-Simulation

- Hochpräzises Ephemeridensystem: Basierend auf NASA JPL DE440 Ephemeridendaten
- 27 Himmelskörper: Präzise Positionsberechnung von 8 Hauptplaneten + 19 Hauptmonden
- Zeitsteuerung: Hochpräziser Zeitbereich 2009-2109, Unterstützung für Vorwärts- und Rückwärtslauf
- Dynamische Datenquelle: Automatischer Wechsel zwischen hochpräzisen Ephemeriden ↔ analytischem Modell

### Künstliche Satellitenverfolgung

- Echtzeit-Verfolgung: Basierend auf CelesTrak TLE-Daten und SGP4-Bahnmodell
- Satellitensuche: Durchsuchen und Suchen von künstlichen Satelliten in der Umlaufbahn
- Bahnvisualisierung: Anzeige von Satellitenbahnen und Bewegungstrajektorien
- Detaillierte Informationen: Anzeige von Satellitenparametern, Bahnelementen und Status

<div align="center">
  <img src="./images/satellite-tracking-demo.gif" alt="Demonstration der Satellitenverfolgung" width="300">
  <p><em>Echtzeit-Satellitenbahn-Verfolgung und Informationsanzeige</em></p>
</div>

### Multi-Skalen-Universum-Visualisierung

Erkunden Sie 9 Universum-Skalenebenen durch Zoomen:

| Skala | Entfernungsbereich | Datenquelle |
|-------|---------------------|-------------|
| Erde | 0 - 100.000 km | Cesium-Kacheln |
| Sonnensystem | 0,1 - 100 AE | NASA JPL DE440 |
| Nahe Sterne | 0 - 100 Lichtjahre | ESA Gaia DR3 |
| Milchstraße | 100 - 50.000 Lichtjahre | ESA Gaia |
| Lokale Gruppe | 50k - 1M Lichtjahre | McConnachie 2012 |
| Nahe Galaxiengruppen | 1M - 10M Lichtjahre | Karachentsev 2013 |
| Virgo-Superhaufen | 10M - 50M Lichtjahre | 2MRS Survey |
| Laniakea-Superhaufen | 50M - 500M Lichtjahre | Cosmicflows-3 |
| Beobachtbares Universum | 500M+ Lichtjahre | Kosmische Netzstruktur |

### MOD Manager System (In Entwicklung)

Modulare Plugin-Architektur, die das Kernsystem leicht hält und gleichzeitig optionale Funktionen zur Laufzeit dynamisch laden kann:

- Deklaratives MOD-Manifest mit semantischer Versionierung
- Vollständiges Lebenszyklusmanagement: registered → loaded → enabled → disabled → unloaded
- Automatische Abhängigkeitsauflösung mit Erkennung zirkulärer Abhängigkeiten
- Versionierte API-Schicht: Time, Camera, Celestial, Satellite, Render API
- Fehlerisolierung: MOD-Fehler beeinträchtigen das Kernsystem nicht
- Konfigurationspersistenz über Sitzungen hinweg

<div align="center">
  <img src="./images/mod-manager-interface.gif" alt="MOD Manager-Oberfläche" width="300">
  <p><em>MOD Manager-Oberfläche und Beispiel-Mod-Demonstration</em></p>
</div>

### Visuelle Merkmale

- Hochwertige Planetentexturen (Solar System Scope)
- Sternrendering basierend auf ESA Gaia-Daten
- Interaktive Kamera: Freie Rotation, Zoom und Fokus auf Himmelskörper
- Nahtlose visuelle Übergänge zwischen Skalen
- 4 Detailstufen, dynamische Anpassung nach Entfernung

## Technologie-Stack

| Kategorie | Technologie |
|-----------|-------------|
| Frontend-Framework | Next.js 16 / React 19 |
| 3D-Rendering | Three.js 0.170 + Cesium 1.139 |
| Sprache | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Zustandsverwaltung | Zustand 5 |
| Bahnberechnung | satellite.js (SGP4) |
| Datenkompression | pako (gzip) |
| Testing | Jest + fast-check |

## Schnellstart

### Umgebungsanforderungen

- Node.js 20+
- npm oder yarn

### Installation

```bash
# Repository klonen
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Besuchen Sie `http://localhost:3000`, um die Anwendung anzuzeigen.

### Produktionsversion erstellen

```bash
npm run build
npm start
```

## Bedienungsanleitung

| Operation | Funktion |
|-----------|----------|
| Maus ziehen | Ansicht drehen |
| Mausrad | Zoom (verschiedene Universum-Skalen erkunden) |
| Klick auf Planet/Mond | Ziel fokussieren |
| Zeitsteuerung | Simulationsgeschwindigkeit und Datum anpassen |
| Kartenwechsel | Verschiedene Bildquellen in der Erdansicht wechseln |
| Erdverriegelung | Kamera auf Erdmittelpunkt verriegeln |

## Datenquellen

### Ephemeridendaten

| Himmelskörper | Datenquelle | Zeitbereich | Genauigkeit |
|---------------|-------------|-------------|-------------|
| Erde, Mars, Mond | NASA JPL DE440 | 2009-2109 | <0,1° |
| Andere Planeten | NASA JPL DE440 | 2009-2039 | <0,1° |
| Jupiter-Monde | NASA JPL JUP365 | 2009-2039 | <0,01° |
| Saturn-Monde | NASA JPL SAT441 | 2009-2039 | <0,01° |
| Neptun-Monde | NASA JPL NEP097 | 2009-2039 | <0,01° |

### Universum-Daten

- Sterndaten: ESA Gaia Mission (DR3)
- Lokale Gruppe: McConnachie (2012) Local Group Catalog
- Nahe Galaxiengruppen: Karachentsev et al. (2013)
- Virgo-Superhaufen: 2MRS Survey Data
- Laniakea-Superhaufen: Cosmicflows-3 Dataset

### Satellitendaten

- TLE-Bahndaten: CelesTrak (NORAD)
- Satelliten-Metadaten: UCS (Union of Concerned Scientists) Satellitendatenbank

### Visuelle Ressourcen

- Planetentexturen: Solar System Scope
- Milchstraßenbilder: ESA/Gaia

## Projektstruktur

```
opic/
├── src/
│   ├── app/                    # Next.js-Anwendungsrouten
│   ├── components/             # React-Komponenten
│   │   ├── canvas/            # 3D-Canvas-Komponenten
│   │   ├── cesium/            # Cesium-bezogene Komponenten
│   │   ├── satellite/         # Satellitenverfolgung-UI
│   │   ├── mod-manager/       # MOD Manager-UI (in Entwicklung)
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Three.js-Renderer
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   ├── LocalGroupRenderer.ts
│   │   │   ├── VirgoSuperclusterRenderer.ts
│   │   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   │   ├── LODManager.ts
│   │   │   └── ...
│   │   ├── cesium/            # Cesium-Integration
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # Astronomische Berechnungen
│   │   ├── satellite/         # Satellitenverfolgung (SGP4)
│   │   ├── mod-manager/       # MOD Manager-Kern (in Entwicklung)
│   │   │   ├── core/          # Registrierung, Lebenszyklus, Abhängigkeitsauflösung
│   │   │   ├── api/           # Time/Camera/Celestial/Satellite/Render API
│   │   │   ├── persistence/   # Konfigurationspersistenz
│   │   │   ├── error/         # Fehlerbehandlung und -isolierung
│   │   │   └── performance/   # Leistungsüberwachung
│   │   ├── config/            # Konfigurationsdateien
│   │   ├── data/              # Datenlader
│   │   └── types/             # TypeScript-Typen
│   └── stores/                # Zustand-Zustandsverwaltung
├── public/
│   ├── data/                  # Astronomische Daten
│   │   ├── ephemeris/        # NASA JPL-Ephemeridendaten
│   │   ├── gaia/             # Gaia-Sterndaten
│   │   └── universe/         # Universum-Strukturdaten
│   ├── textures/              # Texturressourcen
│   └── cesium/                # Cesium-statische Ressourcen
├── scripts/                   # Datengenerierungsskripte
└── docs/                      # Projektdokumentation
```

## Entwicklung

```bash
# Tests ausführen
npm test

# Code-Überprüfung
npm run lint
npm run lint:fix

# Typüberprüfung
npm run quality:check

# Testabdeckung
npm run test:coverage
```

## Leistungsoptimierung

- 4 Detailstufen, dynamische Anpassung nach Entfernung
- Bedarfsgerechtes Laden von Erdkacheln, automatische Entfernung von Fernkacheln
- Cesium-Kacheln in kurzer Entfernung, Three.js-Kugel in großer Entfernung
- Benutzerdefiniertes Shader-Partikelsystem, Unterstützung für Millionen von Partikeln
- Instanziertes Rendering zur Reduzierung von Zeichenaufrufen
- Frustum-Culling, nur sichtbare Objekte rendern
- Automatische Freigabe von Fernressourcen
- Web Workers für nicht blockierende Datenverarbeitung

## Haftungsausschluss

Diese Anwendung dient nur zu Bildungs- und Unterhaltungszwecken.

**Hinweis zur Genauigkeit astronomischer Daten:**

Im hochpräzisen Zeitbereich (2009-2109 für Erde/Mars/Mond, 2009-2039 für andere Himmelskörper) werden NASA JPL-Ephemeridendaten mit Bogensekundengenauigkeit verwendet. Außerhalb dieses Bereichs wechselt das System automatisch zu analytischen Modellen mit reduzierter Genauigkeit.

Für präzise astronomische Daten für wissenschaftliche Forschung oder Navigation konsultieren Sie bitte das NASA JPL HORIZONS-System oder andere offizielle professionelle astronomische Institutionen.

**Hinweis zu Satellitenbahndaten:**

Künstliche Satellitenbahndaten basieren auf TLE (Two-Line Element) und dem SGP4-Modell, wobei die Genauigkeit durch Faktoren wie atmosphärischen Widerstand und Sonnenstrahlungsdruck beeinflusst wird, nur als Referenz.

**Haftungserklärung:**

Diese Software wird "wie besehen" bereitgestellt, ohne ausdrückliche oder stillschweigende Garantien. In keinem Fall haften die Autoren oder Urheberrechtsinhaber für Ansprüche, Schäden oder andere Haftungen.

Diese Software ist nicht für Umgebungen geeignet, die ausfallsichere Leistung erfordern. Der Benutzer versteht und akzeptiert ausdrücklich, dass der Autor nicht für Verluste oder Schäden haftet, die durch die Verwendung dieser Software in Hochrisikoaktivitäten verursacht werden.

## Beitragsleitfaden

Alle Formen von Beiträgen sind willkommen! Wir begrüßen die Zusammenarbeit von menschlichen Entwicklern und KI-Assistenten.

- Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Informationen zur Teilnahme
- Reichen Sie Issues ein, um Bugs zu melden oder neue Funktionen vorzuschlagen
- Reichen Sie Pull Requests ein, um Code beizutragen
- **KI-Beiträge willkommen**: Wir fördern Beiträge, die von KI-Tools und -Agenten unterstützt werden

## Lizenz

Dieses Projekt ist unter der Apache License 2.0 lizenziert.

Hauptmerkmale:
- Erlaubt kommerzielle Nutzung, Modifikation und Verteilung
- Erfordert Beibehaltung von Urheberrechts- und Lizenzhinweisen
- Bietet ausdrückliche Patentgewährung
- Enthält Haftungsausschluss und Haftungsbeschränkung

Siehe [LICENSE](LICENSE)-Datei für Details.

## Kontakt

- **GitHub**: [@ChenXin-2009](https://github.com/ChenXin-2009)
- **Projektadresse**: [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)
- **Website**: [https://opic.cxin.tech](https://opic.cxin.tech)
