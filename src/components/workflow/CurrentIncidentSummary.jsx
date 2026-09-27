import { useMemo } from 'react'
import { useRegion } from '../../context/useRegion'
import { getFloodForecast, getFloodPrediction } from '../../services/floodEngine'
import { RiskBadge } from '../ui'

function fmtDepth(v) {
  const n = Number(v)
  return isNaN(n) ? '—' : Number(n.toFixed(1))
}

export default function CurrentIncidentSummary({
  streetId: overrideStreetId,
  horizon: overrideHorizon,
  className = '',
}) {
  const { selectedRegion, currentRegion, selectedHorizon, selectedStreetId } = useRegion()
  const activeHorizon = overrideHorizon || selectedHorizon || 'NOW'
  const activeStreetId = overrideStreetId || selectedStreetId

  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const prediction = useMemo(() => getFloodPrediction(activeHorizon, selectedRegion), [activeHorizon, selectedRegion])

  const street = useMemo(() => {
    return (
      prediction.streets.find((s) => s.id === activeStreetId) ||
      [...prediction.streets].sort((a, b) => b.waterDepth - a.waterDepth)[0] ||
      null
    )
  }, [prediction, activeStreetId])

  // Peak impact horizon for this location across all horizons
  const peakTime = useMemo(() => {
    if (!street) return '—'
    let maxD = -1
    let peakH = activeHorizon
    forecast.forEach((step) => {
      const s = step.streets?.find((st) => st.id === street.id)
      if (s && s.waterDepth > maxD) {
        maxD = s.waterDepth
        peakH = step.time
      }
    })
    return peakH === 'NOW' ? 'Current' : peakH
  }, [forecast, street, activeHorizon])

  const depth = street ? street.waterDepth : prediction.highestWaterDepth
  const risk = street ? street.risk : prediction.highestWaterDepth >= 30 ? 'CRITICAL' : 'MODERATE'

  return (
    <div className={`jd-incident-strip ${className}`} aria-label="Current flood incident context">
      <div className="incident-strip-title">
        <span className="strip-kicker">INCIDENT CONTEXT</span>
        <strong>CURRENT FLOOD INCIDENT</strong>
      </div>

      <div className="incident-strip-grid">
        <div className="incident-strip-cell">
          <span className="strip-label">REGION</span>
          <strong className="strip-val">{currentRegion?.name || selectedRegion}</strong>
        </div>

        <div className="incident-strip-cell">
          <span className="strip-label">LOCATION</span>
          <strong className="strip-val" title={street?.name || 'All Monitored Corridors'}>
            {street?.name || 'All Monitored Corridors'}
          </strong>
        </div>

        <div className="incident-strip-cell">
          <span className="strip-label">RISK</span>
          <div className="strip-val-badge">
            <RiskBadge level={risk} />
          </div>
        </div>

        <div className="incident-strip-cell">
          <span className="strip-label">PREDICTED DEPTH</span>
          <strong
            className="strip-val"
            style={{ color: depth >= 30 ? '#dc2626' : depth >= 15 ? '#ea580c' : '#1e293b' }}
          >
            {fmtDepth(depth)} cm
          </strong>
        </div>

        <div className="incident-strip-cell">
          <span className="strip-label">PEAK IMPACT</span>
          <strong className="strip-val">{peakTime}</strong>
        </div>

        <div className="incident-strip-cell">
          <span className="strip-label">FORECAST</span>
          <strong className="strip-val">{activeHorizon}</strong>
        </div>

        <div className="incident-strip-cell demo-mode">
          <span className="strip-label">DATA MODE</span>
          <span className="strip-demo-tag">DEMONSTRATION DATA</span>
        </div>
      </div>
    </div>
  )
}
