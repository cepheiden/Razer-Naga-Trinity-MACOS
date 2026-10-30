# Stories – Naga Trinity Control

Status: `todo` · `doing` · `done` · `blocked`. Snapshots: `scripts/snapshot.sh [seite…]` → `docs/snapshots/<seite>.png` (eigener Datenordner, keine USB-Writes).

## M0 – Werkzeug

### S0 Snapshot-Modus · done
Jede Seite lässt sich ohne echte Profile und ohne Writes auf die Maus öffnen und fotografieren.
- `APP_SNAPSHOT_SECTION=<seite>` öffnet die Seite direkt, mit eigenem userData-Ordner, ohne Apply, Shortcuts, Polling oder Power-Hooks.
- `scripts/snapshot.sh` baut und speichert `docs/snapshots/<seite>.png` für lighting, performance, buttons und macros.

## M1 – Ehrlich und sauber

### S1 Performance-Layout passt ins Fenster · todo
Bei 1280 × 860 und bei der Mindestbreite 1080 läuft nichts aus dem Fenster.
- Die Polling-Karten (125 / 500 / 1000 Hz) stehen vollständig und ohne Umbruch der Hz-Zahl in der rechten Spalte.
- Die Seitenplatten-Zeilen brechen „12-Tasten“ nicht um, die Beschreibung darf kürzen.
- Snapshot: `performance`.

### S2 Übersetzungen vollständig · todo
Keine englischen Reste oder internen Namen in der deutschen Oberfläche.
- „Active DPI“, Tab „Lighting“, „Polling Rate“, „Side Panel (12 Tasten)“ und „SEITENPLATTE · TWELVE“ sind übersetzt bzw. zeigen den Anzeigenamen der Platte.
- Effektnamen (Static, Spectrum …) bleiben als Razer-Begriffe, ihre Beschreibungen sind deutsch.
- Snapshots: alle Seiten, DE.

### S3 Vorschau zeigt nur echte LEDs · todo
Die Live-Vorschau leuchtet nur dort, wo die Maus LEDs hat: Mausrad und Logo.
- Die Seitentasten der Vorschau sind unbeleuchtet (neutral).
- Underglow bleibt als Schalter „alle Zonen synchron“, ohne eine eigene leuchtende Fläche vorzutäuschen.
- Snapshot: `lighting`.

### S4 Grundtasten ehrlich anzeigen · todo
Die 9 Grundtasten lassen sich nicht auf die Maus schreiben. Die App zeigt das, statt wirkungslose Dropdowns anzubieten.
- Grundtasten werden als feste Belegung (nur lesen) angezeigt, mit einem kurzen Hinweis, dass die Firmware sie nicht umbelegen lässt; die Kipp-Belegung zeigt „Browser zurück / vor“.
- Seitentasten bleiben editierbar wie bisher.
- Bestehende Profile laden weiter (die gespeicherten Basis-Bindings bleiben unverändert in der Datei).
- Snapshot: `buttons`.

### S5 Breathing-Beschreibung ehrlich · todo
- Die Beschreibung von Breathing sagt, dass die Trinity-Firmware den Effekt als feste Farbe zeigt.
- Snapshot: `lighting`.

## M2 – Mac-Gefühl

### S6 App-Menü mit Tastenkürzeln · todo
- ⌘S Speichern, ⌘↩ An Maus senden, ⌘N Neues Profil, ⌘D Duplizieren, ⌘1–⌘4 Bereiche, ⌘W Fenster schließen (App bleibt in der Menüleiste).
- Menütexte DE/EN wie die Tray-Texte.

### S7 Einstellungen im Fenster · todo
- ⌘, öffnet Einstellungen: Bei Anmeldung starten, RGB beim Sperren ausschalten, Sprache.
- Änderungen wirken sofort und stimmen mit dem Tray-Menü überein.

### S8 Makro-Status sichtbar · todo
- Im Makro-Bereich steht pro Makro, welche Seitentaste es auslöst und ob der Shortcut aktiv ist (`registerProfileShortcuts`-Ergebnis an den Renderer).
- Makros ohne zugewiesene Taste sind als „keiner Taste zugewiesen“ markiert.

### S9 App-Icon · todo
- Eigenes App-Icon statt Electron-Standard, im Dock und im Finder.

## M3 – Code

### S10 Gemeinsame Defaults · todo
- `BASE_BUTTONS`, `SIDE_PLATE_LABELS`, `SIDE_DEFAULT_KEYS` liegen in einem Modul, das Main und Renderer importieren; keine Kopien mehr in `useNagaStore.ts` und `profileStore.ts`.
