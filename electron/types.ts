export type RgbEffect =
  | 'static'
  | 'breathing'
  | 'spectrum'
  | 'wave'
  | 'reactive'
  | 'off'

export type WaveDirection = 'left' | 'right'

export type ReactiveSpeed = 1 | 2 | 3 | 4

export type LedZone = 'logo' | 'scroll' | 'side'

export interface RgbSettings {
  effect: RgbEffect
  color: string
  secondaryColor: string
  brightness: number
  waveDirection: WaveDirection
  reactiveSpeed: ReactiveSpeed
  syncZones: boolean
  zones: Record<LedZone, { enabled: boolean; color: string }>
}

export type PollingRate = 125 | 500 | 1000

export interface DpiStage {
  id: string
  x: number
  y: number
}

export interface DpiSettings {
  activeStage: number
  stages: DpiStage[]
}

export type SidePlate = 'two' | 'seven' | 'twelve'

export type MacroStepType = 'key' | 'text' | 'delay' | 'mouse'

export interface MacroStep {
  id: string
  type: MacroStepType
  value: string
  delayMs: number
}

export type MacroRepeatMode = 'once' | 'count' | 'while-held' | 'toggle'

export interface Macro {
  id: string
  name: string
  steps: MacroStep[]
  repeatMode: MacroRepeatMode
  repeatCount: number
}

export type ButtonActionKind =
  | 'default'
  | 'key'
  | 'macro'
  | 'dpi-up'
  | 'dpi-down'
  | 'dpi-cycle'
  | 'profile-cycle'
  | 'mouse-button'
  | 'disabled'

export interface ButtonBinding {
  id: string
  label: string
  hardwareIndex: number
  action: ButtonActionKind
  value: string
  macroId?: string
}

export interface NagaProfile {
  id: string
  name: string
  sidePlate: SidePlate
  rgb: RgbSettings
  dpi: DpiSettings
  pollingRate: PollingRate
  buttons: ButtonBinding[]
  macros: Macro[]
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  rgbOffOnLock: boolean
  language?: 'de' | 'en'
}

export interface ProfileStore {
  version: number
  activeProfileId: string
  profiles: NagaProfile[]
  settings?: AppSettings
}

export interface DeviceInfo {
  connected: boolean
  productName?: string
  manufacturer?: string
  vendorId?: number
  productId?: number
  path?: string
  serialNumber?: string
  firmware?: string
  batteryLevel?: number
  interfaces: number
}

export interface ApplyResult {
  ok: boolean
  message: string
  stage?: 'rgb' | 'dpi' | 'polling' | 'complete'
}
