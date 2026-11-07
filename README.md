# Hidden Places v5 – Invisible Waves

Modulare, frameworkfreie Progressive Web App auf Basis von Hidden Places v4.
Die bisherigen Modi **Entdecken** und **Radar** bleiben erhalten. Neu im Modus-Dropdown:
**Wellen / Invisible Waves**.

## Funktionen in v5

- **Signalraum:** Animierte, farbcodierte Signalwolken im Vollbild-Viewer.
  Sie bewegen sich relativ zur eingestellten Blickrichtung: Smartphone drehen,
  Sensor aktivieren oder den Richtungsslider im Modus-Dropdown nutzen.
- **Browser-Verbindung:** `navigator.onLine` und, falls verfügbar, `navigator.connection`
  (`type`, `effectiveType`, `downlink`, `rtt`). Das sind Hinweise zur bestehenden
  Internetverbindung und **keine** Messwerte benachbarter Funkquellen.
- **Bluetooth (BLE):** Über **Bluetooth wählen** kann ein unterstützter Browser
  ein Gerät in seinem Dialog auswählen lassen (`navigator.bluetooth.requestDevice`).
  Namen zuvor freigegebener Geräte können optional über `getDevices()` wieder
  geladen werden. Kein automatisches Pairing, keine kontinuierliche Gerätesuche.
- **Demo-Wellen:** Vier **ausdrücklich als Demo markierte** Beispielquellen (WLAN,
  BLE, Mobilfunk, IoT). Über den Schalter jederzeit deaktivierbar.
- **Fokus:** Auf eine Wolke tippen oder per "Durchschalten" eine andere Projektion
  wählen. Die visualisierten "Richtungen" sind bewusst fiktiv.
- **Kamera, Kompass und Offline-Shell:** Die bisherigen Funktionen bleiben erhalten;
  auch die Wellenansicht funktioniert ohne externe Bibliotheken oder API-Schlüssel.

## Wichtige Grenzen des Webs

Diese HTML-PWA **kann keine WLAN-Netze in der Nähe auflisten**, ihre RSSI-Werte
messen oder ihren physikalischen Standort bestimmen. Web Bluetooth ist nur in
bestimmten Browsern und sicheren Kontexten verfügbar und benötigt eine explizite
Gerätefreigabe. BLE-Gerätename und Browser-Verbindungsinfos erlauben **keine**
zuverlässige Positions- oder Entfernungsbestimmung. `effectiveType: "4g"` ist
**eine Verbindungsleistungsklasse**, keine Bestätigung, dass Mobilfunk verwendet wird.

Die Wellen, Intensitäten, Winkel, Abstände und Bewegungen auf dem Canvas sind
**künstlerische Projektionen** und kein gemessenes Hochfrequenzfeld. Browserdaten
werden in dieser App lokal verarbeitet und nicht für den Wellenmodus an einen
Server gesendet. Eine tatsächlich funktechnische Umsetzung mit passivem WLAN-
oder BLE-Scanning würde native Plattform-APIs und gesonderte Berechtigungen
benötigen. Der Demo-Modus funktioniert auch ohne Sensor/Bluetooth.

Dokumentation zu unterstützten Webfunktionen:
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
- https://developer.mozilla.org/en-US/docs/Web/API/Bluetooth/requestDevice
- https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API

## Projektstruktur

```text
hidden-places-v5/
├── index.html
├── manifest.webmanifest
├── sw.js                       # Offline-Cache v5
├── css/
│   ├── main.css
│   ├── components.css
│   ├── responsive.css
│   └── waves.css               # Signalraum, mobil und Desktop
├── js/
│   ├── app.js                  # App-Komposition + Store-Subscriptions
│   ├── state.js                # zentraler Zustand
│   ├── config.js               # Berlin-Demo und Overpass-Konfiguration
│   ├── services/
│   │   ├── geolocation.js
│   │   ├── sensors.js
│   │   ├── camera.js
│   │   ├── places-api.js
│   │   └── signals.js          # Network Information / erlaubte BLE-Geräte
│   ├── components/
│   │   ├── toolbar.js
│   │   ├── sidebar.js
│   │   ├── viewer.js
│   │   ├── radar.js
│   │   ├── waves.js            # Canvas, Beacon-Marker, Scanner-Panel
│   │   ├── dropdown.js
│   │   └── notifications.js
│   └── utils/
│       ├── geo-math.js
│       ├── dom.js
│       └── storage.js
├── icons/
└── tests/
    ├── logic.test.mjs
    └── smoke.py
```

## Start / Installation

```bash
cd hidden-places-v5
python3 -m http.server 8000
```

Im Desktop-Browser `http://localhost:8000` öffnen. Für ein Smartphone die Dateien
auf einem HTTPS-Host (z.B. GitHub Pages oder Cloudflare Pages) bereitstellen und
"App installieren" im Modus-Dropdown wählen. `file://` unterstützt ES-Module nicht
zuverlässig. Sensoren, Kamera, Bluetooth, GPS und Service Worker benötigen einen
sicheren Kontext; Bluetooth zusätzlich einen kompatiblen Browser.

## Tests

```bash
node --test tests/logic.test.mjs
python3 tests/smoke.py
```

Die Browsertests prüfen Mobile/Desktop, 3 Modi, Offcanvas, Standort-Demo,
OpenStreetMap-Parsing mit Mock-Antworten, Sensor und Kamera mit Simulationen,
Demo-Toggle und Bluetooth-Browserauswahl mit Stub. Kein echter Funkscan wird getestet.
Die Installation, native Geräteberechtigungen und Browser-/OS-spezifische Sensorik
müssen auf dem Zielgerät geprüft werden.

## Daten/Datenschutz

Die ursprüngliche OpenStreetMap-Ortssuche über Overpass bleibt separat erhalten.
Dabei werden nur bei einer Live-Ortsabfrage die Standortkoordinaten an den
Overpass-Dienst gesendet. Die Wellenfunktion verwendet keine Drittanbieter-API.
Die App unterstützt `prefers-reduced-motion` und pausiert die Animation in
Hintergrund-Tabs. OSM-Daten: © OpenStreetMap-Mitwirkende, ODbL.
