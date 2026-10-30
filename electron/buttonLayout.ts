import type { ButtonBinding, SidePlate } from './types'

// Gemeinsames Tasten-Layout für Main (profileStore) und Renderer (useNagaStore). Bewusst ohne Node-/Electron-Imports, damit Vite es in den Renderer bündeln kann.

export const SIDE_PLATE_LABELS: Record<SidePlate, readonly string[]> = {
  two: ['Side 1', 'Side 2'],
  seven: ['Side 1', 'Side 2', 'Side 3', 'Side 4', 'Side 5', 'Side 6', 'Side 7'],
  twelve: Array.from({ length: 12 }, (_, index) => `Numpad ${index + 1}`),
}

// Was die Maus ab Werk sendet (HID 0x1e..0x27, 0x2d, 0x2e).
export const SIDE_DEFAULT_KEYS: readonly string[] = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
]

const BASE_BUTTONS: ReadonlyArray<Pick<ButtonBinding, 'label' | 'action' | 'value'>> = [
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
    value: SIDE_DEFAULT_KEYS[index],
  }))

  return [...base, ...side]
}
