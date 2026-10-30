import type { ButtonBinding, NagaProfile, SidePlate } from './types'

// Reine Binding-Logik (Profil → Source-IDs + Actions), ohne USB – damit testbar. Das Schreiben übernimmt nagaDriver.ts.

// Button-Action aus dem Synapse-Capture (cls 0x02 cmd 0x0c size 0x0a, wIndex=0): args = [slot, source, 0x00, type, paramLen, ...params]. type 0x01 = Maustaste (1 Param), type 0x02 = Taste (2 Params: HID-Modifier-Bitmaske, HID-Code).
export interface ButtonAction {
  type: number
  params: readonly number[]
}

export interface SourceBinding {
  source: number
  action: ButtonAction
}

export const keyAction = (hidCode: number, modifiers = 0): ButtonAction => ({
  type: 0x02,
  params: [modifiers, hidCode],
})

export const mouseAction = (button: number): ButtonAction => ({ type: 0x01, params: [button] })

// Jede Seitenplatte hat eigene Source-IDs: 12er 0x40..0x4b (Synapse-Capture), 7er 0x50..0x56 (Binding-Scan via cmd 0x8c, Factory-Default 1..7). 2er-Platte noch nicht gescannt – bekommt keine Writes. F13..F24 sind die HID-Codes, die wir Makro-Buttons zuweisen – sicher abfangbar via globalShortcut ohne Tipperei-Konflikt.
export const SIDE_PLATE_SOURCES: Record<SidePlate, readonly number[]> = {
  twelve: Array.from({ length: 12 }, (_, index) => 0x40 + index),
  seven: Array.from({ length: 7 }, (_, index) => 0x50 + index),
  two: [],
}
export const RAZER_DEFAULT_SIDE_HID: readonly number[] = [
  0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2d, 0x2e,
]
export const SIDE_BUTTON_MACRO_HID: readonly number[] = [
  0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72, 0x73,
]

// Wheel-Tilt-Tasten (4D-Maus): Sources 0x34 (links) und 0x35 (rechts). Aus Synapse-Capture: Maustaste 4 = Browser-Back, Maustaste 5 = Browser-Forward.
export const WHEEL_TILT_BINDINGS: readonly SourceBinding[] = [
  { source: 0x34, action: mouseAction(0x04) },
  { source: 0x35, action: mouseAction(0x05) },
]

// HID Keyboard Page (0x07), US-Layout-Positionen.
const HID_KEY_CODES = new Map<string, number>([
  ...[...'abcdefghijklmnopqrstuvwxyz'].map((key, index): [string, number] => [key, 0x04 + index]),
  ...[...'1234567890'].map((key, index): [string, number] => [key, 0x1e + index]),
  ...Array.from({ length: 12 }, (_, index): [string, number] => [`f${index + 1}`, 0x3a + index]),
  ...Array.from({ length: 12 }, (_, index): [string, number] => [`f${index + 13}`, 0x68 + index]),
  ['enter', 0x28], ['return', 0x28], ['esc', 0x29], ['escape', 0x29],
  ['backspace', 0x2a], ['tab', 0x2b], ['space', 0x2c],
  ['-', 0x2d], ['=', 0x2e], ['[', 0x2f], [']', 0x30], ['\\', 0x31],
  [';', 0x33], ["'", 0x34], ['`', 0x35], [',', 0x36], ['.', 0x37], ['/', 0x38],
  ['printscreen', 0x46], ['scrolllock', 0x47], ['pause', 0x48], ['insert', 0x49],
  ['home', 0x4a], ['pageup', 0x4b], ['delete', 0x4c], ['end', 0x4d], ['pagedown', 0x4e],
  ['arrowright', 0x4f], ['arrowleft', 0x50], ['arrowdown', 0x51], ['arrowup', 0x52],
])

const HID_MODIFIER_BITS = new Map<string, number>([
  ['ctrl', 0x01], ['strg', 0x01],
  ['shift', 0x02],
  ['alt', 0x04], ['opt', 0x04], ['option', 0x04],
  ['cmd', 0x08], ['command', 0x08],
])

const MOUSE_BUTTON_IDS = new Map<string, number>([
  ['Mouse 1', 0x01], ['Mouse 2', 0x02], ['Mouse 3', 0x03], ['Mouse 4', 0x04], ['Mouse 5', 0x05],
])

export class UnsupportedBindingError extends Error {
  constructor(
    readonly button: string,
    readonly value: string,
  ) {
    super(`${button}: "${value}" kann nicht auf die Maus geschrieben werden.`)
    this.name = 'UnsupportedBindingError'
  }
}

// "F5", "Shift+1", "Ctrl+C" → Key-Action. undefined bei unbekannter Taste oder unbekanntem Modifier.
export const parseKeyCombo = (value: string): ButtonAction | undefined => {
  const [keyName = '', ...modifierNames] = value
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .reverse()
  const hidCode = HID_KEY_CODES.get(keyName)
  const modifierBits = modifierNames.map((name) => HID_MODIFIER_BITS.get(name))
  if (hidCode === undefined || modifierBits.some((bit) => bit === undefined)) return undefined
  return keyAction(
    hidCode,
    modifierBits.reduce<number>((mask, bit) => mask | (bit ?? 0), 0),
  )
}

export const resolveSideAction = (binding: ButtonBinding | undefined, index: number): ButtonAction => {
  if (!binding || binding.action === 'default') return keyAction(RAZER_DEFAULT_SIDE_HID[index])
  if (binding.action === 'macro') {
    return keyAction(binding.macroId ? SIDE_BUTTON_MACRO_HID[index] : RAZER_DEFAULT_SIDE_HID[index])
  }
  if (binding.action === 'key') {
    const action = parseKeyCombo(binding.value)
    if (action) return action
    throw new UnsupportedBindingError(binding.label, binding.value)
  }
  if (binding.action === 'mouse-button') {
    const button = MOUSE_BUTTON_IDS.get(binding.value)
    if (button !== undefined) return mouseAction(button)
    throw new UnsupportedBindingError(binding.label, binding.value)
  }
  throw new UnsupportedBindingError(binding.label, binding.action)
}

export const buildSideBindings = (profile: NagaProfile): SourceBinding[] =>
  SIDE_PLATE_SOURCES[profile.sidePlate].map((source, index) => ({
    source,
    action: resolveSideAction(
      profile.buttons.find((button) => button.id === `side-${index + 1}`),
      index,
    ),
  }))
