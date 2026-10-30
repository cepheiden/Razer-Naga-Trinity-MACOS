import { randomUUID } from 'node:crypto'
import { buildButtonsForPlate, SIDE_DEFAULT_KEYS } from './buttonLayout'
import type {
  AppSettings,
  ButtonBinding,
  Macro,
  NagaProfile,
  ProfileStore,
  SidePlate,
} from './types'

// Profil-Defaults und versionierte Migration von profiles.json – ohne Dateizugriff und ohne Electron, damit testbar. profileStore.ts liest/schreibt die Datei.

export const STORE_VERSION = 3

const defaultSettings = (): AppSettings => ({
  rgbOffOnLock: true,
})

export const mergeSettings = (incoming: Partial<AppSettings> | undefined): AppSettings => ({
  ...defaultSettings(),
  ...(incoming ?? {}),
})

export const createDefaultMacro = (): Macro => ({
  id: randomUUID(),
  name: 'Potion + Confirm',
  repeatMode: 'once',
  repeatCount: 1,
  steps: [
    { id: randomUUID(), type: 'key', value: '1', delayMs: 0 },
    { id: randomUUID(), type: 'delay', value: '', delayMs: 120 },
    { id: randomUUID(), type: 'key', value: 'Enter', delayMs: 0 },
  ],
})

const defaultRgb = (): NagaProfile['rgb'] => ({
  effect: 'static',
  color: '#00ff66',
  secondaryColor: '#00b3ff',
  brightness: 80,
  waveDirection: 'right',
  reactiveSpeed: 2,
  syncZones: true,
  zones: {
    logo: { enabled: true, color: '#00ff66' },
    scroll: { enabled: true, color: '#00ff66' },
    side: { enabled: true, color: '#00ff66' },
  },
})

const defaultDpi = (): NagaProfile['dpi'] => ({
  activeStage: 2,
  stages: [
    { id: randomUUID(), x: 800, y: 800 },
    { id: randomUUID(), x: 1800, y: 1800 },
    { id: randomUUID(), x: 3200, y: 3200 },
    { id: randomUUID(), x: 6400, y: 6400 },
    { id: randomUUID(), x: 12000, y: 12000 },
  ],
})

// Migriert Button-Listen aus älteren Profil-Versionen (vor Wheel-Tilt) auf das aktuelle 9-Base-Layout, ohne Side-Buttons-Anpassungen zu verlieren.
const migrateButtons = (
  buttons: ButtonBinding[] | undefined,
  plate: SidePlate,
): ButtonBinding[] => {
  const expected = buildButtonsForPlate(plate)
  if (!buttons) return expected

  // Alt-Layout (vor Wheel-Tilt) hatte DPI Up/Down auf base-6/base-7. Wenn das so ist, Base-Buttons komplett neu setzen und nur Side-Customizings übernehmen.
  const legacyBase6 = buttons.find((b) => b.id === 'base-6')
  const isLegacyLayout = legacyBase6?.action === 'dpi-up'

  if (isLegacyLayout) {
    const sideById = new Map(
      buttons.filter((b) => b.id.startsWith('side-')).map((b) => [b.id, b]),
    )
    return expected.map((entry) =>
      entry.id.startsWith('side-') ? sideById.get(entry.id) ?? entry : entry,
    )
  }

  const byId = new Map(buttons.map((b) => [b.id, b]))
  return expected.map((entry) => byId.get(entry.id) ?? entry)
}

// Bis Store-Version 2 waren die Side-Defaults "1".."12" (12er) bzw. "F1".."F7" (7er/2er). Der Treiber hat 'key' damals ignoriert und immer die Razer-Defaults geschrieben – auf die echten Defaults umstellen, damit Apply dasselbe Verhalten behält ("10".."12" sind keine schreibbaren Tasten).
const legacySideDefault = (plate: SidePlate, index: number) =>
  plate === 'twelve' ? `${index + 1}` : `F${index + 1}`

const migrateLegacySideDefaults = (profile: NagaProfile): NagaProfile => ({
  ...profile,
  buttons: profile.buttons.map((button) => {
    if (!button.id.startsWith('side-') || button.action !== 'key') return button
    const index = Number(button.id.slice('side-'.length)) - 1
    return button.value === legacySideDefault(profile.sidePlate, index)
      ? { ...button, value: SIDE_DEFAULT_KEYS[index] }
      : button
  }),
})

export const createDefaultProfile = (
  overrides: Partial<NagaProfile> = {},
): NagaProfile => {
  const now = Date.now()
  const plate: SidePlate = overrides.sidePlate ?? 'twelve'
  const rgbBase = defaultRgb()
  const incomingRgb = (overrides.rgb ?? {}) as Partial<NagaProfile['rgb']>
  const dpiBase = defaultDpi()
  const incomingDpi = (overrides.dpi ?? {}) as Partial<NagaProfile['dpi']> & {
    x?: number
    y?: number
  }
  const dpiStages =
    incomingDpi.stages && incomingDpi.stages.length > 0
      ? incomingDpi.stages
      : incomingDpi.x && incomingDpi.y
        ? [{ id: randomUUID(), x: incomingDpi.x, y: incomingDpi.y }]
        : dpiBase.stages

  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? 'Standardprofil',
    sidePlate: plate,
    rgb: {
      ...rgbBase,
      ...incomingRgb,
      zones: { ...rgbBase.zones, ...(incomingRgb.zones ?? {}) },
    },
    dpi: {
      activeStage: incomingDpi.activeStage ?? dpiBase.activeStage,
      stages: dpiStages,
    },
    pollingRate: overrides.pollingRate ?? 1000,
    buttons: migrateButtons(overrides.buttons, plate),
    macros: overrides.macros ?? [createDefaultMacro()],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

export const createInitialStore = (): ProfileStore => {
  const profile = createDefaultProfile({ name: 'Raid / Produktiv' })
  return {
    version: STORE_VERSION,
    activeProfileId: profile.id,
    profiles: [profile],
    settings: defaultSettings(),
  }
}

const isLegacyArray = (raw: unknown): raw is NagaProfile[] => Array.isArray(raw)

export const migrate = (raw: unknown): ProfileStore => {
  if (isLegacyArray(raw)) {
    const profiles = raw.map((legacy) =>
      migrateLegacySideDefaults(createDefaultProfile(legacy as Partial<NagaProfile>)),
    )
    return {
      version: STORE_VERSION,
      activeProfileId: profiles[0]?.id ?? createInitialStore().activeProfileId,
      profiles: profiles.length > 0 ? profiles : createInitialStore().profiles,
    }
  }

  if (raw && typeof raw === 'object' && 'profiles' in raw) {
    const store = raw as Partial<ProfileStore>
    const isLegacySideDefaults = (store.version ?? 0) < 3
    const profiles = (store.profiles ?? []).map((profile) => {
      const next = createDefaultProfile(profile as Partial<NagaProfile>)
      return isLegacySideDefaults ? migrateLegacySideDefaults(next) : next
    })
    if (profiles.length === 0) {
      return createInitialStore()
    }
    return {
      version: STORE_VERSION,
      activeProfileId:
        store.activeProfileId && profiles.some((profile) => profile.id === store.activeProfileId)
          ? store.activeProfileId
          : profiles[0].id,
      profiles,
      settings: mergeSettings(store.settings),
    }
  }

  return createInitialStore()
}
