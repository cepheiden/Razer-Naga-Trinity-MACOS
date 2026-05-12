import {
  Cpu,
  Keyboard,
  Lightbulb,
  Loader2,
  Save,
  SlidersHorizontal,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react'
import { useActiveProfile, useNagaStore } from '../store/useNagaStore'
import type { SectionId } from '../store/useNagaStore'

const SECTIONS: Array<{ id: SectionId; label: string; icon: typeof Lightbulb }> = [
  { id: 'lighting', label: 'Lighting', icon: Lightbulb },
  { id: 'performance', label: 'Performance', icon: SlidersHorizontal },
  { id: 'buttons', label: 'Tasten', icon: Keyboard },
  { id: 'macros', label: 'Makros', icon: Cpu },
]

export function Topbar() {
  const active = useActiveProfile()
  const section = useNagaStore((state) => state.section)
  const setSection = useNagaStore((state) => state.setSection)
  const updateActive = useNagaStore((state) => state.updateActive)
  const saveActive = useNagaStore((state) => state.saveActive)
  const applyActive = useNagaStore((state) => state.applyActive)
  const duplicateProfile = useNagaStore((state) => state.duplicateProfile)
  const deleteProfile = useNagaStore((state) => state.deleteProfile)
  const isApplying = useNagaStore((state) => state.isApplying)
  const dirty = useNagaStore((state) => state.hasUnsavedChanges)

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="topbar-title">
          <p className="eyebrow">Profil</p>
          <input
            className="profile-name"
            value={active.name}
            onChange={(event) =>
              updateActive((profile) => ({ ...profile, name: event.target.value }))
            }
            spellCheck={false}
          />
          {dirty && <span className="dirty-dot" aria-label="Ungespeicherte Änderungen" />}
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => void duplicateProfile()}
          >
            <Wand2 size={14} />
            Duplizieren
          </button>
          <button
            type="button"
            className="ghost-button danger"
            onClick={() => void deleteProfile(active.id)}
          >
            <Trash2 size={14} />
            Löschen
          </button>
          <button
            type="button"
            className="soft-button"
            onClick={() => void saveActive()}
          >
            <Save size={15} />
            Speichern
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void applyActive()}
            disabled={isApplying}
          >
            {isApplying ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Zap size={15} />
            )}
            {isApplying ? 'Übertrage…' : 'An Maus senden'}
          </button>
        </div>
      </div>

      <nav className="section-tabs" role="tablist">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={section === id}
            className={`section-tab ${section === id ? 'active' : ''}`}
            onClick={() => setSection(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
