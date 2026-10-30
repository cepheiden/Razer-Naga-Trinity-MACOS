import { describe, expect, it } from 'vitest'
import { buildButtonsForPlate } from './buttonLayout'
import { migrate, STORE_VERSION } from './storeMigration'
import type { ButtonBinding, NagaProfile, SidePlate } from './types'

const legacyButtons = (plate: SidePlate): ButtonBinding[] =>
  buildButtonsForPlate(plate).map((button, index) =>
    button.id.startsWith('side-')
      ? { ...button, value: plate === 'twelve' ? `${index - 8}` : `F${index - 8}` }
      : button,
  )

const storeOf = (version: number, profiles: Array<Partial<NagaProfile>>) => ({
  version,
  activeProfileId: profiles[0]?.id,
  profiles,
})

const sideValues = (profile: NagaProfile) =>
  profile.buttons.filter((button) => button.id.startsWith('side-')).map((button) => button.value)

describe('migrate', () => {
  it('rewrites legacy 12-plate defaults "10"/"11"/"12" once (store < 3)', () => {
    const store = migrate(storeOf(2, [{ id: 'p1', sidePlate: 'twelve', buttons: legacyButtons('twelve') }]))
    expect(store.version).toBe(STORE_VERSION)
    expect(sideValues(store.profiles[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='])
  })

  it('rewrites legacy 7-plate defaults F1..F7 to the factory keys', () => {
    const store = migrate(storeOf(2, [{ id: 'p1', sidePlate: 'seven', buttons: legacyButtons('seven') }]))
    expect(sideValues(store.profiles[0])).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })

  it('keeps user choices: macros and keys that differ from the legacy defaults', () => {
    const buttons = legacyButtons('twelve').map((button) =>
      button.id === 'side-1'
        ? { ...button, action: 'macro' as const, macroId: 'm1', value: 'm1' }
        : button.id === 'side-2'
          ? { ...button, value: 'F5' }
          : button,
    )
    const [profile] = migrate(storeOf(2, [{ id: 'p1', sidePlate: 'twelve', buttons }])).profiles
    expect(profile.buttons.find((button) => button.id === 'side-1')).toMatchObject({ action: 'macro', macroId: 'm1' })
    expect(profile.buttons.find((button) => button.id === 'side-2')?.value).toBe('F5')
  })

  it('leaves version-3 stores alone, so a chosen F1 stays F1', () => {
    const buttons = buildButtonsForPlate('seven').map((button) =>
      button.id === 'side-1' ? { ...button, value: 'F1' } : button,
    )
    const [profile] = migrate(storeOf(3, [{ id: 'p1', sidePlate: 'seven', buttons }])).profiles
    expect(sideValues(profile)[0]).toBe('F1')
  })

  it('falls back to the first profile when the active id is unknown', () => {
    const store = migrate({ version: 3, activeProfileId: 'gone', profiles: [{ id: 'a' }, { id: 'b' }] })
    expect(store.activeProfileId).toBe('a')
  })

  it('creates a default store for unreadable input', () => {
    const store = migrate(null)
    expect(store.profiles).toHaveLength(1)
    expect(store.activeProfileId).toBe(store.profiles[0].id)
  })
})
