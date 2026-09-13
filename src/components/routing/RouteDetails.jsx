import { Panel } from '../ui'

export default function RouteDetails({ routingResult }) {
  const segments = Array.isArray(routingResult?.segments) ? routingResult.segments : []
  const affected = segments.filter((segment) => segment.status !== 'OPEN')

  const timeLabel = typeof routingResult?.time === 'string' ? routingResult.time : 'NOW'
  const isGoogle = Boolean(routingResult?.googleMapsAvailable)

  return (
    <Panel className="route-details">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">FLOOD IMPACT ANALYSIS</span>
          <h2>Road & Corridor Conditions at {timeLabel}</h2>
        </div>
        <span className={`prototype-label ${isGoogle ? 'google-badge' : 'sim-badge'}`}>
          {isGoogle ? 'GOOGLE ROUTING ACTIVE' : 'JalDrishti Simulation Active (Fallback)'}
        </span>
      </div>

      {routingResult?.notice && (
        <p className="route-notice-banner">
          <span className="notice-icon">ℹ</span>
          {routingResult.notice}
        </p>
      )}

      {affected.length === 0 ? (
        <p className="route-clear">
          ✓ All evaluated road segments are clear and open for travel at this forecast time.
        </p>
      ) : (
        <div className="road-condition-list">
          {affected.map((segment, idx) => (
            <div
              className={`road-condition ${segment.status.toLowerCase()}`}
              key={segment.id || `affected-${idx}`}
            >
              <div>
                <strong>{segment.name}</strong>
                <span>
                  Status: {segment.status} · {segment.floodDepth} cm predicted water depth
                </span>
              </div>
              <b aria-hidden="true">
                {segment.status === 'BLOCKED' ? '⛔' : segment.status === 'FLOODED' ? '🌊' : '💧'}
              </b>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
