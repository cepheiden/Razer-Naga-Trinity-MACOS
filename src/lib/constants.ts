import type {
  PollingRate,
  RgbEffect,
  SidePlate,
} from '../../electron/types'

export const RGB_EFFECT_IDS: readonly RgbEffect[] = [
  'static',
  'breathing',
  'spectrum',
  'wave',
  'reactive',
  'off',
]

// Polling rates: i18n key suffix lives in `i18n` JSON under polling.{lowSub|midSub|highSub}.
export const POLLING_RATES: Array<{ value: PollingRate; label: string; sublabelKey: string }> = [
  { value: 125, label: '125 Hz', sublabelKey: 'polling.lowSub' },
  { value: 500, label: '500 Hz', sublabelKey: 'polling.midSub' },
  { value: 1000, label: '1000 Hz', sublabelKey: 'polling.highSub' },
]

export const SIDE_PLATE_IDS: readonly SidePlate[] = ['two', 'seven', 'twelve']
export const SIDE_PLATE_BUTTONS: Record<SidePlate, number> = {
  two: 2,
  seven: 7,
  twelve: 12,
}

export const DPI_PRESETS = [400, 800, 1600, 1800, 3200, 6400, 12000, 16000]

export const COLOR_SWATCHES = [
  '#00ff66',
  '#00d9ff',
  '#7c5cff',
  '#ff3ea5',
  '#ff7a00',
  '#ffd60a',
  '#ff2d55',
  '#a3ff12',
]

export const BUTTON_ACTION_IDS = [
  'default',
  'key',
  'macro',
  'dpi-up',
  'dpi-down',
  'dpi-cycle',
  'profile-cycle',
  'mouse-button',
  'disabled',
] as const

export const MOUSE_BUTTONS = ['Mouse 1', 'Mouse 2', 'Mouse 3', 'Mouse 4', 'Mouse 5']

export const REACTIVE_SPEEDS: Array<{ value: 1 | 2 | 3 | 4; labelKey: string }> = [
  { value: 1, labelKey: 'reactive.fast' },
  { value: 2, labelKey: 'reactive.medium' },
  { value: 3, labelKey: 'reactive.slow' },
  { value: 4, labelKey: 'reactive.verySlow' },
]
