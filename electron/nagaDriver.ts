import { findByIds, usb, type Device } from 'usb'
import {
  buildSideBindings,
  UnsupportedBindingError,
  WHEEL_TILT_BINDINGS,
  type SourceBinding,
} from './sideBindings'
import type {
  ApplyResult,
  DeviceInfo,
  DpiSettings,
  LedZone,
  LiveDpi,
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
// HID class request GET_REPORT: device-to-host, class, interface recipient.
const GET_REPORT_REQUEST_TYPE = 0xa1
const GET_REPORT_REQUEST = 0x01

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

// USB-Zugriffe strikt nacheinander: findByIds liefert dasselbe Device-Objekt, ein paralleles close() (z.B. RGB-Preview beim Fensterstart) bricht sonst einen laufenden Apply mit "Device is not open" ab.
let deviceQueue: Promise<unknown> = Promise.resolve()

const withDevice = <T>(task: (device: Device) => Promise<T>): Promise<T> => {
  const run = deviceQueue.then(async () => {
    const device = openDevice()
    try {
      return await task(device)
    } finally {
      closeDevice(device)
    }
  })
  deviceQueue = run.catch(() => undefined)
  return run
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
  // VARSTORE: 0x00 schreibt nur die Laufzeit-Liste, die nach dem Abstecken auf die EEPROM-Liste zurückfällt. 0x01 aktualisiert beide (verifiziert 2026-10-30).
  report[8] = 0x01
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

// Button-Mapping-Reports gehen wie im Synapse-Capture an wIndex 0x00.
const BINDING_INTERFACE = 0x00
const BINDING_WRITE_ATTEMPTS = 5
const RAZER_STATUS_OK = 0x02

const setBindingReport = (device: Device, report: Buffer) =>
  new Promise<void>((resolve, reject) => {
    device.controlTransfer(
      SET_REPORT_REQUEST_TYPE,
      SET_REPORT_REQUEST,
      SET_REPORT_VALUE,
      BINDING_INTERFACE,
      report,
      (err) => (err ? reject(err) : resolve()),
    )
  })

const getBindingReport = (device: Device, iface = BINDING_INTERFACE) =>
  new Promise<Buffer>((resolve, reject) => {
    device.controlTransfer(
      GET_REPORT_REQUEST_TYPE,
      GET_REPORT_REQUEST,
      SET_REPORT_VALUE,
      iface,
      RAZER_REPORT_LEN,
      (err, data) =>
        err || !Buffer.isBuffer(data)
          ? reject(err ?? new Error('Leere USB-Antwort.'))
          : resolve(data),
    )
  })

// Lesen: cmd 0x8c, args [slot, source] → Antwort-Args [slot, source, 0x00, type, paramLen, ...params].
const readButtonBinding = async (device: Device, slot: number, source: number) => {
  const request = createReport(0x02, 0x8c, 0x0a, TX_TRINITY_EFFECT)
  request[8] = slot
  request[9] = source
  setCrc(request)
  await setBindingReport(device, request)
  await wait(20)
  return getBindingReport(device)
}

const isBindingStored = (reply: Buffer, { source, action }: SourceBinding) =>
  reply[0] === RAZER_STATUS_OK &&
  reply[9] === source &&
  reply[11] === action.type &&
  reply[12] === action.params.length &&
  action.params.every((param, index) => reply[13 + index] === param)

// FW verwirft einzelne Writes stillschweigend (z.B. den ersten nach DPI/Polling oder parallel laufende RGB-Previews) – deshalb zurücklesen und mit Backoff wiederholen.
const writeButtonBinding = async (device: Device, slot: number, binding: SourceBinding) => {
  const report = createReport(0x02, 0x0c, 0x0a, TX_TRINITY_EFFECT)
  report[8] = slot
  report[9] = binding.source
  report[10] = 0x00
  report[11] = binding.action.type
  report[12] = binding.action.params.length
  report.set(binding.action.params, 13)
  setCrc(report)

  for (let attempt = 0; attempt < BINDING_WRITE_ATTEMPTS; attempt++) {
    await setBindingReport(device, report)
    await wait(20 * 2 ** attempt)
    if (isBindingStored(await readButtonBinding(device, slot, binding.source), binding)) return
    console.log(`[naga] binding source 0x${binding.source.toString(16)} slot ${slot} not stored, retry ${attempt + 1}`)
  }
  throw new Error(
    `Button-Binding Source 0x${binding.source.toString(16)} (Slot ${slot}) wurde von der Maus nicht übernommen.`,
  )
}

// Synapse-Pattern: erst Slot 2 (pending), dann Slot 1 (commit/active).
const applyButtonBindings = async (device: Device, bindings: readonly SourceBinding[]) => {
  for (const slot of [0x02, 0x01]) {
    for (const binding of bindings) {
      await writeButtonBinding(device, slot, binding)
    }
  }
}

// Live-Abfrage auf iface 0x02 (wie alle Nicht-Binding-Reports). Antworten ohne OK-Status oder mit fremdem cls/cmd verwerfen – bei Fremdzugriffen liefert die FW sonst Müll (z.B. 255/8).
const queryReport = async (device: Device, request: Buffer) => {
  setCrc(request)
  await controlSetReport(device, request, 0x02)
  await wait(20)
  const reply = await getBindingReport(device, 0x02)
  if (reply[0] !== RAZER_STATUS_OK || reply[6] !== request[6] || reply[7] !== request[7]) {
    throw new Error(`Ungültige Antwort auf cls 0x${request[6].toString(16)} cmd 0x${request[7].toString(16)}.`)
  }
  return reply
}

// DPI+/DPI− schaltet die FW selbst um; die Vendor-Notification dazu liegt auf einem von macOS gesperrten Interface, deshalb pollt main.ts diese Abfrage. cmd 0x85 = aktuelle DPI, cmd 0x86 = Stufenliste inkl. aktiver Stufe (verifiziert: beide folgen DPI+/DPI−).
// null = Maus nicht angeschlossen, undefined = Antwort unbrauchbar (Wert beibehalten).
export const readLiveDpi = async (): Promise<LiveDpi | null | undefined> => {
  if (!findByIds(RAZER_VENDOR_ID, NAGA_TRINITY_PRODUCT_ID)) return null
  try {
    return await withDevice(async (device) => {
      const current = await queryReport(device, createReport(DPI_CLASS, 0x85, 0x07))
      // Laufzeit-Liste (0x00) – folgt DPI+/DPI−; die EEPROM-Liste (0x01) kann davon abweichen.
      const stageReply = await queryReport(device, createReport(DPI_CLASS, 0x86, 0x26))
      return {
        x: (current[9] << 8) | current[10],
        y: (current[11] << 8) | current[12],
        stage: stageReply[9],
      }
    })
  } catch {
    return undefined
  }
}

// RGB ist flüchtig und nach jedem Abstecken weg; DPI, Polling und Bindings bleiben im EEPROM (verifiziert per Read-Back nach Replug). main.ts setzt beim Anstecken deshalb nur RGB neu.
export const onNagaAttached = (callback: () => void) => {
  usb.on('attach', (device) => {
    const { idVendor, idProduct } = device.deviceDescriptor
    if (idVendor === RAZER_VENDOR_ID && idProduct === NAGA_TRINITY_PRODUCT_ID) callback()
  })
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
  try {
    const sideBindings = buildSideBindings(profile)
    await withDevice(async (device) => {
      await applyRgb(device, profile.rgb)
      await setDpiStages(device, profile.dpi)
      await setPollingRate(device, profile.pollingRate)
      await applyButtonBindings(device, sideBindings)
      await applyButtonBindings(device, WHEEL_TILT_BINDINGS)
    })
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
    if (error instanceof UnsupportedBindingError) {
      return {
        ok: false,
        message: error.message,
        key: 'driverNotices.unsupportedBinding',
        params: { button: error.button, value: error.value },
      }
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unbekannter USB-Fehler.',
      key: 'driverNotices.usbError',
      params: { detail: error instanceof Error ? error.message : '' },
    }
  }
}

export const setRgbOff = async (): Promise<ApplyResult> => {
  try {
    await withDevice((device) => setGlobalBrightness(device, 0))
    return { ok: true, message: 'RGB ausgeschaltet.', key: 'driverNotices.rgbOff' }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unbekannter USB-Fehler.',
      key: 'driverNotices.usbError',
      params: { detail: error instanceof Error ? error.message : '' },
    }
  }
}

export const applyRgbOnly = async (rgb: RgbSettings): Promise<ApplyResult> => {
  try {
    await withDevice((device) => applyRgb(device, rgb))
    return { ok: true, message: 'RGB aktualisiert.', key: 'driverNotices.rgbUpdated', stage: 'rgb' }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unbekannter USB-Fehler.',
      key: 'driverNotices.usbError',
      params: { detail: error instanceof Error ? error.message : '' },
    }
  }
}
