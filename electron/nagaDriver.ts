import { findByIds, type Device } from 'usb'
import type {
  ApplyResult,
  DeviceInfo,
  DpiSettings,
  LedZone,
  NagaProfile,
  PollingRate,
  RgbSettings,
} from './types'

const RAZER_VENDOR_ID = 0x1532
const NAGA_TRINITY_PRODUCT_ID = 0x0067
const RAZER_REPORT_LEN = 90

// HID class request SET_REPORT: host-to-device, class, interface recipient.
const SET_REPORT_REQUEST_TYPE = 0x21
const SET_REPORT_REQUEST = 0x09
// wValue: (report type Feature = 0x03) << 8 | report ID 0x00.
const SET_REPORT_VALUE = 0x0300

const LED_CLASS = 0x0f
const DPI_CLASS = 0x04
const POWER_CLASS = 0x00

// Extended-Matrix-Effect-IDs (OpenRazer razer_chroma_extended_matrix_effect_*) – Naga Trinity nutzt dieses Protokoll, NICHT die klassischen Chroma-IDs.
const EFFECT_BYTE: Record<RgbSettings['effect'], number> = {
  off: 0x00,
  static: 0x01,
  breathing: 0x02,
  spectrum: 0x03,
  wave: 0x04,
  reactive: 0x05,
}

// Naga Trinity hat physisch nur 2 RGB-Zonen (scroll 0x01, logo 0x04). 'side' wird auf LED 0x00 (Broadcast an alle Zonen) gemappt – fungiert in der UI als Underglow/Sync-Toggle.
const ZONE_LED_ID: Record<LedZone, number> = {
  scroll: 0x01,
  logo: 0x04,
  side: 0x00,
}

const POLLING_BYTE: Record<PollingRate, number> = {
  125: 0x08,
  500: 0x02,
  1000: 0x01,
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)))

interface Rgb {
  r: number
  g: number
  b: number
}

const parseHexColor = (color: string): Rgb => {
  const normalized = color.replace('#', '').trim()
  const safe = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '00ff66'
  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16),
  }
}

const writeColor = (report: Buffer, offset: number, color: Rgb) => {
  report[offset] = color.r
  report[offset + 1] = color.g
  report[offset + 2] = color.b
}

// Naga Trinity (0x0067) verwendet je nach Befehl unterschiedliche Transaction-IDs (OpenRazer razermouse_driver.c): Brightness=0x3f, Trinity-Static/Breathing=0x1f.
const TX_DEFAULT = 0x3f
const TX_TRINITY_EFFECT = 0x1f

const createReport = (
  commandClass: number,
  commandId: number,
  dataSize: number,
  transactionId: number = TX_DEFAULT,
) => {
  const report = Buffer.alloc(RAZER_REPORT_LEN)
  report[0] = 0x00
  report[1] = transactionId
  report[2] = 0x00
  report[3] = 0x00
  report[4] = 0x00
  report[5] = dataSize
  report[6] = commandClass
  report[7] = commandId
  return report
}

const setCrc = (report: Buffer) => {
  let crc = 0
  for (let index = 2; index < 88; index += 1) {
    crc ^= report[index]
  }
  report[88] = crc
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// macOS blockiert IOHIDDevice-Open auf den geschützten Razer-Interfaces. Wir umgehen das per USB-Control-Transfer auf Endpoint 0 – HID-Permission entfällt.
let cachedInterface: number | undefined

const controlSetReport = (device: Device, report: Buffer, iface: number) =>
  new Promise<void>((resolve, reject) => {
    device.controlTransfer(
      SET_REPORT_REQUEST_TYPE,
      SET_REPORT_REQUEST,
      SET_REPORT_VALUE,
      iface,
      report,
      (err) => (err ? reject(err) : resolve()),
    )
  })

const sendReport = async (device: Device, report: Buffer): Promise<void> => {
  setCrc(report)

  if (cachedInterface !== undefined) {
    await controlSetReport(device, report, cachedInterface)
    return
  }

  // Naga Trinity (0x0067) wendet Reports nur auf iface 0x02 wirklich an – auf iface 0x00 quittiert die FW mit OK, ignoriert sie aber.
  try {
    await controlSetReport(device, report, 0x02)
    cachedInterface = 0x02
    return
  } catch (firstError) {
    try {
      await controlSetReport(device, report, 0x00)
      cachedInterface = 0x00
    } catch {
      throw firstError
    }
  }
}

const openDevice = (): Device => {
  const device = findByIds(RAZER_VENDOR_ID, NAGA_TRINITY_PRODUCT_ID)
  if (!device) {
    // Englischer Default-Text; der Renderer mappt das Pattern auf den i18n-Key 'driverNotices.notFound' falls vorhanden.
    throw new Error('Razer Naga Trinity not found.')
  }
  device.open()
  return device
}

const closeDevice = (device: Device) => {
  try {
    device.close()
  } catch {
    // Schon geschlossen oder Transfer noch im Flug – ignorieren.
  }
}

// Brightness ist auf der Naga Trinity global (LED 0x00 = ZERO_LED), tx_id 0x3f (OpenRazer-Quelle).
const setGlobalBrightness = async (device: Device, brightness: number) => {
  const report = createReport(LED_CLASS, 0x04, 0x03)
  report[8] = 0x01
  report[9] = 0x00
  report[10] = clamp((brightness / 100) * 255, 0, 255)
  await sendReport(device, report)
}

// Trinity-spezifisches Static-Protokoll: 2-Step (Mode-Switcher + cmd 0x03), tx_id 0x1f. Schreibt EINE Farbe gleichzeitig in 3 Slots – die FW kennt kein per-Zonen-Static.
const sendTrinityStaticAll = async (device: Device, color: Rgb) => {
  const switcher = createReport(LED_CLASS, 0x02, 0x06, TX_TRINITY_EFFECT)
  switcher[8] = 0x00
  switcher[9] = 0x00
  switcher[10] = 0x08
  await sendReport(device, switcher)
  await wait(30)

  const report = createReport(LED_CLASS, 0x03, 0x0e, TX_TRINITY_EFFECT)
  report[8] = 0x00
  report[9] = 0x00
  report[10] = 0x00
  report[11] = 0x00
  report[12] = 0x02
  writeColor(report, 13, color)
  writeColor(report, 16, color)
  writeColor(report, 19, color)
  await sendReport(device, report)
}

const applyZoneEffect = async (
  device: Device,
  zone: LedZone,
  rgb: RgbSettings,
  zoneColor: Rgb,
) => {
  if (rgb.effect === 'off') {
    const report = createReport(LED_CLASS, 0x02, 0x03)
    report[8] = 0x01
    report[9] = ZONE_LED_ID[zone]
    report[10] = EFFECT_BYTE.off
    await sendReport(device, report)
    return
  }

  if (rgb.effect === 'spectrum') {
    const report = createReport(LED_CLASS, 0x02, 0x03)
    report[8] = 0x01
    report[9] = ZONE_LED_ID[zone]
    report[10] = EFFECT_BYTE.spectrum
    await sendReport(device, report)
    return
  }

  if (rgb.effect === 'wave') {
    const report = createReport(LED_CLASS, 0x02, 0x06)
    report[8] = 0x01
    report[9] = ZONE_LED_ID[zone]
    report[10] = EFFECT_BYTE.wave
    report[11] = rgb.waveDirection === 'right' ? 0x01 : 0x02
    await sendReport(device, report)
    return
  }

  if (rgb.effect === 'reactive') {
    const report = createReport(LED_CLASS, 0x02, 0x07)
    report[8] = 0x01
    report[9] = ZONE_LED_ID[zone]
    report[10] = EFFECT_BYTE.reactive
    report[11] = clamp(rgb.reactiveSpeed, 1, 4)
    writeColor(report, 12, zoneColor)
    await sendReport(device, report)
  }
}

const turnZoneOff = async (device: Device, zone: LedZone) => {
  const off = createReport(LED_CLASS, 0x02, 0x03)
  off[8] = 0x01
  off[9] = ZONE_LED_ID[zone]
  off[10] = EFFECT_BYTE.off
  await sendReport(device, off)
  await wait(20)
}

const applyRgb = async (device: Device, rgb: RgbSettings) => {
  const masterColor = parseHexColor(rgb.color)

  await setGlobalBrightness(device, rgb.brightness)
  await wait(20)

  // Static und Breathing nutzen das Trinity-eigene Protokoll – setzen alle Zonen auf einmal mit master color. Per-Zonen-Static unterstützt die FW nicht.
  if (rgb.effect === 'static' || rgb.effect === 'breathing') {
    await sendTrinityStaticAll(device, masterColor)
    return
  }

  // Underglow gewinnt: setzt Effekt auf LED 0x00 (Broadcast). Sonst Logo+Scroll einzeln.
  const side = rgb.zones.side
  if (side.enabled) {
    const color = rgb.syncZones ? masterColor : parseHexColor(side.color)
    await applyZoneEffect(device, 'side', rgb, color)
    return
  }

  for (const zone of ['logo', 'scroll'] as const) {
    const config = rgb.zones[zone]
    if (!config.enabled) {
      await turnZoneOff(device, zone)
      continue
    }
    const color = rgb.syncZones ? masterColor : parseHexColor(config.color)
    await applyZoneEffect(device, zone, rgb, color)
    await wait(20)
  }
}

const setDpiStage = async (
  device: Device,
  stageIndex: number,
  x: number,
  y: number,
) => {
  const report = createReport(DPI_CLASS, 0x05, 0x07)
  report[8] = 0x01
  report[9] = (x >> 8) & 0xff
  report[10] = x & 0xff
  report[11] = (y >> 8) & 0xff
  report[12] = y & 0xff
  report[13] = 0x00
  report[14] = 0x00
  void stageIndex
  await sendReport(device, report)
}

const setDpiStages = async (device: Device, dpi: DpiSettings) => {
  const stages = dpi.stages.slice(0, 5)
  const dataSize = 2 + stages.length * 7
  const report = createReport(DPI_CLASS, 0x06, dataSize)
  report[8] = 0x00
  report[9] = clamp(dpi.activeStage, 1, stages.length)
  report[10] = stages.length

  stages.forEach((stage, index) => {
    const base = 11 + index * 7
    const x = clamp(stage.x, 100, 16000)
    const y = clamp(stage.y, 100, 16000)
    report[base] = index + 1
    report[base + 1] = (x >> 8) & 0xff
    report[base + 2] = x & 0xff
    report[base + 3] = (y >> 8) & 0xff
    report[base + 4] = y & 0xff
    report[base + 5] = 0x00
    report[base + 6] = 0x00
  })

  await sendReport(device, report)
  await wait(20)

  const active = stages[clamp(dpi.activeStage, 1, stages.length) - 1] ?? stages[0]
  if (active) {
    await setDpiStage(
      device,
      dpi.activeStage,
      clamp(active.x, 100, 16000),
      clamp(active.y, 100, 16000),
    )
  }
}

const setPollingRate = async (device: Device, rate: PollingRate) => {
  const report = createReport(POWER_CLASS, 0x05, 0x01)
  report[8] = POLLING_BYTE[rate]
  await sendReport(device, report)
}

// Side-Buttons 1..12 haben Razer-interne Source-IDs 0x40..0x4b. F13..F24 sind die HID-Codes, die wir Makro-Buttons zuweisen – sicher abfangbar via globalShortcut ohne Tipperei-Konflikt.
const RAZER_SIDE_BUTTON_SOURCE_OFFSET = 0x40
const RAZER_DEFAULT_SIDE_HID: readonly number[] = [
  0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2d, 0x2e,
]
export const SIDE_BUTTON_MACRO_HID: readonly number[] = [
  0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72, 0x73,
]

// Schreibt ein einzelnes Side-Button-Binding ins EEPROM. Aus Wireshark-Capture: cls 0x02 cmd 0x0c size 0x0a, wIndex=0, args = [slot, 0x40+(idx-1), 0, 0x02, 0x02, 0, hidCode, 0, 0, 0].
const writeSideButtonBinding = async (
  device: Device,
  slot: number,
  buttonIndex: number,
  hidCode: number,
) => {
  const report = createReport(0x02, 0x0c, 0x0a, TX_TRINITY_EFFECT)
  report[8] = slot
  report[9] = RAZER_SIDE_BUTTON_SOURCE_OFFSET + (buttonIndex - 1)
  report[10] = 0x00
  report[11] = 0x02
  report[12] = 0x02
  report[13] = 0x00
  report[14] = hidCode
  setCrc(report)
  await new Promise<void>((resolve, reject) => {
    device.controlTransfer(
      SET_REPORT_REQUEST_TYPE,
      SET_REPORT_REQUEST,
      SET_REPORT_VALUE,
      0x00,
      report,
      (err) => (err ? reject(err) : resolve()),
    )
  })
}

// Synapse-Pattern: erst Slot 2 (pending), dann Slot 1 (commit/active). Beide identisch beschreiben.
const applySideBindings = async (device: Device, hidCodes: readonly number[]) => {
  for (const slot of [0x02, 0x01]) {
    for (let i = 0; i < Math.min(12, hidCodes.length); i++) {
      await writeSideButtonBinding(device, slot, i + 1, hidCodes[i])
      await wait(20)
    }
  }
}

// Wheel-Tilt-Tasten (4D-Maus): Sources 0x34 (links) und 0x35 (rechts). Action-Type 0x01/0x01 (Razer-interne System-Aktion, nicht roher HID-Code). Aus Synapse-Capture: action 0x04 = Browser-Back, action 0x05 = Browser-Forward.
const writeWheelTiltBinding = async (
  device: Device,
  slot: number,
  source: number,
  action: number,
) => {
  const report = createReport(0x02, 0x0c, 0x0a, TX_TRINITY_EFFECT)
  report[8] = slot
  report[9] = source
  report[10] = 0x00
  report[11] = 0x01
  report[12] = 0x01
  report[13] = action
  setCrc(report)
  await new Promise<void>((resolve, reject) => {
    device.controlTransfer(
      SET_REPORT_REQUEST_TYPE,
      SET_REPORT_REQUEST,
      SET_REPORT_VALUE,
      0x00,
      report,
      (err) => (err ? reject(err) : resolve()),
    )
  })
}

const applyWheelTiltDefaults = async (device: Device) => {
  for (const slot of [0x02, 0x01]) {
    await writeWheelTiltBinding(device, slot, 0x34, 0x04)
    await wait(20)
    await writeWheelTiltBinding(device, slot, 0x35, 0x05)
    await wait(20)
  }
}

const buildSideBindings = (profile: NagaProfile): number[] => {
  const codes: number[] = []
  for (let i = 0; i < 12; i++) {
    const binding = profile.buttons.find((b) => b.id === `side-${i + 1}`)
    if (binding?.action === 'macro' && binding.macroId) {
      codes.push(SIDE_BUTTON_MACRO_HID[i])
    } else {
      codes.push(RAZER_DEFAULT_SIDE_HID[i])
    }
  }
  return codes
}

export const listNagaDevices = (): DeviceInfo => {
  const device = findByIds(RAZER_VENDOR_ID, NAGA_TRINITY_PRODUCT_ID)
  if (!device) {
    return { connected: false, interfaces: 0 }
  }

  return {
    connected: true,
    productName: 'Razer Naga Trinity',
    manufacturer: 'Razer',
    vendorId: device.deviceDescriptor.idVendor,
    productId: device.deviceDescriptor.idProduct,
    interfaces: device.configDescriptor?.bNumInterfaces ?? 0,
  }
}

export const applyHardwareProfile = async (
  profile: NagaProfile,
): Promise<ApplyResult> => {
  let device: Device | undefined

  try {
    device = openDevice()
    await applyRgb(device, profile.rgb)
    await setDpiStages(device, profile.dpi)
    await setPollingRate(device, profile.pollingRate)
    const sideCodes = buildSideBindings(profile)
    await applySideBindings(device, sideCodes)
    await applyWheelTiltDefaults(device)
    const macroCount = profile.buttons.filter(
      (b) => b.id.startsWith('side-') && b.action === 'macro' && b.macroId,
    ).length
    return {
      ok: true,
      message:
        macroCount > 0
          ? `RGB, DPI, Polling-Rate und Button-Bindings auf Maus geschrieben. ${macroCount} Side-Buttons auf F13–F24 für Makros gemappt.`
          : 'RGB, DPI, Polling-Rate und Button-Bindings auf Maus geschrieben.',
      key: macroCount > 0 ? 'driverNotices.applyCompleteWithMacros' : 'driverNotices.applyComplete',
      params: { macroCount },
      stage: 'complete',
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unbekannter USB-Fehler.',
      key: 'driverNotices.usbError',
      params: { detail: error instanceof Error ? error.message : '' },
    }
  } finally {
    if (device) closeDevice(device)
  }
}

export const setRgbOff = async (): Promise<ApplyResult> => {
  let device: Device | undefined
  try {
    device = openDevice()
    await setGlobalBrightness(device, 0)
    return { ok: true, message: 'RGB ausgeschaltet.', key: 'driverNotices.rgbOff' }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unbekannter USB-Fehler.',
      key: 'driverNotices.usbError',
      params: { detail: error instanceof Error ? error.message : '' },
    }
  } finally {
    if (device) closeDevice(device)
  }
}

export const applyRgbOnly = async (rgb: RgbSettings): Promise<ApplyResult> => {
  let device: Device | undefined
  try {
    device = openDevice()
    await applyRgb(device, rgb)
    return { ok: true, message: 'RGB aktualisiert.', key: 'driverNotices.rgbUpdated', stage: 'rgb' }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unbekannter USB-Fehler.',
      key: 'driverNotices.usbError',
      params: { detail: error instanceof Error ? error.message : '' },
    }
  } finally {
    if (device) closeDevice(device)
  }
}
