import { contextBridge, ipcRenderer } from 'electron'
import type { MenuCommand } from './appMenu'
import type {
  AppSettings,
  ApplyResult,
  DeviceInfo,
  LiveDpi,
  MacroStatus,
  NagaProfile,
  ProfileStore,
  RgbSettings,
} from './types'

const api = {
  scanDevice: () => ipcRenderer.invoke('device:scan') as Promise<DeviceInfo>,
  getLiveDpi: () => ipcRenderer.invoke('device:live-dpi') as Promise<LiveDpi | null>,
  onLiveDpi: (callback: (dpi: LiveDpi | null) => void) => {
    const listener = (_event: unknown, dpi: LiveDpi | null) => callback(dpi)
    ipcRenderer.on('device:live-dpi', listener)
    return () => {
      ipcRenderer.removeListener('device:live-dpi', listener)
    }
  },
  readStore: () => ipcRenderer.invoke('store:read') as Promise<ProfileStore>,
  writeStore: (store: ProfileStore) =>
    ipcRenderer.invoke('store:write', store) as Promise<ProfileStore>,
  upsertProfile: (profile: NagaProfile) =>
    ipcRenderer.invoke('profile:upsert', profile) as Promise<ProfileStore>,
  deleteProfile: (id: string) =>
    ipcRenderer.invoke('profile:delete', id) as Promise<ProfileStore>,
  duplicateProfile: (id: string) =>
    ipcRenderer.invoke('profile:duplicate', id) as Promise<ProfileStore>,
  setActiveProfile: (id: string) =>
    ipcRenderer.invoke('profile:set-active', id) as Promise<ProfileStore>,
  applyProfile: (profile: NagaProfile) =>
    ipcRenderer.invoke('profile:apply', profile) as Promise<ApplyResult>,
  previewRgb: (rgb: RgbSettings) =>
    ipcRenderer.invoke('rgb:preview', rgb) as Promise<ApplyResult>,
  getLoginItem: () => ipcRenderer.invoke('app:get-login-item') as Promise<boolean>,
  setLoginItem: (enabled: boolean) =>
    ipcRenderer.invoke('app:set-login-item', enabled) as Promise<boolean>,
  hideWindow: () => ipcRenderer.invoke('app:hide-window') as Promise<void>,
  getMacroStatus: () => ipcRenderer.invoke('macros:status') as Promise<MacroStatus | null>,
  onMacroStatus: (callback: (status: MacroStatus | null) => void) => {
    const listener = (_event: unknown, status: MacroStatus | null) => callback(status)
    ipcRenderer.on('macros:status', listener)
    return () => {
      ipcRenderer.removeListener('macros:status', listener)
    }
  },
  onMenuCommand: (callback: (command: MenuCommand) => void) => {
    const listener = (_event: unknown, command: MenuCommand) => callback(command)
    ipcRenderer.on('menu:command', listener)
    return () => {
      ipcRenderer.removeListener('menu:command', listener)
    }
  },
  getSettings: () => ipcRenderer.invoke('app:get-settings') as Promise<AppSettings>,
  updateSettings: (partial: Partial<AppSettings>) =>
    ipcRenderer.invoke('app:update-settings', partial) as Promise<AppSettings>,
}

contextBridge.exposeInMainWorld('naga', api)

export type NagaApi = typeof api
