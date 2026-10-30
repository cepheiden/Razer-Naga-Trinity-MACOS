#!/bin/zsh
# Baut die App und speichert einen Screenshot pro Seite nach docs/snapshots/<seite>.png.
# Läuft mit eigenem userData-Ordner (APP_SNAPSHOT_SECTION in electron/main.ts): keine echten Profile, keine USB-Writes.
#   scripts/snapshot.sh                 alle Seiten
#   scripts/snapshot.sh buttons macros  nur diese Seiten
#   NO_BUILD=1 scripts/snapshot.sh      ohne Neubau
#   WIDTH=1080 scripts/snapshot.sh      Fensterbreite (Mindestbreite 1080) → <seite>-1080.png
set -euo pipefail
cd "${0:A:h}/.."

pages=("$@")
(( ${#pages} )) || pages=(lighting performance buttons macros)
out=docs/snapshots
mkdir -p "$out"
rm -rf "${TMPDIR:-/tmp}/naga-trinity-snapshot"

[[ -n "${NO_BUILD:-}" ]] || npm run build >/dev/null 2>&1

electron_bin=node_modules/electron/dist/Electron.app/Contents/MacOS/Electron

# Offscreen-Render in electron/main.ts (APP_SNAPSHOT_OUT): kein Fenster auf dem Bildschirm, klappt auch bei gesperrtem Mac.
#   COMMAND=settings scripts/snapshot.sh lighting   führt vorher einen Menübefehl aus → <seite>-settings.png
for page in $pages; do
  file="$PWD/$out/$page${WIDTH:+-$WIDTH}${COMMAND:+-${COMMAND//:/-}}.png"
  rm -f "$file"
  env -u ELECTRON_RUN_AS_NODE APP_SNAPSHOT_SECTION="$page" APP_SNAPSHOT_OUT="$file" \
    APP_SNAPSHOT_WIDTH="${WIDTH:-}" APP_SNAPSHOT_COMMAND="${COMMAND:-}" \
    "$electron_bin" . >/dev/null 2>&1
  [[ -f "$file" ]] || { echo "FAIL $page: kein Bild" >&2; exit 1; }
  echo "$out/${file:t}"
done
