import { Plus, Trash2 } from 'lucide-react'
import { useActiveProfile, useNagaStore } from '../store/useNagaStore'
import type { MacroRepeatMode, MacroStep, MacroStepType } from '../../electron/types'

const REPEAT_MODES: Array<{ value: MacroRepeatMode; label: string }> = [
  { value: 'once', label: 'Einmalig' },
  { value: 'count', label: 'Anzahl' },
  { value: 'while-held', label: 'Gedrückt halten' },
  { value: 'toggle', label: 'Umschalten' },
]

const STEP_TYPES: Array<{ value: MacroStepType; label: string }> = [
  { value: 'key', label: 'Taste' },
  { value: 'text', label: 'Text' },
  { value: 'mouse', label: 'Maus' },
  { value: 'delay', label: 'Pause' },
]

const stepPreview = (step: MacroStep) => {
  if (step.type === 'delay') return `${step.delayMs} ms`
  if (step.type === 'text') return `"${step.value}"`
  return step.value || step.type
}

export function MacrosPanel() {
  const profile = useActiveProfile()
  const addMacro = useNagaStore((state) => state.addMacro)
  const updateMacro = useNagaStore((state) => state.updateMacro)
  const removeMacro = useNagaStore((state) => state.removeMacro)
  const addMacroStep = useNagaStore((state) => state.addMacroStep)
  const updateMacroStep = useNagaStore((state) => state.updateMacroStep)
  const removeMacroStep = useNagaStore((state) => state.removeMacroStep)

  return (
    <div className="section macros-section">
      <div className="card macros-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">Automatisierung</p>
            <h3>Makros ({profile.macros.length})</h3>
          </div>
          <button type="button" className="soft-button" onClick={addMacro}>
            <Plus size={14} />
            Neues Makro
          </button>
        </header>

        {profile.macros.length === 0 ? (
          <div className="empty">
            <strong>Noch keine Makros</strong>
            <p>Erstelle Makros, um sie später auf Seitentasten zu legen.</p>
          </div>
        ) : (
          <div className="macro-list">
            {profile.macros.map((macro) => (
              <article className="macro-card" key={macro.id}>
                <header className="macro-head">
                  <input
                    className="macro-name"
                    value={macro.name}
                    onChange={(event) => updateMacro({ ...macro, name: event.target.value })}
                  />
                  <div className="macro-controls">
                    <select
                      value={macro.repeatMode}
                      onChange={(event) =>
                        updateMacro({
                          ...macro,
                          repeatMode: event.target.value as MacroRepeatMode,
                        })
                      }
                    >
                      {REPEAT_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                    {macro.repeatMode === 'count' && (
                      <input
                        className="macro-count"
                        type="number"
                        min={1}
                        max={999}
                        value={macro.repeatCount}
                        onChange={(event) =>
                          updateMacro({
                            ...macro,
                            repeatCount: Math.max(1, Number(event.target.value)),
                          })
                        }
                      />
                    )}
                    <button
                      type="button"
                      className="icon-button small ghost"
                      onClick={() => removeMacro(macro.id)}
                      aria-label="Makro löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </header>

                <div className="macro-preview">
                  {macro.steps.map((step, index) => (
                    <span key={step.id} className={`chip ${step.type}`}>
                      <span className="chip-index">{index + 1}</span>
                      {stepPreview(step)}
                    </span>
                  ))}
                </div>

                <div className="step-list">
                  {macro.steps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      onChange={(next) => updateMacroStep(macro.id, next)}
                      onRemove={() => removeMacroStep(macro.id, step.id)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => addMacroStep(macro.id)}
                >
                  <Plus size={13} />
                  Schritt hinzufügen
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface StepRowProps {
  step: MacroStep
  onChange(step: MacroStep): void
  onRemove(): void
}

function StepRow({ step, onChange, onRemove }: StepRowProps) {
  return (
    <div className="step-row">
      <select
        value={step.type}
        onChange={(event) =>
          onChange({ ...step, type: event.target.value as MacroStepType })
        }
      >
        {STEP_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      {step.type === 'delay' ? (
        <input
          type="number"
          min={0}
          max={5000}
          value={step.delayMs}
          onChange={(event) =>
            onChange({ ...step, delayMs: Math.max(0, Number(event.target.value)) })
          }
        />
      ) : (
        <input
          value={step.value}
          placeholder={
            step.type === 'text' ? 'Text eingeben' : step.type === 'mouse' ? 'Mouse 4' : 'Taste'
          }
          onChange={(event) => onChange({ ...step, value: event.target.value })}
        />
      )}
      <button
        type="button"
        className="icon-button small ghost"
        onClick={onRemove}
        aria-label="Schritt entfernen"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
