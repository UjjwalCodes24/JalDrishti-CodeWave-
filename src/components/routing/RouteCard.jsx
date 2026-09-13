import { Panel, RiskBadge } from '../ui'

export default function RouteCard({ route, tone }) {
  if (!route) {
    return (
      <Panel className={`route-card route-unavailable route-${tone}`}>
        <span className="route-card-kicker">
          {tone === 'recommended' ? 'NO PASSABLE ROUTE' : tone === 'alternative' ? 'NO ALTERNATIVE ROUTE' : 'NO ROUTE AVAILABLE'}
        </span>
        <h3>All evaluated routes contain critical flood exposure or blocked road segments.</h3>
        <p className="route-unavailable-desc">Try selecting an alternative departure time or adjusting destination coordinates.</p>
      </Panel>
    )
  }

  const badgeLevel =
    route.safetyRating === 'SAFE'
      ? 'Low'
      : route.safetyRating === 'MODERATE' || route.safetyRating === 'PASSABLE' || route.safetyRating === 'CAUTION'
        ? 'Moderate'
        : 'Critical'

  const cardTone =
    tone === 'recommended'
      ? 'recommended'
      : tone === 'alternative'
        ? 'alternative'
        : 'shortest'

  const scoreColor =
    route.safetyScore >= 80 ? '#10b981' : route.safetyScore >= 60 ? '#f59e0b' : '#ef4444'

  const highlights = Array.isArray(route.highlights) ? route.highlights : []

  return (
    <Panel className={`route-card route-${cardTone}`}>
      <div className="route-card-heading">
        <div>
          <span className="route-card-kicker">
            {cardTone === 'recommended' ? '🟢 RECOMMENDED CORRIDOR' : cardTone === 'alternative' ? '🟡 ALTERNATIVE OPTION' : '🔴 SHORTEST / RISK PROFILE'}
          </span>
          <h3 className="route-card-title">{route.name}</h3>
        </div>
        <RiskBadge level={badgeLevel} />
      </div>

      <div className="route-stat-grid">
        <div className="stat-box">
          <strong style={{ color: scoreColor }}>{route.safetyScore}/100</strong>
          <span>Safety score</span>
        </div>
        <div className="stat-box">
          <strong>{route.distance} km</strong>
          <span>Distance</span>
        </div>
        <div className="stat-box">
          <strong>{route.travelTime} min</strong>
          <span>Est. travel time</span>
        </div>
        <div className="stat-box">
          <strong style={{ color: route.maximumWaterDepth >= 30 ? '#ef4444' : route.maximumWaterDepth >= 15 ? '#f59e0b' : '#10b981' }}>
            {route.maximumWaterDepth} cm
          </strong>
          <span>Max water depth</span>
        </div>
      </div>

      {highlights.length > 0 && (
        <ul className="route-highlights-list">
          {highlights.map((item, idx) => (
            <li key={idx} className={item.startsWith('✓') ? 'highlight-good' : item.startsWith('⛔') ? 'highlight-danger' : 'highlight-warn'}>
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="route-card-footer">
        <span>{route.roadsAvoided || 0} flooded zones avoided</span>
        <span>{route.blockedSegments || 0} blocked roads</span>
      </div>

      {route.reason && <p className="route-reason">{route.reason}</p>}

      {route.googleMapsUrl && (
        <div className="route-card-actions">
          <a
            className={`route-nav-btn ${cardTone === 'recommended' ? 'primary-nav' : 'secondary-nav'}`}
            href={route.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open turn-by-turn navigation in Google Maps"
          >
            <span>OPEN IN GOOGLE MAPS</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}
    </Panel>
  )
}
