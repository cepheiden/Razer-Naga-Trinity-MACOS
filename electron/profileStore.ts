import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { app } from 'electron'
import { join } from 'node:path'
import {
  createDefaultProfile,
  createInitialStore,
  mergeSettings,
  migrate,
  STORE_VERSION,
} from './storeMigration'
import type { AppSettings, NagaProfile, ProfileStore } from './types'

const storePath = () => join(app.getPath('userData'), 'profiles.json')

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
