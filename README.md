# Hidden Places – PWA

Eine mobile, installierbare HTML-PWA zum Erkunden besonderer Orte anhand der Blickrichtung.

## Funktionen

- **Live-Standort** (Browser-Geolocation) oder manuelle Latitude/Longitude-Eingabe
- **OpenStreetMap-POIs** über Overpass-API (Geschichte, Natur, Aussicht, Kultur)
- **Sensorbasierter Kompass**, mit optionaler Freigabe auf iOS, oder manueller 360°-Regler
- **Kamera-Overlay** (optional, per Button aktivieren) und animierte Vorschau ohne Kamera
- **AR-artige Markierungen**, Radar und Detailkarten mit Routenlink
- **Radius- und Kategorienfilter**, Suche innerhalb der Orte, lokale Merkliste
- **Berlin-Demo**, die auch offline funktioniert
- **Installierbare PWA** mit Manifest, App-Icons und Service Worker

## Starten (lokal)

Im Ordner dieses Projekts:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. Für GPS, Kamera, Sensoren und die Installation auf dem **Smartphone** die Dateien auf einer **HTTPS-Domain** bereitstellen, zum Beispiel GitHub Pages oder Cloudflare Pages. Einfaches Öffnen per `file://` reicht für die PWA-Installation nicht.

## Bedienung

1. Die App beginnt im **Berlin-Demo-Modus** mit Beispieldaten.
2. **Mein Standort** lädt echte benannte Orte aus OSM im Umkreis von bis zu 15 km. Als Alternative können mit **Koordinaten** andere Regionen erkundet werden.
3. **Kompass aktivieren** schaltet die Bewegungssensoren ein. Alternativ bewegt der Richtungsregler die Sicht oder du ziehst horizontal über die Ansicht.
4. **Kamera** ersetzt die abstrakte Landschaft durch ein Live-Kamerabild. Die POI-Marker bleiben positionsbasiert und sind **keine präzisen AR-Anker**.
5. Auf Orte klicken, **merken**, Route oder Karte öffnen.

## Daten / Datenschutz

- Live-Orte kommen von den OpenStreetMap-Mitwirkenden und werden über Overpass abgefragt. Datenlizenz: Open Database License (ODbL), siehe <https://www.openstreetmap.org/copyright>.
- Eine Standortabfrage übermittelt die ausgewählten Koordinaten an den Overpass-API-Dienst. Die App verwendet zwischengespeicherte Live-Ergebnisse maximal **15 Minuten erneut** (der Session Storage kann die Daten bis zum Ende der Browser-Session enthalten) und kein permanentes GPS-Profil.
- Die Merkliste wird auf dem Gerät im Local Storage gespeichert. Es gibt keinen eigenen Backend-Server.
- Primärer API-Endpunkt: `https://overpass.private.coffee/api/interpreter` (für faire, gelegentliche Tests). Sekundärer Endpunkt: `https://overpass-api.de/api/interpreter`. Für stark genutzte öffentliche Apps einen eigenen oder vertraglich gehosteten POI-Dienst verwenden.
- Bei Offline-Betrieb funktionieren die App-Oberfläche und die **Berlin-Demo**. Live-Abfragen benötigen Internet.
- Browser-Kompasswerte können je nach Gerät und Kalibrierung ungenau sein. Relative Sensorwerte werden ausdrücklich als „RELATIVE AUSRICHTUNG“ angezeigt und dürfen nicht mit einem echten Nordkurs verwechselt werden.

## Dateien

- `index.html` – komplette HTML-/CSS-/JavaScript-App ohne Framework
- `manifest.webmanifest` – PWA-Konfiguration
- `sw.js` – Offline-Service-Worker
- `icons/` – installierbare App-Icons
