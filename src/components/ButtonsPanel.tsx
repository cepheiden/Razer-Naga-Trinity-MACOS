import { useActiveProfile, useNagaStore } from '../store/useNagaStore'
import { BUTTON_ACTIONS, MOUSE_BUTTONS } from '../lib/constants'
import type { ButtonActionKind, ButtonBinding } from '../../electron/types'

const needsValue = (action: ButtonActionKind) =>
  action === 'key' || action === 'mouse-button' || action === 'macro'

const ACTION_PLACEHOLDERS: Partial<Record<ButtonActionKind, string>> = {
  key: 'z.B. F5, Shift+1, Strg+C',
  'mouse-button': 'Mouse 4',
}

export function ButtonsPanel() {
  const profile = useActiveProfile()
  const updateActive = useNagaStore((state) => state.updateActive)

  const updateButton = (next: ButtonBinding) =>
    updateActive((current) => ({
      ...current,
      buttons: current.buttons.map((button) => (button.id === next.id ? next : button)),
    }))

  const baseButtons = profile.buttons.filter((button) => button.id.startsWith('base-'))
  const sideButtons = profile.buttons.filter((button) => button.id.startsWith('side-'))

  return (
    <div className="section buttons-section">
      <div className="card buttons-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">Standard</p>
            <h3>Maustasten</h3>
          </div>
          <span className="badge muted">{baseButtons.length} Belegungen</span>
        </header>
        <div className="button-grid">
          {baseButtons.map((button) => (
            <BindingRow
              key={button.id}
              binding={button}
              macros={profile.macros}
              onChange={updateButton}
            />
          ))}
        </div>
      </div>

      <div className="card buttons-card">
        <header className="card-head">
          <div>
            <p className="eyebrow">Seitenplatte · {profile.sidePlate.toUpperCase()}</p>
            <h3>Side Panel ({sideButtons.length} Tasten)</h3>
          </div>
          <span className="badge muted">{profile.sidePlate === 'twelve' ? 'MMO' : profile.sidePlate === 'seven' ? 'MOBA' : 'FPS'}</span>
        </header>
        <div className="button-grid">
          {sideButtons.map((button) => (
            <BindingRow
              key={button.id}
              binding={button}
              macros={profile.macros}
              onChange={updateButton}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface BindingRowProps {
  binding: ButtonBinding
  macros: ReturnType<typeof useActiveProfile>['macros']
  onChange(next: ButtonBinding): void
}

function BindingRow({ binding, macros, onChange }: BindingRowProps) {
  const showInput = needsValue(binding.action)

  return (
    <div className="binding-row">
      <div className="binding-label">
        <span className="binding-index">#{binding.hardwareIndex}</span>
        <strong>{binding.label}</strong>
      </div>
      <select
        value={binding.action}
        onChange={(event) =>
          onChange({
            ...binding,
            action: event.target.value as ButtonActionKind,
            value: event.target.value === 'mouse-button' ? 'Mouse 4' : binding.value,
          })
        }
      >
        {BUTTON_ACTIONS.map((action) => (
          <option key={action.value} value={action.value}>
            {action.label}
          </option>
        ))}
      </select>
      {showInput && binding.action === 'macro' ? (
        <select
          value={binding.macroId ?? ''}
          onChange={(event) =>
            onChange({ ...binding, macroId: event.target.value, value: event.target.value })
          }
        >
          <option value="">— Makro wählen —</option>
          {macros.map((macro) => (
            <option key={macro.id} value={macro.id}>
              {macro.name}
            </option>
          ))}
        </select>
      ) : showInput && binding.action === 'mouse-button' ? (
        <select
          value={binding.value}
          onChange={(event) => onChange({ ...binding, value: event.target.value })}
        >
          {MOUSE_BUTTONS.map((mouseButton) => (
            <option key={mouseButton} value={mouseButton}>
              {mouseButton}
            </option>
          ))}
        </select>
      ) : showInput ? (
        <input
          value={binding.value}
          placeholder={ACTION_PLACEHOLDERS[binding.action]}
          onChange={(event) => onChange({ ...binding, value: event.target.value })}
        />
      ) : (
        <div className="binding-static">{binding.value || '—'}</div>
      )}
    </div>
  )
}
