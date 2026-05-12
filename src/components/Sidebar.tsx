import { MousePointer2, Plus, Radar, RefreshCw } from 'lucide-react'
import { useActiveProfile, useNagaStore } from '../store/useNagaStore'

export function Sidebar() {
  const device = useNagaStore((state) => state.device)
  const store = useNagaStore((state) => state.store)
  const active = useActiveProfile()
  const selectProfile = useNagaStore((state) => state.selectProfile)
  const createProfile = useNagaStore((state) => state.createProfile)
  const rescan = useNagaStore((state) => state.rescan)

  const activeStage = active.dpi.stages[active.dpi.activeStage - 1] ?? active.dpi.stages[0]

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <MousePointer2 size={20} />
        </div>
        <div className="brand-text">
          <span>Naga Trinity</span>
          <strong>Control Deck</strong>
        </div>
      </div>

      <div className="device-card">
        <div className={`device-orbit ${device.connected ? 'live' : ''}`}>
          <Radar size={28} />
        </div>
        <div className="device-meta">
          <span className={`pill ${device.connected ? 'good' : 'warn'}`}>
            <span className="pill-dot" />
            {device.connected ? 'Verbunden' : 'Nicht gefunden'}
          </span>
          <h2>{device.productName || 'Razer Naga Trinity'}</h2>
          <p>
            VID:PID <strong>1532:0067</strong>
            <span className="dot-sep">·</span>
            {device.interfaces || 0} HID-Interfaces
          </p>
        </div>
        <button
          className="ghost-button compact full-width"
          type="button"
          onClick={() => void rescan()}
        >
          <RefreshCw size={14} />
          Neu scannen
        </button>
      </div>

      <div className="profile-section">
        <header>
          <span>Profile</span>
          <button
            type="button"
            className="icon-button small"
            onClick={() => void createProfile()}
            aria-label="Profil hinzufügen"
          >
            <Plus size={14} />
          </button>
        </header>

        <nav className="profile-list" aria-label="Profile">
          {store.profiles.map((item) => (
            <button
              className={`profile ${item.id === active.id ? 'active' : ''}`}
              key={item.id}
              type="button"
              onClick={() => void selectProfile(item.id)}
            >
              <div className="profile-info">
                <span>{item.name}</span>
                <small>
                  {item.dpi.stages[item.dpi.activeStage - 1]?.x ?? 1800} DPI
                  <span className="dot-sep">·</span>
                  {item.pollingRate}Hz
                </small>
              </div>
              <div
                className="profile-swatch"
                style={{ background: item.rgb.color }}
                aria-hidden
              />
            </button>
          ))}
        </nav>
      </div>

      <footer className="sidebar-footer">
        <span>Aktive Stufe</span>
        <strong>{activeStage?.x ?? 1800} DPI</strong>
      </footer>
    </aside>
  )
}
