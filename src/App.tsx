/* ── App – Root component with tab navigation ── */
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';

type Tab = 'dashboard' | 'playground';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <>
      {/* Navigation */}
      <nav className="nav">
        <div className="nav__brand">
          <span className="nav__brand-dot" />
          Earth Trend Explorer
        </div>
        <div className="nav__tabs">
          <button
            className={`nav__tab${tab === 'dashboard' ? ' nav__tab--active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav__tab${tab === 'playground' ? ' nav__tab--active' : ''}`}
            onClick={() => setTab('playground')}
          >
            Playground
          </button>
        </div>
      </nav>

      {/* Pages */}
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'playground' && <Playground />}
    </>
  );
}
