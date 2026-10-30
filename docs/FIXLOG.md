# Fix log

## Performance-Seite läuft rechts aus dem Fenster (S1)
- Symptom: Bei 1280 px waren Polling-Karten und Seitenplatte rechts abgeschnitten, „1000 Hz“ und „12-Tasten“ brachen um.
- Ursache: `.performance-section` nutzte `1.4fr 1fr`. `fr`-Spalten haben `min-width: auto` und werden nie schmaler als ihr Inhalt (Stufenzeilen, 8 Schnellauswahl-Buttons), also wuchs das Raster über die Fensterbreite.
- Fix: `minmax(0, 1.4fr) minmax(0, 1fr)`, Polling-Raten als Zeilen wie die Seitenplatten, Beschreibungen kürzen mit Ellipse.
- Rule: In CSS-Grid-Spalten mit flexiblem Inhalt immer `minmax(0, Nfr)` statt `Nfr` verwenden.

## Klick auf eine Seitenplatte löscht alle Seitentasten-Belegungen
- Symptom: Nach einem Klick auf eine Seitenplatten-Kachel (auch auf die schon aktive) standen alle Seitentasten wieder auf 1…=, Makro-Zuweisungen waren weg; beim nächsten Apply wurden 0 Makro-Shortcuts registriert.
- Ursache: `setSidePlate` ersetzte `buttons` immer komplett durch `buildButtonsForPlate(plate)`.
- Fix: Gleiche Platte → nichts tun. Andere Platte → Belegung (action, value, macroId) jeder Seitentaste behalten, die es auf der neuen Platte auch gibt.
- Rule: Eine Aktion, die eine Liste neu aufbaut, übernimmt die Nutzereingaben der Einträge, die es weiter gibt; nie stillschweigend auf Standard zurücksetzen.
