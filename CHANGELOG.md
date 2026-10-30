# Changelog

All notable changes to Naga Trinity Control. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] – 2026-10-30

### Added

- **Live DPI readout**: the sidebar and the Performance page follow the DPI+/DPI− buttons on the mouse (polled once per second while the window is visible).
- **RGB restore after re-plugging** the mouse (1.5 s after USB attach). Only RGB is re-applied, nothing is written to EEPROM.
- **App menu with shortcuts** (DE/EN): ⌘S save, ⌘↩ send to mouse, ⌘N new profile, ⌘D duplicate, ⌘1–⌘4 sections, ⌘, settings; Edit and Window menus localised.
- **Settings window** (⌘, or the gear in the sidebar): open at login, RGB off on lock, language. Stays in sync with the tray menu.
- **Macro status**: each macro card shows which side button triggers it (e.g. "Side button 1 · F13") and whether its shortcut is active, pending until the next send, already taken, or not assigned.
- **App icon** (Icon Composer `Icon/AppIcon.icon`, `npm run icon`): mouse silhouette with a 3×3 key grid, no Razer logo.
- **Unit tests** (`npm test`, vitest): key-combo parsing, side-button source IDs per plate, F13–F24 macro mapping, store migration.
- **Snapshot mode** (`scripts/snapshot.sh`): renders each page offscreen with its own data folder and no USB writes, also while the screen is locked.
- `CHANGELOG.md`, `ARCHITECTURE.md`, backlog in `docs/STORIES.md`, architecture review in `docs/architecture-review-2026-10-30.md`.

### Changed

- **DPI stages now survive re-plugging**: they are written to the EEPROM list as well as the runtime list (storage byte `0x01`).
- Base buttons are shown as fixed, read-only bindings, because the firmware does not let them be remapped.
- Lighting preview lights only the real LEDs (scroll wheel and logo); the side plate stays dark.
- Static/Breathing descriptions say what the Trinity firmware really does; the unused second colour is gone.
- Repeat modes "hold" and "toggle" are no longer offered (the shortcut engine only sees key presses); old profiles show them as unsupported.
- Remaining English strings in the German UI translated.
- Performance page fits the window at 1280 and 1080 px.
- Packaging writes to `release/` and skips the native rebuild (the `usb` N-API prebuilds are used as-is).
- Main and renderer share one button layout (`electron/buttonLayout.ts`); pure logic moved to `electron/sideBindings.ts` and `electron/storeMigration.ts`. The main process is now typechecked (`tsconfig.electron.json`, strict).

### Fixed

- Side-button bindings reach the 7-button plate; key, key-combo and Mouse 1–5 bindings are written and read back with retry; all USB access is serialized ([PR #1](https://github.com/cepheiden/Razer-Naga-Trinity-MACOS/pull/1) by [@oc](https://github.com/oc)).
- Apply no longer fails with "Numpad 10 can't be written" for profiles from older versions: legacy side-button defaults (`"1"`…`"12"`, `"F1"`…) are migrated once (store version 3).
- Switching the side plate no longer resets the side-button bindings and macro assignments.
- Live DPI showed the wrong stage (it read the EEPROM list instead of the runtime list).

### Known limitations

- RGB is not stored on the mouse; it is lost on re-plug until the app re-applies it (verified on hardware, storage byte `0x01` does not help).
- Base buttons and the 2-button plate cannot be remapped yet.

## [0.1.0] – 2026-05-12

First version.

- RGB for scroll wheel and logo (static, spectrum, wave, reactive), global brightness.
- DPI stages, active stage and polling rate, stored on the mouse.
- Side-button bindings for the 12-button plate (protocol decoded from a Synapse 3 capture), written to EEPROM.
- Multi-step text macros on side buttons via F13–F24 and `globalShortcut`.
- Wheel tilt left/right bound to Browser back/forward.
- Tray mode, open at login, re-apply on start, RGB off on lock/sleep and restore on unlock/wake.
- German and English UI and tray menu.
