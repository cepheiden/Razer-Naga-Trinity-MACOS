# Architecture

Electron app for the Razer Naga Trinity on macOS. Two processes, one direction of dependency: the renderer talks to the main process only through the preload bridge.

```text
src/ (renderer, React + Zustand)
  └─ window.naga  ← electron/preload.ts (contextBridge, typed as NagaApi)
        └─ ipcMain handlers in electron/main.ts
              ├─ electron/nagaDriver.ts      USB control transfers (libusb), one promise queue
              │    └─ electron/sideBindings.ts   profile → source IDs + actions (pure)
              ├─ electron/profileStore.ts    profiles.json file I/O
              │    └─ electron/storeMigration.ts defaults + versioned migration (pure)
              ├─ electron/macroEngine.ts     globalShortcut F13–F24 → osascript, per-button status
              └─ electron/appMenu.ts         app menu (DE/EN) → 'menu:command' to the renderer
```

## Layers

| Layer | Files | Rules |
|---|---|---|
| Shared | `electron/types.ts`, `electron/buttonLayout.ts` | Pure TypeScript, no Node or Electron imports; imported by both processes. |
| Pure main logic | `electron/sideBindings.ts`, `electron/storeMigration.ts` | No `usb`, `fs` or `electron` imports; covered by `npm test` (vitest). |
| Main | `electron/main.ts`, `nagaDriver.ts`, `profileStore.ts`, `macroEngine.ts` | Owns USB, files, tray, power events, global shortcuts. |
| Bridge | `electron/preload.ts` | `invoke` calls plus `on…` subscriptions that return an unsubscribe function. |
| Renderer | `src/store/useNagaStore.ts`, `src/components/*`, `src/i18n/*` | No Node access; all device and file work goes through `window.naga`. |

## Seams

- **Device access**: every USB operation goes through `withDevice` in `nagaDriver.ts` (one queue, open/close per task). One adapter (the real mouse); no test adapter yet.
- **Profile store**: `readStore` / `writeStore`, with `migrate` applying versioned fixes (`STORE_VERSION`).
- **Snapshot mode**: `APP_SNAPSHOT_SECTION` swaps the userData folder (seeded with a sample macro binding) and skips apply, shortcuts, polling and power hooks; `APP_SNAPSHOT_OUT` renders offscreen and writes a PNG, `APP_SNAPSHOT_COMMAND` runs a menu command first (`scripts/snapshot.sh`).
- **Menu commands**: `appMenu.ts` sends `menu:command`; the renderer store's `runMenuCommand` maps them to the same actions as the buttons.

## Data flow

- Apply: renderer → `profile:apply` → `applyHardwareProfile` (RGB, DPI, polling, side + wheel-tilt bindings) → save + register macro shortcuts.
- Live DPI: main polls `readLiveDpi` every second while the window is visible → `device:live-dpi` event → `liveDpi` in the store.
- RGB restore: USB attach, unlock and resume → `applyRgbOnly` (RGB is volatile on this mouse).
- Macro status: every shortcut registration → `macros:status` event → macro cards show active / pending / taken.

## Checks

`npx tsc -b` (renderer, Vite config and `electron/` strict), `npm run lint`, `npm test`, `scripts/snapshot.sh`.

Reviews: `docs/architecture-review-*.md`.
