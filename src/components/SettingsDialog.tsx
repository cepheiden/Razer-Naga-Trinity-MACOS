import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n'
import { useNagaStore } from '../store/useNagaStore'

// Einstellungen (⌘,): dieselben Schalter wie im Tray-Menü, beim Öffnen frisch aus dem Main-Prozess gelesen, damit Tray-Änderungen sichtbar sind.
export function SettingsDialog() {
  const { t, i18n } = useTranslation()
  const isOpen = useNagaStore((state) => state.isSettingsOpen)
  const setOpen = useNagaStore((state) => state.setSettingsOpen)
  const setLanguage = useNagaStore((state) => state.setLanguage)
  const [openAtLogin, setOpenAtLogin] = useState(false)
  const [rgbOffOnLock, setRgbOffOnLock] = useState(true)
  const doneButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen || !window.naga) return
    void window.naga.getLoginItem().then(setOpenAtLogin)
    void window.naga.getSettings().then((settings) => setRgbOffOnLock(settings.rgbOffOnLock !== false))
    doneButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, setOpen])

  if (!isOpen) return null

  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'de').slice(0, 2) as SupportedLanguage

  const toggleLogin = async (enabled: boolean) => {
    setOpenAtLogin(enabled)
    const actual = await window.naga?.setLoginItem(enabled)
    if (actual !== undefined) setOpenAtLogin(actual)
  }

  const toggleRgbOff = async (enabled: boolean) => {
    setRgbOffOnLock(enabled)
    await window.naga?.updateSettings({ rgbOffOnLock: enabled })
  }

  return (
    <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog-head">
          <h2 id="settings-title">{t('settings.title')}</h2>
          <button
            type="button"
            className="icon-button small ghost"
            onClick={() => setOpen(false)}
            aria-label={t('settings.close')}
          >
            <X size={14} />
          </button>
        </header>

        <label className="setting-row">
          <span>
            <strong>{t('settings.openAtLogin')}</strong>
            <small>{t('settings.openAtLoginHint')}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={openAtLogin}
            onChange={(event) => void toggleLogin(event.target.checked)}
          />
        </label>

        <label className="setting-row">
          <span>
            <strong>{t('settings.rgbOffOnLock')}</strong>
            <small>{t('settings.rgbOffOnLockHint')}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={rgbOffOnLock}
            onChange={(event) => void toggleRgbOff(event.target.checked)}
          />
        </label>

        <div className="setting-row">
          <span>
            <strong>{t('settings.language')}</strong>
          </span>
          <div className="segmented" role="group" aria-label={t('settings.language')}>
            {SUPPORTED_LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                className={currentLang === code ? 'active' : ''}
                aria-pressed={currentLang === code}
                onClick={() => setLanguage(code)}
              >
                {t(`settings.languages.${code}`)}
              </button>
            ))}
          </div>
        </div>

        <footer className="dialog-foot">
          <button
            ref={doneButton}
            type="button"
            className="primary-button"
            onClick={() => setOpen(false)}
          >
            {t('settings.done')}
          </button>
        </footer>
      </div>
    </div>
  )
}
