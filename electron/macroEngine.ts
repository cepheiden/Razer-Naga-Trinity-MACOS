import { globalShortcut } from 'electron'
import { spawn } from 'node:child_process'
import type { Macro, NagaProfile } from './types'

// Side-Button N (1-12) wird beim Apply automatisch auf F(13+N-1) gemappt (siehe nagaDriver.ts SIDE_BUTTON_MACRO_HID). Das hier ist die korrespondierende Accelerator-Tabelle für globalShortcut.
const SIDE_BUTTON_ACCELERATORS: readonly string[] = [
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18',
  'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
]

const APPLESCRIPT_KEY_CODES: Record<string, number> = {
  Enter: 36, Return: 36, Tab: 48, Space: 49,
  Backspace: 51, Esc: 53, Escape: 53,
  ArrowLeft: 123, ArrowRight: 124, ArrowDown: 125, ArrowUp: 126,
}

const escapeForAppleScript = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const runAppleScript = (script: string): Promise<void> =>
  new Promise((resolve) => {
    const p = spawn('osascript', ['-e', script])
    let stderr = ''
    p.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    p.on('close', (code) => {
      if (code !== 0 || stderr.trim().length > 0) {
        console.log('[naga] osascript exit', code, 'stderr:', stderr.trim())
      }
      resolve()
    })
    p.on('error', (err) => {
      console.log('[naga] osascript spawn error:', err.message)
      resolve()
    })
  })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const executeMacro = async (macro: Macro) => {
  const cycles =
    macro.repeatMode === 'count' ? Math.max(1, macro.repeatCount) : 1

  for (let cycle = 0; cycle < cycles; cycle++) {
    for (const step of macro.steps) {
      if (step.type === 'text') {
        if (step.value.length === 0) continue
        const safe = escapeForAppleScript(step.value)
        await runAppleScript(
          `tell application "System Events" to keystroke "${safe}"`,
        )
      } else if (step.type === 'key') {
        const keyCode = APPLESCRIPT_KEY_CODES[step.value]
        if (keyCode !== undefined) {
          await runAppleScript(
            `tell application "System Events" to key code ${keyCode}`,
          )
        } else if (step.value.length > 0) {
          const safe = escapeForAppleScript(step.value)
          await runAppleScript(
            `tell application "System Events" to keystroke "${safe}"`,
          )
        }
      } else if (step.type === 'delay') {
        await sleep(step.delayMs)
        continue
      }
      if (step.delayMs > 0) await sleep(step.delayMs)
    }
  }
}

export const unregisterAllMacroShortcuts = () => {
  globalShortcut.unregisterAll()
}

interface RegistrationResult {
  registered: number
  failed: number
}

export const registerProfileShortcuts = (
  profile: NagaProfile,
): RegistrationResult => {
  globalShortcut.unregisterAll()

  let registered = 0
  let failed = 0

  for (let index = 0; index < 12; index++) {
    const binding = profile.buttons.find((b) => b.id === `side-${index + 1}`)
    if (!binding || binding.action !== 'macro' || !binding.macroId) continue

    const macro = profile.macros.find((m) => m.id === binding.macroId)
    if (!macro) continue

    const accelerator = SIDE_BUTTON_ACCELERATORS[index]
    const ok = globalShortcut.register(accelerator, () => {
      console.log('[naga] shortcut fired:', accelerator, '→ macro:', macro.name)
      void executeMacro(macro).then(() => console.log('[naga] macro done:', macro.name))
    })
    console.log('[naga] register', accelerator, 'for button', index + 1, '→', ok ? 'OK' : 'FAILED')
    if (ok) registered++
    else failed++
  }

  return { registered, failed }
}
