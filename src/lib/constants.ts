import type {
  PollingRate,
  RgbEffect,
  SidePlate,
} from '../../electron/types'

export interface EffectMeta {
  id: RgbEffect
  label: string
  description: string
}

export const RGB_EFFECTS: EffectMeta[] = [
  { id: 'static', label: 'Static', description: 'Eine durchgehende Farbe pro Zone.' },
  { id: 'breathing', label: 'Breathing', description: 'Sanftes Fade zwischen zwei Farben.' },
  { id: 'spectrum', label: 'Spectrum', description: 'Voller Farbverlauf, hardwaregesteuert.' },
  { id: 'wave', label: 'Wave', description: 'Welle über alle Zonen.' },
  { id: 'reactive', label: 'Reactive', description: 'Aufleuchten beim Klick.' },
  { id: 'off', label: 'Aus', description: 'LEDs vollständig deaktivieren.' },
]

export const POLLING_RATES: Array<{ value: PollingRate; label: string; sublabel: string }> = [
  { value: 125, label: '125 Hz', sublabel: 'Stromsparend' },
  { value: 500, label: '500 Hz', sublabel: 'Ausgewogen' },
  { value: 1000, label: '1000 Hz', sublabel: 'Maximale Präzision' },
]

export const SIDE_PLATES: Array<{ value: SidePlate; label: string; buttons: number; subtitle: string }> = [
  { value: 'two', label: '2-Tasten', buttons: 2, subtitle: 'FPS / Casual' },
  { value: 'seven', label: '7-Tasten', buttons: 7, subtitle: 'MOBA / Action' },
  { value: 'twelve', label: '12-Tasten', buttons: 12, subtitle: 'MMO / Produktivität' },
]

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

export const BUTTON_ACTIONS = [
  { value: 'default', label: 'Standard' },
  { value: 'key', label: 'Taste' },
  { value: 'macro', label: 'Makro' },
  { value: 'dpi-up', label: 'DPI +' },
  { value: 'dpi-down', label: 'DPI -' },
  { value: 'dpi-cycle', label: 'DPI Cycle' },
  { value: 'profile-cycle', label: 'Profil wechseln' },
  { value: 'mouse-button', label: 'Maustaste' },
  { value: 'disabled', label: 'Deaktiviert' },
] as const

export const MOUSE_BUTTONS = ['Mouse 1', 'Mouse 2', 'Mouse 3', 'Mouse 4', 'Mouse 5']

export const REACTIVE_SPEEDS = [
  { value: 1, label: 'Schnell' },
  { value: 2, label: 'Mittel' },
  { value: 3, label: 'Langsam' },
  { value: 4, label: 'Sehr langsam' },
] as const
