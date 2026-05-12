import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { app } from 'electron'
import { join } from 'node:path'
import type {
  AppSettings,
  ButtonBinding,
  Macro,
  NagaProfile,
  ProfileStore,
  SidePlate,
} from './types'

const STORE_VERSION = 2

const defaultSettings = (): AppSettings => ({
  rgbOffOnLock: true,
})

const mergeSettings = (incoming: Partial<AppSettings> | undefined): AppSettings => ({
  ...defaultSettings(),
  ...(incoming ?? {}),
})

const SIDE_PLATE_LABELS: Record<SidePlate, string[]> = {
  two: ['Side 1', 'Side 2'],
  seven: ['Side 1', 'Side 2', 'Side 3', 'Side 4', 'Side 5', 'Side 6', 'Side 7'],
  twelve: Array.from({ length: 12 }, (_, index) => `Numpad ${index + 1}`),
}

const BASE_BUTTONS: Array<{ label: string; action: ButtonBinding['action']; value: string }> = [
  { label: 'Left Click', action: 'default', value: 'Mouse 1' },
  { label: 'Right Click', action: 'default', value: 'Mouse 2' },
  { label: 'Scroll Click', action: 'default', value: 'Mouse 3' },
  { label: 'Scroll Up', action: 'default', value: 'Wheel ↑' },
  { label: 'Scroll Down', action: 'default', value: 'Wheel ↓' },
  { label: 'Wheel Tilt Left', action: 'default', value: 'Browser ←' },
  { label: 'Wheel Tilt Right', action: 'default', value: 'Browser →' },
  { label: 'DPI Up', action: 'dpi-up', value: 'DPI +' },
  { label: 'DPI Down', action: 'dpi-down', value: 'DPI -' },
]

export const buildButtonsForPlate = (plate: SidePlate): ButtonBinding[] => {
  const base = BASE_BUTTONS.map((entry, index) => ({
    id: `base-${index + 1}`,
    label: entry.label,
    hardwareIndex: index + 1,
    action: entry.action,
    value: entry.value,
  }))

  const side = SIDE_PLATE_LABELS[plate].map((label, index) => ({
    id: `side-${index + 1}`,
    label,
    hardwareIndex: 10 + index,
    action: 'key' as const,
    value: plate === 'twelve' ? `${index + 1}` : `F${index + 1}`,
  }))

  return [...base, ...side]
}

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

const createInitialStore = (): ProfileStore => {
  const profile = createDefaultProfile({ name: 'Raid / Produktiv' })
  return {
    version: STORE_VERSION,
    activeProfileId: profile.id,
    profiles: [profile],
    settings: defaultSettings(),
  }
}

const storePath = () => join(app.getPath('userData'), 'profiles.json')

const isLegacyArray = (raw: unknown): raw is NagaProfile[] => Array.isArray(raw)

const migrate = (raw: unknown): ProfileStore => {
  if (isLegacyArray(raw)) {
    const profiles = raw.map((legacy) => createDefaultProfile(legacy as Partial<NagaProfile>))
    return {
      version: STORE_VERSION,
      activeProfileId: profiles[0]?.id ?? createInitialStore().activeProfileId,
      profiles: profiles.length > 0 ? profiles : createInitialStore().profiles,
    }
  }

  if (raw && typeof raw === 'object' && 'profiles' in raw) {
    const store = raw as Partial<ProfileStore>
    const profiles = (store.profiles ?? []).map((profile) =>
      createDefaultProfile(profile as Partial<NagaProfile>),
    )
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

export const readStore = async (): Promise<ProfileStore> => {
  try {
    const content = await readFile(storePath(), 'utf8')
    return migrate(JSON.parse(content))
  } catch {
    return createInitialStore()
  }
}

export const writeStore = async (store: ProfileStore): Promise<ProfileStore> => {
  await mkdir(app.getPath('userData'), { recursive: true })
  const next: ProfileStore = {
    ...store,
    version: STORE_VERSION,
    settings: mergeSettings(store.settings),
  }
  await writeFile(storePath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

export const updateSettings = async (
  partial: Partial<AppSettings>,
): Promise<ProfileStore> => {
  const store = await readStore()
  return writeStore({
    ...store,
    settings: mergeSettings({ ...store.settings, ...partial }),
  })
}

export const upsertProfile = async (profile: NagaProfile): Promise<ProfileStore> => {
  const store = await readStore()
  const exists = store.profiles.some((entry) => entry.id === profile.id)
  const stamped: NagaProfile = { ...profile, updatedAt: Date.now() }
  const profiles = exists
    ? store.profiles.map((entry) => (entry.id === profile.id ? stamped : entry))
    : [...store.profiles, stamped]
  return writeStore({ ...store, profiles })
}

export const deleteProfile = async (id: string): Promise<ProfileStore> => {
  const store = await readStore()
  const profiles = store.profiles.filter((profile) => profile.id !== id)
  const fallback = profiles[0] ?? createDefaultProfile()
  const ensured = profiles.length > 0 ? profiles : [fallback]
  return writeStore({
    ...store,
    profiles: ensured,
    activeProfileId:
      store.activeProfileId === id ? ensured[0].id : store.activeProfileId,
  })
}

export const duplicateProfile = async (id: string): Promise<ProfileStore> => {
  const store = await readStore()
  const source = store.profiles.find((profile) => profile.id === id)
  if (!source) return store
  const copy = createDefaultProfile({
    ...source,
    id: randomUUID(),
    name: `${source.name} – Kopie`,
  })
  return writeStore({
    ...store,
    profiles: [...store.profiles, copy],
    activeProfileId: copy.id,
  })
}

export const setActiveProfile = async (id: string): Promise<ProfileStore> => {
  const store = await readStore()
  if (!store.profiles.some((profile) => profile.id === id)) return store
  return writeStore({ ...store, activeProfileId: id })
}
