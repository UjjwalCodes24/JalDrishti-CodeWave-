import { Panel } from '../ui'

/**
 * Professional Municipal Route Card
 * Implements Section 9, 10, 12: Route Comparison, Route Safety Explanation, Shortest vs Flood-Exposure
 */
export default function RouteCard({
  route,
  index = 0,
  isSelected = false,
  onSelect,
  isShortest = false,
  isLowerExposure = false,
}) {
  if (!route) {
    return (
      <Panel className="route-card route-unavailable">
        <span className="route-card-kicker">EVALUATING ROUTE ALTERNATIVE</span>
        <h3>No viable route corridor identified for this parameter set.</h3>
        <p className="route-unavailable-desc">
          Predicted flood depths along direct corridors exceed passable vehicle thresholds.
        </p>
      </Panel>
    )
  }

  // Derive Route Status strictly as per requirement 9:
  // LOWER FLOOD EXPOSURE / ELEVATED FLOOD EXPOSURE / HIGH FLOOD EXPOSURE
  const maxDepth = route.maximumWaterDepth ?? route.floodDepth ?? 0
  const blockedCount = route.blockedSegments ?? route.blockedRoads ?? 0
  const floodedCount = route.floodedSegments ?? 0

  let routeStatus = 'ELEVATED FLOOD EXPOSURE'
  let statusTone = 'warning'

  if (maxDepth < 15 && blockedCount === 0 && floodedCount === 0) {
    routeStatus = 'LOWER FLOOD EXPOSURE'
    statusTone = 'safe'
  } else if (maxDepth >= 30 || blockedCount > 0 || route.floodExposure === 'CRITICAL') {
    routeStatus = 'HIGH FLOOD EXPOSURE'
    statusTone = 'danger'
  } else {
    routeStatus = 'ELEVATED FLOOD EXPOSURE'
    statusTone = 'warning'
  }

  // Factual reasons based on calculated data (Section 10)
  const formattedDepth = typeof maxDepth === 'number' ? Number(maxDepth.toFixed(1)) : maxDepth
  const factualReasons = []
  if (isLowerExposure || maxDepth < 15) {
    factualReasons.push('Lower predicted flood exposure across evaluated corridor.')
  }
  if (blockedCount === 0) {
    factualReasons.push('Avoids modeled high-risk road segments.')
  } else {
    factualReasons.push(`Contains ${blockedCount} impassable road segment(s) with severe predicted depth.`)
  }
  if (maxDepth > 0) {
    factualReasons.push(`Maximum predicted depth reaches ${formattedDepth} cm.`)
  } else {
    factualReasons.push('Zero predicted standing water along this alignment.')
  }
  if (route.drainageRisk === 'Low') {
    factualReasons.push('Reduced exposure to overloaded drainage corridors.')
  } else if (route.drainageRisk === 'Elevated') {
    factualReasons.push('Elevated exposure to surcharging drainage nodes.')
  }
  if (isShortest) {
    factualReasons.push(`Shortest direct distance (${route.distance} km, ${route.travelTime} min travel time).`)
  }

  return (
    <Panel
      className={`route-card ${isSelected ? 'selected' : ''} ${
        isLowerExposure ? 'card-lower-exposure' : isShortest ? 'card-shortest' : ''
      }`}
      onClick={() => onSelect && onSelect(route)}
    >
      {/* Route header with distinction (Section 12) */}
      <div className="route-card-heading">
        <div>
          <div className="route-tags-row">
            <span className="route-num-badge">ROUTE {index + 1}</span>
            {isShortest && <span className="route-distinction-tag shortest">SHORTEST ROUTE</span>}
            {isLowerExposure && (
              <span className="route-distinction-tag lower-exposure">LOWER PREDICTED FLOOD EXPOSURE</span>
            )}
            {!isShortest && !isLowerExposure && (
              <span className="route-distinction-tag alternative">ALTERNATIVE CORRIDOR</span>
            )}
          </div>
          <h3 className="route-card-title">{route.name || `Route Alternative ${index + 1}`}</h3>
        </div>

        {/* Route Status Badge (Section 9) */}
        <span className={`route-status-pill status-${statusTone}`}>{routeStatus}</span>
      </div>

      {/* Required operational metrics grid (Section 9) */}
      <div className="route-stat-grid">
        <div className="stat-box">
          <span className="stat-label">DISTANCE</span>
          <strong className="stat-value">{route.distance} km</strong>
        </div>
        <div className="stat-box">
          <span className="stat-label">TRAVEL TIME</span>
          <strong className="stat-value">{route.travelTime} min</strong>
        </div>
        <div className="stat-box">
          <span className="stat-label">JALDRISHTI FLOOD EXPOSURE</span>
          <strong
            className="stat-value"
            style={{
              color:
                route.floodExposure === 'CRITICAL'
                  ? '#dc2626'
                  : route.floodExposure === 'HIGH'
                  ? '#ea580c'
                  : route.floodExposure === 'MODERATE'
                  ? '#d97706'
                  : '#059669',
            }}
          >
            {route.floodExposure || 'LOW'}
          </strong>
        </div>
        <div className="stat-box">
          <span className="stat-label">MAX PREDICTED DEPTH</span>
          <strong
            className="stat-value"
            style={{ color: maxDepth >= 30 ? '#dc2626' : maxDepth >= 15 ? '#ea580c' : '#1e293b' }}
          >
            {formattedDepth} cm
          </strong>
        </div>
        <div className="stat-box">
          <span className="stat-label">FLOODED / HIGH-RISK SEGMENTS</span>
          <strong
            className="stat-value"
            style={{ color: blockedCount > 0 ? '#dc2626' : floodedCount > 0 ? '#ea580c' : '#1e293b' }}
          >
            {floodedCount} flooded / {blockedCount} critical
          </strong>
        </div>
        <div className="stat-box">
          <span className="stat-label">DRAINAGE RISK</span>
          <strong
            className="stat-value"
            style={{ color: route.drainageRisk === 'Elevated' ? '#ea580c' : '#059669' }}
          >
            {route.drainageRisk || 'Low'}
          </strong>
        </div>
      </div>

      {/* Section 10: Factual Route Explanation */}
      <div className="route-explanation-box">
        <span className="route-explanation-title">WHY THIS ROUTE?</span>
        <ul className="route-explanation-list">
          {factualReasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      {/* Action / Google Maps Integration */}
      <div className="route-card-actions" onClick={(e) => e.stopPropagation()}>
        {route.googleMapsUrl ? (
          <a
            className="route-nav-btn"
            href={route.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open real-world turn-by-turn navigation in Google Maps"
          >
            <span>OPEN IN GOOGLE MAPS →</span>
          </a>
        ) : null}

        <button
          type="button"
          className={`route-select-btn ${isSelected ? 'active' : ''}`}
          onClick={() => onSelect && onSelect(route)}
        >
          {isSelected ? '✓ SELECTED ON MAP' : 'INSPECT ON MAP'}
        </button>
      </div>
    </Panel>
  )
}
