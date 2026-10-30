import { create } from 'zustand'
import i18n from '../i18n'
import { buildButtonsForPlate } from '../../electron/buttonLayout'
import type {
  ApplyResult,
  DeviceInfo,
  LiveDpi,
  Macro,
  MacroStep,
  NagaProfile,
  ProfileStore,
  RgbSettings,
  SidePlate,
} from '../../electron/types'

export type SectionId = 'lighting' | 'performance' | 'buttons' | 'macros'

export interface NagaState {
  store: ProfileStore
  device: DeviceInfo
  /** DPI, die gerade auf der Maus aktiv ist (folgt DPI+/DPI−); null = unbekannt bzw. Maus nicht da. */
  liveDpi: LiveDpi | null
  section: SectionId
  notice: (ApplyResult & { tone: 'info' | 'success' | 'error' }) | null
  isApplying: boolean
  hasUnsavedChanges: boolean

  init(): Promise<void>
  rescan(): Promise<void>
  setSection(section: SectionId): void
  selectProfile(id: string): Promise<void>
  createProfile(): Promise<void>
  duplicateProfile(): Promise<void>
  deleteProfile(id: string): Promise<void>
  updateActive(updater: (profile: NagaProfile) => NagaProfile): void
  updateRgb(updater: (rgb: RgbSettings) => RgbSettings): void
  saveActive(): Promise<void>
  applyActive(): Promise<void>
  setSidePlate(plate: SidePlate): void
  addMacro(): void
  updateMacro(macro: Macro): void
  removeMacro(macroId: string): void
  addMacroStep(macroId: string): void
  updateMacroStep(macroId: string, step: MacroStep): void
  removeMacroStep(macroId: string, stepId: string): void
  dismissNotice(): void
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 11)}`

const fallbackProfile = (): NagaProfile => ({
  id: 'fallback',
  name: 'Naga Trinity',
  sidePlate: 'twelve',
  rgb: {
    effect: 'static',
    color: '#00ff66',
    secondaryColor: '#00d9ff',
    brightness: 80,
    waveDirection: 'right',
    reactiveSpeed: 2,
    syncZones: true,
    zones: {
      logo: { enabled: true, color: '#00ff66' },
      scroll: { enabled: true, color: '#00ff66' },
      side: { enabled: true, color: '#00ff66' },
    },
  },
  dpi: {
    activeStage: 2,
    stages: [
      { id: 's1', x: 800, y: 800 },
      { id: 's2', x: 1800, y: 1800 },
      { id: 's3', x: 3200, y: 3200 },
      { id: 's4', x: 6400, y: 6400 },
      { id: 's5', x: 12000, y: 12000 },
    ],
  },
  pollingRate: 1000,
  buttons: buildButtonsForPlate('twelve'),
  macros: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const fallbackStore = (): ProfileStore => {
  const profile = fallbackProfile()
  return { version: 2, activeProfileId: profile.id, profiles: [profile] }
}

const getActive = (store: ProfileStore): NagaProfile =>
  store.profiles.find((profile) => profile.id === store.activeProfileId) ??
  store.profiles[0]

const replaceActive = (store: ProfileStore, profile: NagaProfile): ProfileStore => ({
  ...store,
  profiles: store.profiles.map((entry) => (entry.id === profile.id ? profile : entry)),
})

const SECTION_IDS: readonly SectionId[] = ['lighting', 'performance', 'buttons', 'macros']

// Snapshot-Modus: main.ts hängt ?section=… an, damit scripts/snapshot.sh jede Seite direkt öffnen kann.
const initialSection = (): SectionId => {
  const requested = new URLSearchParams(window.location.search).get('section')
  return SECTION_IDS.find((id) => id === requested) ?? 'lighting'
}

export const useNagaStore = create<NagaState>((set, get) => ({
  store: fallbackStore(),
  device: { connected: false, interfaces: 0 },
  liveDpi: null,
  section: initialSection(),
  notice: null,
  isApplying: false,
  hasUnsavedChanges: false,

  async init() {
    if (!window.naga) return
    window.naga.onLiveDpi((liveDpi) => set({ liveDpi }))
    const [store, device, liveDpi] = await Promise.all([
      window.naga.readStore(),
      window.naga.scanDevice(),
      window.naga.getLiveDpi(),
    ])
    set({ store, device, liveDpi })
  },

  async rescan() {
    if (!window.naga?.scanDevice) return
    const device = await window.naga.scanDevice()
    set({ device })
  },

  setSection(section) {
    set({ section })
  },

  async selectProfile(id) {
    const current = get().store
    if (window.naga?.setActiveProfile) {
      const store = await window.naga.setActiveProfile(id)
      set({ store, hasUnsavedChanges: false })
    } else {
      set({ store: { ...current, activeProfileId: id }, hasUnsavedChanges: false })
    }
  },

  async createProfile() {
    const current = get().store
    const base = fallbackProfile()
    const profile: NagaProfile = {
      ...base,
      id: newId(),
      name: `Profil ${current.profiles.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    if (window.naga?.upsertProfile) {
      const store = await window.naga.upsertProfile(profile)
      const activated = window.naga.setActiveProfile
        ? await window.naga.setActiveProfile(profile.id)
        : { ...store, activeProfileId: profile.id }
      set({ store: activated, hasUnsavedChanges: false })
    } else {
      set({
        store: {
          ...current,
          profiles: [...current.profiles, profile],
          activeProfileId: profile.id,
        },
        hasUnsavedChanges: false,
      })
    }
  },

  async duplicateProfile() {
    const current = get().store
    if (window.naga?.duplicateProfile) {
      const store = await window.naga.duplicateProfile(current.activeProfileId)
      set({ store, hasUnsavedChanges: false })
      return
    }
    const source = getActive(current)
    const copy: NagaProfile = {
      ...source,
      id: newId(),
      name: `${source.name} – Kopie`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set({
      store: {
        ...current,
        profiles: [...current.profiles, copy],
        activeProfileId: copy.id,
      },
      hasUnsavedChanges: false,
    })
  },

  async deleteProfile(id) {
    const current = get().store
    if (window.naga?.deleteProfile) {
      const store = await window.naga.deleteProfile(id)
      set({ store, hasUnsavedChanges: false })
      return
    }
    const profiles = current.profiles.filter((profile) => profile.id !== id)
    const fallback = fallbackProfile()
    set({
      store: {
        ...current,
        profiles: profiles.length > 0 ? profiles : [fallback],
        activeProfileId:
          current.activeProfileId === id
            ? profiles[0]?.id ?? fallback.id
            : current.activeProfileId,
      },
      hasUnsavedChanges: false,
    })
  },

  updateActive(updater) {
    const current = get().store
    const active = getActive(current)
    const updated = updater(active)
    set({ store: replaceActive(current, updated), hasUnsavedChanges: true })
  },

  updateRgb(updater) {
    get().updateActive((profile) => ({ ...profile, rgb: updater(profile.rgb) }))
  },

  async saveActive() {
    const current = get().store
    const active = getActive(current)
    if (window.naga?.upsertProfile) {
      const store = await window.naga.upsertProfile(active)
      set({
        store,
        hasUnsavedChanges: false,
        notice: { ok: true, message: i18n.t('storeNotices.profileSaved'), tone: 'success' },
      })
    } else {
      set({
        hasUnsavedChanges: false,
        notice: { ok: true, message: i18n.t('storeNotices.profileSaved'), tone: 'success' },
      })
    }
  },

  async applyActive() {
    const current = get().store
    const active = getActive(current)
    set({ isApplying: true, notice: null })
    if (!window.naga?.applyProfile) {
      set({
        isApplying: false,
        notice: {
          ok: false,
          message: i18n.t('storeNotices.bridgeUnavailable'),
          tone: 'error',
        },
      })
      return
    }
    const result = await window.naga.applyProfile(active)
    set({
      isApplying: false,
      hasUnsavedChanges: result.ok ? false : get().hasUnsavedChanges,
      notice: { ...result, tone: result.ok ? 'success' : 'error' },
    })
    if (window.naga.scanDevice) {
      const device = await window.naga.scanDevice()
      set({ device })
    }
  },

  setSidePlate(plate) {
    const active = get().store.profiles.find((entry) => entry.id === get().store.activeProfileId)
    if (active?.sidePlate === plate) return
    // Beim Plattenwechsel Belegungen (inkl. Makro-Zuweisungen) der Seitentasten behalten, die es auf der neuen Platte auch gibt – vorher wurde alles auf Standard zurückgesetzt.
    get().updateActive((profile) => {
      const previous = new Map(profile.buttons.map((button) => [button.id, button]))
      return {
        ...profile,
        sidePlate: plate,
        buttons: buildButtonsForPlate(plate).map((button) => {
          const kept = button.id.startsWith('side-') ? previous.get(button.id) : undefined
          return kept
            ? { ...button, action: kept.action, value: kept.value, macroId: kept.macroId }
            : button
        }),
      }
    })
  },

  addMacro() {
    get().updateActive((profile) => ({
      ...profile,
      macros: [
        ...profile.macros,
        {
          id: newId(),
          name: `Makro ${profile.macros.length + 1}`,
          repeatMode: 'once',
          repeatCount: 1,
          steps: [{ id: newId(), type: 'key', value: 'G', delayMs: 0 }],
        },
      ],
    }))
  },

  updateMacro(macro) {
    get().updateActive((profile) => ({
      ...profile,
      macros: profile.macros.map((item) => (item.id === macro.id ? macro : item)),
    }))
  },

  removeMacro(macroId) {
    get().updateActive((profile) => ({
      ...profile,
      macros: profile.macros.filter((macro) => macro.id !== macroId),
    }))
  },

  addMacroStep(macroId) {
    get().updateActive((profile) => ({
      ...profile,
      macros: profile.macros.map((macro) =>
        macro.id === macroId
          ? {
              ...macro,
              steps: [
                ...macro.steps,
                { id: newId(), type: 'key', value: '', delayMs: 50 },
              ],
            }
          : macro,
      ),
    }))
  },

  updateMacroStep(macroId, step) {
    get().updateActive((profile) => ({
      ...profile,
      macros: profile.macros.map((macro) =>
        macro.id === macroId
          ? {
              ...macro,
              steps: macro.steps.map((item) => (item.id === step.id ? step : item)),
            }
          : macro,
      ),
    }))
  },

  removeMacroStep(macroId, stepId) {
    get().updateActive((profile) => ({
      ...profile,
      macros: profile.macros.map((macro) =>
        macro.id === macroId
          ? { ...macro, steps: macro.steps.filter((step) => step.id !== stepId) }
          : macro,
      ),
    }))
  },

  dismissNotice() {
    set({ notice: null })
  },
}))

export const useActiveProfile = (): NagaProfile =>
  useNagaStore((state) => getActive(state.store))
