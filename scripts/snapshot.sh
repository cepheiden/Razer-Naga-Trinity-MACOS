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

window_id() {
  osascript -l JavaScript -e "
    ObjC.import('CoreGraphics')
    const all = ObjC.deepUnwrap(ObjC.castRefToObject(\$.CGWindowListCopyWindowInfo(\$.kCGWindowListOptionOnScreenOnly, 0)))
    const w = all.find((x) => x.kCGWindowOwnerPID === $1 && x.kCGWindowLayer === 0 && x.kCGWindowBounds.Height > 400)
    w ? w.kCGWindowNumber : ''"
}

for page in $pages; do
  env -u ELECTRON_RUN_AS_NODE APP_SNAPSHOT_SECTION="$page" APP_SNAPSHOT_WIDTH="${WIDTH:-}" "$electron_bin" . >/dev/null 2>&1 &
  pid=$!
  wid=''
  for _ in {1..60}; do
    wid=$(window_id $pid)
    [[ -n "$wid" ]] && break
    sleep 0.25
  done
  if [[ -z "$wid" ]]; then
    echo "FAIL $page: kein Fenster" >&2
    kill $pid 2>/dev/null || true
    exit 1
  fi
  sleep 1.5
  file="$out/$page${WIDTH:+-$WIDTH}.png"
  screencapture -x -o -l "$wid" "$file"
  kill $pid 2>/dev/null || true
  wait $pid 2>/dev/null || true
  echo "$file"
done
