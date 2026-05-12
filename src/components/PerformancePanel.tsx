import { Crosshair, Gauge, Layers, MinusCircle, PlusCircle } from 'lucide-react'
import { useActiveProfile, useNagaStore } from '../store/useNagaStore'
import { DPI_PRESETS, POLLING_RATES, SIDE_PLATES } from '../lib/constants'
import type { PollingRate } from '../../electron/types'

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 11)}`

export function PerformancePanel() {
  const profile = useActiveProfile()
  const updateActive = useNagaStore((state) => state.updateActive)
  const setSidePlate = useNagaStore((state) => state.setSidePlate)
  const { dpi, pollingRate, sidePlate } = profile

  const activeStage = dpi.stages[dpi.activeStage - 1] ?? dpi.stages[0]

  const setStageValue = (stageIndex: number, axis: 'x' | 'y', value: number, link = true) => {
    updateActive((current) => ({
      ...current,
      dpi: {
        ...current.dpi,
        stages: current.dpi.stages.map((stage, index) => {
          if (index !== stageIndex) return stage
          if (link) return { ...stage, x: value, y: value }
          return { ...stage, [axis]: value }
        }),
      },
    }))
  }

  const addStage = () => {
    if (dpi.stages.length >= 5) return
    updateActive((current) => ({
      ...current,
      dpi: {
        ...current.dpi,
        stages: [...current.dpi.stages, { id: newId(), x: 3200, y: 3200 }],
      },
    }))
  }

  const removeStage = (id: string) => {
    if (dpi.stages.length <= 1) return
    updateActive((current) => {
      const stages = current.dpi.stages.filter((stage) => stage.id !== id)
      const active = Math.min(current.dpi.activeStage, stages.length)
      return { ...current, dpi: { stages, activeStage: active || 1 } }
    })
  }

  const setActiveStage = (index: number) => {
    updateActive((current) => ({
      ...current,
      dpi: { ...current.dpi, activeStage: index + 1 },
    }))
  }

  return (
    <div className="section performance-section">
      <div className="card dpi-card">
        <header className="card-head">
          <div>
            <p className="eyebrow"><Crosshair size={12} /> Sensitivität</p>
            <h3>DPI-Stufen</h3>
          </div>
          <button
            type="button"
            className="ghost-button compact"
            onClick={addStage}
            disabled={dpi.stages.length >= 5}
          >
            <PlusCircle size={14} />
            Stufe hinzufügen
          </button>
        </header>

        <div className="dpi-hero">
          <div className="dpi-value">
            <strong>{activeStage?.x ?? 1800}</strong>
            <span>Active DPI</span>
          </div>
          <div className="dpi-meta">
            <span>X · {activeStage?.x ?? 0}</span>
            <span>Y · {activeStage?.y ?? 0}</span>
          </div>
        </div>

        <div className="stage-list">
          {dpi.stages.map((stage, index) => {
            const isActive = index + 1 === dpi.activeStage
            return (
              <div className={`stage-row ${isActive ? 'active' : ''}`} key={stage.id}>
                <button
                  type="button"
                  className="stage-marker"
                  onClick={() => setActiveStage(index)}
                  aria-label={`Stufe ${index + 1} aktivieren`}
                >
                  <span>{index + 1}</span>
                </button>
                <div className="stage-controls">
                  <label>
                    <span>X-DPI</span>
                    <input
                      type="number"
                      min={100}
                      max={16000}
                      step={50}
                      value={stage.x}
                      onChange={(event) =>
                        setStageValue(index, 'x', Number(event.target.value), true)
                      }
                    />
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={16000}
                    step={50}
                    value={stage.x}
                    onChange={(event) =>
                      setStageValue(index, 'x', Number(event.target.value), true)
                    }
                  />
                </div>
                <button
                  type="button"
                  className="icon-button small ghost"
                  onClick={() => removeStage(stage.id)}
                  disabled={dpi.stages.length <= 1}
                  aria-label="Stufe entfernen"
                >
                  <MinusCircle size={15} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="preset-row">
          <span className="preset-label">Schnellauswahl</span>
          <div className="preset-grid">
            {DPI_PRESETS.map((dpiValue) => (
              <button
                key={dpiValue}
                type="button"
                onClick={() =>
                  updateActive((current) => ({
                    ...current,
                    dpi: {
                      ...current.dpi,
                      stages: current.dpi.stages.map((stage, index) =>
                        index === current.dpi.activeStage - 1
                          ? { ...stage, x: dpiValue, y: dpiValue }
                          : stage,
                      ),
                    },
                  }))
                }
              >
                {dpiValue}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card polling-card">
        <header className="card-head">
          <div>
            <p className="eyebrow"><Gauge size={12} /> Reaktionszeit</p>
            <h3>Polling Rate</h3>
          </div>
        </header>

        <div className="polling-grid">
          {POLLING_RATES.map((rate) => (
            <button
              key={rate.value}
              type="button"
              className={`polling-tile ${pollingRate === rate.value ? 'active' : ''}`}
              onClick={() =>
                updateActive((current) => ({
                  ...current,
                  pollingRate: rate.value as PollingRate,
                }))
              }
            >
              <strong>{rate.label}</strong>
              <span>{rate.sublabel}</span>
            </button>
          ))}
        </div>
        <p className="muted small">
          Höhere Polling-Raten erhöhen die Präzision und CPU-Last. 1000 Hz wird für Gaming empfohlen.
        </p>
      </div>

      <div className="card plate-card">
        <header className="card-head">
          <div>
            <p className="eyebrow"><Layers size={12} /> Konfiguration</p>
            <h3>Seitenplatte</h3>
          </div>
        </header>
        <div className="plate-grid">
          {SIDE_PLATES.map((plate) => (
            <button
              key={plate.value}
              type="button"
              className={`plate-tile ${sidePlate === plate.value ? 'active' : ''}`}
              onClick={() => setSidePlate(plate.value)}
            >
              <strong>{plate.label}</strong>
              <span>{plate.subtitle}</span>
              <small>{plate.buttons} Seitentasten</small>
            </button>
          ))}
        </div>
        <p className="muted small">
          Tasten und Belegung werden automatisch angepasst, wenn du die Seitenplatte tauschst.
        </p>
      </div>
    </div>
  )
}
