# Fix log

## Performance-Seite läuft rechts aus dem Fenster (S1)
- Symptom: Bei 1280 px waren Polling-Karten und Seitenplatte rechts abgeschnitten, „1000 Hz“ und „12-Tasten“ brachen um.
- Ursache: `.performance-section` nutzte `1.4fr 1fr`. `fr`-Spalten haben `min-width: auto` und werden nie schmaler als ihr Inhalt (Stufenzeilen, 8 Schnellauswahl-Buttons), also wuchs das Raster über die Fensterbreite.
- Fix: `minmax(0, 1.4fr) minmax(0, 1fr)`, Polling-Raten als Zeilen wie die Seitenplatten, Beschreibungen kürzen mit Ellipse.
- Rule: In CSS-Grid-Spalten mit flexiblem Inhalt immer `minmax(0, Nfr)` statt `Nfr` verwenden.
