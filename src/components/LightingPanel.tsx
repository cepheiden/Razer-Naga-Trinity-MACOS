import { useEffect, useRef } from 'react'
import { Eye, EyeOff, Link2, Link2Off } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useActiveProfile, useNagaStore } from '../store/useNagaStore'
import { MouseVisualizer } from './MouseVisualizer'
import { COLOR_SWATCHES, REACTIVE_SPEEDS, RGB_EFFECT_IDS } from '../lib/constants'
import type {
  LedZone,
  ReactiveSpeed,
  RgbEffect,
  WaveDirection,
} from '../../electron/types'

const ZONE_IDS: readonly LedZone[] = ['logo', 'scroll', 'side']

export function LightingPanel() {
  const { t } = useTranslation()
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
            <p className="eyebrow">{t('lighting.livePreviewEyebrow')}</p>
            <h3>{t('lighting.livePreviewTitle')}</h3>
          </div>
          <span className="badge">{t(`effects.${rgb.effect}.label`)}</span>
        </header>
        <MouseVisualizer profile={profile} />
        <p className="muted">{t(`effects.${rgb.effect}.description`)}</p>
      </div>

      <div className="card effects-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">{t('lighting.effectEyebrow')}</p>
            <h3>{t('lighting.effectTitle')}</h3>
          </div>
        </header>
        <div className="effect-grid">
          {RGB_EFFECT_IDS.map((effectId) => (
            <button
              key={effectId}
              type="button"
              className={`effect-tile ${rgb.effect === effectId ? 'active' : ''}`}
              onClick={() => updateRgb((current) => ({ ...current, effect: effectId as RgbEffect }))}
            >
              <span className="effect-label">{t(`effects.${effectId}.label`)}</span>
              <span className="effect-description">{t(`effects.${effectId}.description`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card color-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">{t('lighting.colorEyebrow')}</p>
            <h3>{t('lighting.primaryColor')}</h3>
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
                aria-label={`${t('lighting.colorAria')} ${swatch}`}
                onClick={() => updateRgb((current) => ({ ...current, color: swatch }))}
              />
            ))}
          </div>
        </div>

        {usesSecondary && (
          <>
            <header className="card-head sub">
              <div>
                <p className="eyebrow">{t('lighting.colorEyebrow')}</p>
                <h3>{t('lighting.secondaryColor')}</h3>
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
                    aria-label={`${t('lighting.secondaryColorAria')} ${swatch}`}
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
            <span>{t('lighting.brightness')}</span>
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
            <span className="segment-label">{t('lighting.waveDirection')}</span>
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
                  {direction === 'left' ? t('lighting.waveLeft') : t('lighting.waveRight')}
                </button>
              ))}
            </div>
          </div>
        )}

        {usesReactiveSpeed && (
          <div className="segment-control">
            <span className="segment-label">{t('lighting.reactiveSpeed')}</span>
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
                  {t(speed.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card zones-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">{t('lighting.zonesEyebrow')}</p>
            <h3>{t('lighting.zonesTitle')}</h3>
          </div>
          <button
            type="button"
            className={`toggle-button ${rgb.syncZones ? 'active' : ''}`}
            onClick={() =>
              updateRgb((current) => ({ ...current, syncZones: !current.syncZones }))
            }
          >
            {rgb.syncZones ? <Link2 size={14} /> : <Link2Off size={14} />}
            {rgb.syncZones ? t('lighting.zonesSync') : t('lighting.zonesIndividual')}
          </button>
        </header>

        <div className="zone-grid">
          {ZONE_IDS.map((zoneId) => {
            const zoneConfig = rgb.zones[zoneId]
            const zoneLabel = t(`zones.${zoneId}.label`)
            const zoneDescription = t(`zones.${zoneId}.description`)
            const toggleLabel = zoneConfig.enabled
              ? t('lighting.zoneDeactivate')
              : t('lighting.zoneActivate')
            return (
              <div className={`zone-tile ${zoneConfig.enabled ? '' : 'disabled'}`} key={zoneId}>
                <div className="zone-head">
                  <div>
                    <strong>{zoneLabel}</strong>
                    <small>{zoneDescription}</small>
                  </div>
                  <button
                    type="button"
                    className="icon-button small"
                    aria-label={`${zoneLabel} ${toggleLabel}`}
                    onClick={() =>
                      updateRgb((current) => ({
                        ...current,
                        zones: {
                          ...current.zones,
                          [zoneId]: {
                            ...current.zones[zoneId],
                            enabled: !current.zones[zoneId].enabled,
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
                        [zoneId]: { ...current.zones[zoneId], color: event.target.value },
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
