import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useRegion } from '../context/useRegion'

const navGroups = [
  {
    label: 'OPERATIONS',
    items: [
      { to: '/dashboard', label: 'Dashboard', end: true, icon: 'home' },
      { to: '/nowcast', label: 'Flood Nowcast', icon: 'forecast' },
      { to: '/risk-map', label: 'Risk Map', icon: 'map' },
      { to: '/emergency-response', label: 'Emergency Response', icon: 'response' },
      { to: '/safe-routes', label: 'Flood-Safe Routes', icon: 'route' },
    ]
  },
  {
    label: 'ANALYSIS',
    items: [
      { to: '/explainable-ai', label: 'Flood Risk Analysis', end: true, icon: 'why' },
      { to: '/explainable-ai?tab=scenarios#scenarios', label: 'Scenario Analysis', icon: 'scenario' },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/data-status', label: 'Data & Model Status', icon: 'status' },
      { to: '#region-selector', label: 'Region', icon: 'region', isRegionAction: true },
    ]
  },
]

function NavIcon({ name }) {
  const icons = {
    home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.8V20h11V9.8" /></>,
    map: <><path d="M9 4.5 4.5 6.2v13.3L9 18l6 1.7 4.5-1.7V4.8L15 6.5 9 4.5Z" /><path d="M9 4.5v13.5M15 6.5v13.2" /></>,
    route: <><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /><path d="M9 8.2c4 0 2.2 7.6 6.2 7.6" /></>,
    forecast: <><path d="M7 16.5a4 4 0 1 1 1.4-7.8A5 5 0 0 1 18.5 12a3.2 3.2 0 1 1 .2 4.5H7Z" /></>,
    why: <><path d="M8 6h8v7.2H8z" /><path d="M10 13.2V17l2-1.2 2 1.2v-3.8" /></>,
    scenario: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>,
    response: <><path d="M12 4.5 13.6 9H18l-3.6 3 1.4 4.6L12 14.2 8.2 16.6 9.6 12 6 9h4.4L12 4.5Z" /></>,
    status: <><rect x="5" y="4" width="14" height="16" rx="1.5" /><path d="M9 9h6M9 12h6M9 15h4" /></>,
    region: <><path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.2" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}

function AppShell() {
  const location = useLocation()
  const [currentTime, setCurrentTime] = useState(new Date())
  const { selectedRegion, setSelectedRegion, currentRegion, regions } = useRegion()

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Brand block */}
        <div className="jd-sidebar-brand">
          <div className="jd-sidebar-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M12 2.7c-3.6 4.5-7 8-7 11.3a7 7 0 0 0 14 0c0-3.3-3.4-6.8-7-11.3Z" />
              <path d="M12 18.5v-5M9.5 16l2.5-2.5L14.5 16" />
            </svg>
          </div>
          <div>
            <strong className="jd-sidebar-title">JALDRISHTI</strong>
            <span className="jd-sidebar-subtitle">Decision Support System</span>
          </div>
        </div>

        {/* Grouped navigation */}
        <nav className="main-nav" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="jd-nav-group">
              <span className="jd-nav-group-label">{group.label}</span>
              {group.items.map((item) =>
                item.isRegionAction ? (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => {
                      const el = document.getElementById('region-selector')
                      if (el) {
                        el.focus()
                        el.click?.()
                      }
                    }}
                    className="nav-link region-nav-btn"
                    title={`Region: ${currentRegion?.name || selectedRegion}`}
                  >
                    <span className="nav-icon"><NavIcon name={item.icon} /></span>
                    <span>Region: <small style={{ color: '#38bdf8', fontWeight: 600 }}>{currentRegion?.shortName || selectedRegion}</small></span>
                  </button>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon"><NavIcon name={item.icon} /></span>
                    {item.label}
                  </NavLink>
                )
              )}
            </div>
          ))}
        </nav>

        {/* Institutional footer */}
        <div className="sidebar-note">
          <div className="gov-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" width="20" height="20">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <div>
              <strong>DECISION SUPPORT PORTAL</strong>
              <p>Municipal Operations · Demonstration</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="jd-topbar-left">
            {/* Government institutional branding */}
            <div className="jd-topbar-brand">
              <div className="jd-topbar-brand-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M12 2.7c-3.6 4.5-7 8-7 11.3a7 7 0 0 0 14 0c0-3.3-3.4-6.8-7-11.3Z" />
                  <path d="M12 18.5v-5M9.5 16l2.5-2.5L14.5 16" />
                </svg>
              </div>
              <div className="jd-topbar-brand-text">
                <span className="jd-topbar-gov">URBAN FLOOD INTELLIGENCE &amp; DECISION SUPPORT SYSTEM</span>
                <span className="jd-topbar-title">
                  JALDRISHTI
                  <span className="jd-topbar-title-sub"> — Municipal Operations Portal</span>
                </span>
              </div>
            </div>

            {/* Region selector */}
            <div className="jd-topbar-divider" />
            <div className="topbar-region-selector-wrapper">
              <svg className="location-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" width="16" height="16">
                <path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21Z" />
                <circle cx="12" cy="9.8" r="2.2" />
              </svg>
              <div className="topbar-select-container">
                <select
                  id="region-selector"
                  className="topbar-region-select"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  aria-label="Select demonstration region"
                >
                  {regions.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="topbar-meta">
            <span className="jd-system-status">
              <span className="jd-status-dot" />
              OPERATIONAL
            </span>
            <div className="jd-topbar-divider-sm" />
            <span className="jd-forecast-badge">0–3 HOUR FLOOD OUTLOOK</span>
            <div className="jd-topbar-divider-sm" />
            <span className="jd-rainfall-badge">
              RAINFALL INPUT · DEMONSTRATION DATA
            </span>
            <div className="jd-topbar-divider-sm" />
            <span className="topbar-clock">
              {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' — '}
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toLowerCase()} IST
            </span>
          </div>
        </header>

        <main className="page-content">
          <div key={`${location.pathname}-${selectedRegion}`} className={`page-transition route-${location.pathname.slice(1).replaceAll('/', '-') || 'dashboard'}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppShell
