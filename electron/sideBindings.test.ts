import { describe, expect, it } from 'vitest'
import { buildButtonsForPlate } from './buttonLayout'
import { buildSideBindings, parseKeyCombo, resolveSideAction, UnsupportedBindingError } from './sideBindings'
import type { ButtonBinding, NagaProfile, SidePlate } from './types'

const side = (index: number, patch: Partial<ButtonBinding>): ButtonBinding => ({
  id: `side-${index}`,
  label: `Side ${index}`,
  hardwareIndex: 9 + index,
  action: 'key',
  value: '',
  ...patch,
})

const profileWith = (plate: SidePlate, overrides: ButtonBinding[] = []): NagaProfile =>
  ({
    sidePlate: plate,
    buttons: buildButtonsForPlate(plate).map(
      (button) => overrides.find((entry) => entry.id === button.id) ?? button,
    ),
  }) as NagaProfile

describe('parseKeyCombo', () => {
  it('maps keys to HID usage IDs (keyboard page, US layout)', () => {
    expect(parseKeyCombo('a')).toEqual({ type: 0x02, params: [0x00, 0x04] })
    expect(parseKeyCombo('1')).toEqual({ type: 0x02, params: [0x00, 0x1e] })
    expect(parseKeyCombo('0')).toEqual({ type: 0x02, params: [0x00, 0x27] })
    expect(parseKeyCombo('F5')).toEqual({ type: 0x02, params: [0x00, 0x3e] })
    expect(parseKeyCombo('F13')).toEqual({ type: 0x02, params: [0x00, 0x68] })
    expect(parseKeyCombo('=')).toEqual({ type: 0x02, params: [0x00, 0x2e] })
  })

  it('combines modifiers into the HID bitmask, case-insensitive', () => {
    expect(parseKeyCombo('Shift+1')).toEqual({ type: 0x02, params: [0x02, 0x1e] })
    expect(parseKeyCombo('ctrl+c')).toEqual({ type: 0x02, params: [0x01, 0x06] })
    expect(parseKeyCombo('Strg + Alt + Del'.replace('Del', 'delete'))).toEqual({
      type: 0x02,
      params: [0x05, 0x4c],
    })
    expect(parseKeyCombo('Cmd+Shift+F5')).toEqual({ type: 0x02, params: [0x0a, 0x3e] })
  })

  it('rejects unknown keys and modifiers', () => {
    expect(parseKeyCombo('10')).toBeUndefined()
    expect(parseKeyCombo('Numpad 1')).toBeUndefined()
    expect(parseKeyCombo('Hyper+1')).toBeUndefined()
    expect(parseKeyCombo('')).toBeUndefined()
  })
})

describe('resolveSideAction', () => {
  it('writes the factory key for default bindings', () => {
    expect(resolveSideAction(undefined, 0)).toEqual({ type: 0x02, params: [0x00, 0x1e] })
    expect(resolveSideAction(side(12, { action: 'default' }), 11)).toEqual({
      type: 0x02,
      params: [0x00, 0x2e],
    })
  })

  it('maps macros to F13–F24 only when a macro is picked', () => {
    expect(resolveSideAction(side(1, { action: 'macro', macroId: 'm1' }), 0).params).toEqual([0x00, 0x68])
    expect(resolveSideAction(side(12, { action: 'macro', macroId: 'm1' }), 11).params).toEqual([0x00, 0x73])
    expect(resolveSideAction(side(3, { action: 'macro' }), 2).params).toEqual([0x00, 0x20])
  })

  it('maps mouse buttons to action type 0x01', () => {
    expect(resolveSideAction(side(1, { action: 'mouse-button', value: 'Mouse 4' }), 0)).toEqual({
      type: 0x01,
      params: [0x04],
    })
  })

  it('throws UnsupportedBindingError for values the mouse cannot store', () => {
    expect(() => resolveSideAction(side(10, { value: '10' }), 9)).toThrow(UnsupportedBindingError)
    expect(() => resolveSideAction(side(1, { action: 'dpi-up' }), 0)).toThrow(UnsupportedBindingError)
    expect(() =>
      resolveSideAction(side(1, { action: 'mouse-button', value: 'Mouse 9' }), 0),
    ).toThrow(UnsupportedBindingError)
  })
})

describe('buildSideBindings', () => {
  it('uses 0x40–0x4b for the 12-button plate', () => {
    const bindings = buildSideBindings(profileWith('twelve'))
    expect(bindings.map((binding) => binding.source)).toEqual(
      Array.from({ length: 12 }, (_, index) => 0x40 + index),
    )
    expect(bindings.map((binding) => binding.action.params[1])).toEqual([
      0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2d, 0x2e,
    ])
  })

  it('uses 0x50–0x56 for the 7-button plate', () => {
    const bindings = buildSideBindings(
      profileWith('seven', [side(2, { action: 'macro', macroId: 'm1' })]),
    )
    expect(bindings.map((binding) => binding.source)).toEqual([0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56])
    expect(bindings[1].action.params).toEqual([0x00, 0x69])
  })

  it('writes nothing for the unscanned 2-button plate', () => {
    expect(buildSideBindings(profileWith('two'))).toEqual([])
  })
})
