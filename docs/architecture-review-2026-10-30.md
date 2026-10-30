# Architecture review – 2026-10-30 (after M1)

Electron 42 + React 19 + Vite + TypeScript. Main process: `electron/` (USB driver, profile store, macro engine, tray/IPC). Renderer: `src/` (Zustand store, panels). Shared types: `electron/types.ts`, imported by both sides.

Hot spots (30 days): `src/i18n/*.json`, `src/App.css`, `src/store/useNagaStore.ts`, `src/components/ButtonsPanel.tsx`, `electron/main.ts`. Sizes: `src/App.css` 1,600 lines, `electron/nagaDriver.ts` 680, `src/store/useNagaStore.ts` 390, `electron/main.ts` 360. No tests.

## One button layout for main and renderer  [Strong]

Files: `electron/profileStore.ts` (306), `src/store/useNagaStore.ts` (390)
Signal: drifted copies. `SIDE_PLATE_LABELS`, `SIDE_DEFAULT_KEYS` and the 9 base buttons are defined twice; PR #1 had to change both, and the RGB defaults have already drifted (`secondaryColor` `#00d9ff` in the renderer, `#00b3ff` in the store).
Problem: changing a default side key (as PR #1 did) or adding a plate means editing two files and hoping they match. The renderer builds new button lists when the plate changes, the store builds them when profiles load or migrate; a mismatch shows up as buttons that change after a restart.
Proposal: `electron/buttonLayout.ts`, pure TypeScript with no Node or Electron imports, so both sides can import it:

```ts
export const SIDE_PLATE_LABELS: Record<SidePlate, readonly string[]>
export const SIDE_DEFAULT_KEYS: readonly string[]
export const buildButtonsForPlate: (plate: SidePlate) => ButtonBinding[]
```

`profileStore.ts` re-uses it for defaults and the legacy side-key migration; `useNagaStore.ts` drops its copies.
Benefits: locality (one place for the button layout), and S10 in the backlog is done.
Proof of same behavior: JSON output of `buildButtonsForPlate` for all three plates is byte-identical before and after; `tsc`, `lint` and the `buttons` snapshot unchanged.
Plan: one commit (new module, both callers moved).

## Device transport separate from device features  [Worth exploring – partly done]

Files: `electron/nagaDriver.ts` (680)
Signal: one file holds USB transport (queue, report building, CRC, SET/GET_REPORT), RGB, DPI, polling rate, button bindings and key-name parsing.
Problem: the hardware findings of the last two days (storage flags, read-back, live DPI) all landed in this file; each feature needs to know about `withDevice`, `sendReport` versus the binding interface, and reply validation.
Proposal: `nagaTransport.ts` (`withDevice`, `query`, `send`, `createReport`) as a deep module; feature files `rgb.ts`, `dpi.ts`, `bindings.ts` on top; `nagaDriver.ts` keeps the exported API.
Benefits: transport rules (one queue, validated replies) live in one place.
Proof: no tests exist and behavior can only be checked on the real mouse, so this needs a hardware check (apply, read back bindings and DPI) before and after. Not for an unattended run.
Status (after M2): the pure part moved to `electron/sideBindings.ts` (bindings read back byte-identical). Splitting the transport itself (`withDevice`, report building) from RGB/DPI is still open.

## Unit tests for pure logic  [Worth exploring – done after M2]

Files: `electron/nagaDriver.ts` (`parseKeyCombo`, `resolveSideAction`), `electron/profileStore.ts` (`migrate`, `migrateLegacySideDefaults`)
Signal: bugs in this logic (legacy `"10"` values blocking Apply) were only found on the user's machine.
Proposal: add `vitest`, export the pure functions (or move them into small modules without `usb`/`electron` imports) and test key parsing and store migration with fixtures, including a copy of a version-2 `profiles.json`.

## Considered, not recommended

- Splitting `src/App.css` into per-panel files: large, but it changes rarely in risky ways and snapshots cover it.
- Splitting `electron/main.ts` (tray, power hooks, polling, IPC): 360 lines and still readable; revisit when the settings window (S7) and app menu (S6) land there.

## Top recommendation

**One button layout for main and renderer** (Strong). Done unattended in this check-in.

After M2: unit tests (vitest, 16 tests) and the pure-module split are done; the main process is now typechecked (`tsconfig.electron.json`), which it was not before.
