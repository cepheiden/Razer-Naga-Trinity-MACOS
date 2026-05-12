import { useEffect } from 'react'
import './App.css'
import { useNagaStore } from './store/useNagaStore'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { NoticeBar } from './components/NoticeBar'
import { LightingPanel } from './components/LightingPanel'
import { PerformancePanel } from './components/PerformancePanel'
import { ButtonsPanel } from './components/ButtonsPanel'
import { MacrosPanel } from './components/MacrosPanel'

function App() {
  const init = useNagaStore((state) => state.init)
  const section = useNagaStore((state) => state.section)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <main className="shell">
      <Sidebar />
      <section className="workspace">
        <Topbar />
        <NoticeBar />
        <div className="content">
          {section === 'lighting' && <LightingPanel />}
          {section === 'performance' && <PerformancePanel />}
          {section === 'buttons' && <ButtonsPanel />}
          {section === 'macros' && <MacrosPanel />}
        </div>
      </section>
    </main>
  )
}

export default App
