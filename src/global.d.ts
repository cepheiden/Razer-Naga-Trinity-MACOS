import type { NagaApi } from '../electron/preload'

declare global {
  interface Window {
    naga: NagaApi
  }
}

export {}
