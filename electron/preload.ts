import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApplyResult,
  DeviceInfo,
  NagaProfile,
  ProfileStore,
  RgbSettings,
} from './types'

const api = {
  scanDevice: () => ipcRenderer.invoke('device:scan') as Promise<DeviceInfo>,
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
}

contextBridge.exposeInMainWorld('naga', api)

export type NagaApi = typeof api
