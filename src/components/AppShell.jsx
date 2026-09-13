import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useRegion } from '../context/useRegion'
import ashokaEmblem from '../assets/ashoka_emblem.png'

const navigation = [
  { to: '/dashboard', label: 'Dashboard', end: true, icon: 'home' },
  { to: '/risk-map', label: 'Flood Risk Map', icon: 'map' },
  { to: '/safe-routes', label: 'Flood-Safe Routes', icon: 'route' },
  { to: '/nowcast', label: 'AI Nowcast', icon: 'forecast' },
  { to: '/explainable-ai', label: 'Explainable AI', icon: 'why' },
  { to: '/emergency-response', label: 'Emergency Response', icon: 'response' },
]

function NavIcon({ name }) {
  const icons = {
    home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.8V20h11V9.8" /></>,
    map: <><path d="M9 4.5 4.5 6.2v13.3L9 18l6 1.7 4.5-1.7V4.8L15 6.5 9 4.5Z" /><path d="M9 4.5v13.5M15 6.5v13.2" /></>,
    route: <><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /><path d="M9 8.2c4 0 2.2 7.6 6.2 7.6" /></>,
    forecast: <><path d="M7 16.5a4 4 0 1 1 1.4-7.8A5 5 0 0 1 18.5 12a3.2 3.2 0 1 1 .2 4.5H7Z" /></>,
    why: <><path d="M8 6h8v7.2H8z" /><path d="M10 13.2V17l2-1.2 2 1.2v-3.8" /></>,
    response: <><path d="M12 4.5 13.6 9H18l-3.6 3 1.4 4.6L12 14.2 8.2 16.6 9.6 12 6 9h4.4L12 4.5Z" /></>,
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
      <aside className="sidebar" style={{ background: '#0b1c24' }}>
        <nav className="main-nav" aria-label="Primary navigation" style={{ gap: '8px', paddingTop: '12px' }}>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              style={({ isActive }) => ({
                background: isActive ? '#e0f8f1' : 'transparent',
                color: isActive ? '#0f766e' : '#cbd5e1',
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                textDecoration: 'none'
              })}
            >
              <span className="nav-icon"><NavIcon name={item.icon} /></span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="gov-mark">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M6 28h20" />
              <path d="M8 28V14h16v14" />
              <path d="M4 14h24L16 5 4 14Z" />
              <path d="M12 18v6M16 18v6M20 18v6" />
            </svg>
            {/* Change 9: Updated to Ministry of Earth Sciences / Government of India */}
            <div>
              Ministry of Earth Sciences
              <p>Government of India</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Change 1: Government of India formal branding with Ashoka emblem */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRight: '1px solid #e2e8f0', paddingRight: '20px' }}>
              <img
                src={ashokaEmblem}
                alt="Government of India Emblem"
                style={{ height: '44px', width: 'auto', objectFit: 'contain', flexShrink: 0, opacity: 0.88 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#6b7c8d', letterSpacing: '0.6px', textTransform: 'uppercase', lineHeight: 1.2 }}>Government of India</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#6b7c8d', letterSpacing: '0.3px', lineHeight: 1.2 }}>Ministry of Earth Sciences</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1b2b3c', letterSpacing: '-0.2px', lineHeight: 1.3, marginTop: '2px' }}>JalDrishti
                  <span style={{ fontWeight: 500, color: '#6b7c8d', fontSize: '11px' }}> | Urban Flood Monitoring System</span>
                </span>
              </div>
            </div>
            <div className="topbar-region-selector-wrapper">
              <svg className="location-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" width="18" height="18" style={{color: '#14b8a6'}}>
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
            <span className="live-indicator"><span className="status-dot" /> Live Monitoring</span>
            <span className="topbar-clock">
              {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' - '}
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toLowerCase()} IST
            </span>
            <div className="topbar-user" style={{borderLeft: 'none', paddingLeft: 0}}>
              <span className="topbar-avatar" style={{background: '#2b7de9', color: 'white', width: '38px', height: '38px'}}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            </div>
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
