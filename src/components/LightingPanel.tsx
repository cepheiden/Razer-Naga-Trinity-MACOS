import { useEffect, useRef } from 'react'
import { Eye, EyeOff, Link2, Link2Off } from 'lucide-react'
import { useActiveProfile, useNagaStore } from '../store/useNagaStore'
import { MouseVisualizer } from './MouseVisualizer'
import { COLOR_SWATCHES, REACTIVE_SPEEDS, RGB_EFFECTS } from '../lib/constants'
import type {
  LedZone,
  ReactiveSpeed,
  RgbEffect,
  WaveDirection,
} from '../../electron/types'

const ZONES: Array<{ id: LedZone; label: string; description: string }> = [
  { id: 'logo', label: 'Logo', description: 'Razer-Logo am Heck' },
  { id: 'scroll', label: 'Scroll', description: 'Mausrad-Beleuchtung' },
  { id: 'side', label: 'Underglow', description: 'Synchron auf alle Zonen' },
]

export function LightingPanel() {
  const profile = useActiveProfile()
  const updateRgb = useNagaStore((state) => state.updateRgb)
  const { rgb } = profile

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!window.naga?.previewRgb) return
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => {
      void window.naga.previewRgb(rgb)
    }, 240)
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current)
    }
  }, [rgb])

  const usesSecondary = rgb.effect === 'breathing'
  const usesWaveDirection = rgb.effect === 'wave'
  const usesReactiveSpeed = rgb.effect === 'reactive'
  const supportsColor =
    rgb.effect === 'static' || rgb.effect === 'breathing' || rgb.effect === 'reactive'

  return (
    <div className="section lighting-section">
      <div className="card stage-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">Live-Vorschau</p>
            <h3>Beleuchtungssimulation</h3>
          </div>
          <span className="badge">{RGB_EFFECTS.find((effect) => effect.id === rgb.effect)?.label}</span>
        </header>
        <MouseVisualizer profile={profile} />
        <p className="muted">
          {RGB_EFFECTS.find((effect) => effect.id === rgb.effect)?.description}
        </p>
      </div>

      <div className="card effects-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">Effekt</p>
            <h3>RGB-Modus</h3>
          </div>
        </header>
        <div className="effect-grid">
          {RGB_EFFECTS.map((effect) => (
            <button
              key={effect.id}
              type="button"
              className={`effect-tile ${rgb.effect === effect.id ? 'active' : ''}`}
              onClick={() =>
                updateRgb((current) => ({ ...current, effect: effect.id as RgbEffect }))
              }
            >
              <span className="effect-label">{effect.label}</span>
              <span className="effect-description">{effect.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card color-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">Farbe</p>
            <h3>Primärfarbe</h3>
          </div>
          <div className="hex-readout">{rgb.color.toUpperCase()}</div>
        </header>

        <div className="color-row">
          <input
            type="color"
            value={rgb.color}
            onChange={(event) =>
              updateRgb((current) => ({ ...current, color: event.target.value }))
            }
            disabled={!supportsColor && rgb.effect !== 'spectrum'}
          />
          <div className="swatches">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`swatch ${rgb.color === swatch ? 'selected' : ''}`}
                style={{ background: swatch }}
                aria-label={`Farbe ${swatch}`}
                onClick={() => updateRgb((current) => ({ ...current, color: swatch }))}
              />
            ))}
          </div>
        </div>

        {usesSecondary && (
          <>
            <header className="card-head sub">
              <div>
                <p className="eyebrow">Farbe</p>
                <h3>Sekundärfarbe</h3>
              </div>
              <div className="hex-readout">{rgb.secondaryColor.toUpperCase()}</div>
            </header>
            <div className="color-row">
              <input
                type="color"
                value={rgb.secondaryColor}
                onChange={(event) =>
                  updateRgb((current) => ({
                    ...current,
                    secondaryColor: event.target.value,
                  }))
                }
              />
              <div className="swatches">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`swatch ${rgb.secondaryColor === swatch ? 'selected' : ''}`}
                    style={{ background: swatch }}
                    aria-label={`Sekundärfarbe ${swatch}`}
                    onClick={() =>
                      updateRgb((current) => ({ ...current, secondaryColor: swatch }))
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="slider-row">
          <label>
            <span>Helligkeit</span>
            <input
              type="range"
              min={0}
              max={100}
              value={rgb.brightness}
              onChange={(event) =>
                updateRgb((current) => ({
                  ...current,
                  brightness: Number(event.target.value),
                }))
              }
            />
            <output>{rgb.brightness}%</output>
          </label>
        </div>

        {usesWaveDirection && (
          <div className="segment-control">
            <span className="segment-label">Wellenrichtung</span>
            <div className="segment">
              {(['left', 'right'] as WaveDirection[]).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className={rgb.waveDirection === direction ? 'active' : ''}
                  onClick={() =>
                    updateRgb((current) => ({ ...current, waveDirection: direction }))
                  }
                >
                  {direction === 'left' ? '← Links' : 'Rechts →'}
                </button>
              ))}
            </div>
          </div>
        )}

        {usesReactiveSpeed && (
          <div className="segment-control">
            <span className="segment-label">Reaktionsgeschwindigkeit</span>
            <div className="segment">
              {REACTIVE_SPEEDS.map((speed) => (
                <button
                  key={speed.value}
                  type="button"
                  className={rgb.reactiveSpeed === speed.value ? 'active' : ''}
                  onClick={() =>
                    updateRgb((current) => ({
                      ...current,
                      reactiveSpeed: speed.value as ReactiveSpeed,
                    }))
                  }
                >
                  {speed.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card zones-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">Zonen</p>
            <h3>Individuelle Steuerung</h3>
          </div>
          <button
            type="button"
            className={`toggle-button ${rgb.syncZones ? 'active' : ''}`}
            onClick={() =>
              updateRgb((current) => ({ ...current, syncZones: !current.syncZones }))
            }
          >
            {rgb.syncZones ? <Link2 size={14} /> : <Link2Off size={14} />}
            {rgb.syncZones ? 'Zonen synchronisiert' : 'Pro Zone konfigurieren'}
          </button>
        </header>

        <div className="zone-grid">
          {ZONES.map((zone) => {
            const zoneConfig = rgb.zones[zone.id]
            return (
              <div className={`zone-tile ${zoneConfig.enabled ? '' : 'disabled'}`} key={zone.id}>
                <div className="zone-head">
                  <div>
                    <strong>{zone.label}</strong>
                    <small>{zone.description}</small>
                  </div>
                  <button
                    type="button"
                    className="icon-button small"
                    aria-label={`Zone ${zone.label} ${zoneConfig.enabled ? 'deaktivieren' : 'aktivieren'}`}
                    onClick={() =>
                      updateRgb((current) => ({
                        ...current,
                        zones: {
                          ...current.zones,
                          [zone.id]: {
                            ...current.zones[zone.id],
                            enabled: !current.zones[zone.id].enabled,
                          },
                        },
                      }))
                    }
                  >
                    {zoneConfig.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                <input
                  type="color"
                  value={rgb.syncZones ? rgb.color : zoneConfig.color}
                  disabled={rgb.syncZones || !zoneConfig.enabled}
                  onChange={(event) =>
                    updateRgb((current) => ({
                      ...current,
                      zones: {
                        ...current.zones,
                        [zone.id]: { ...current.zones[zone.id], color: event.target.value },
                      },
                    }))
                  }
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
