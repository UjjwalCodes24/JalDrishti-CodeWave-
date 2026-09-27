import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Panel, RiskBadge } from '../components/ui'
import { useRegion } from '../context/useRegion'
import { NEUTRAL_MAP_CENTER } from '../data/regions'
import EmergencyResponseMap from '../components/EmergencyResponseMap'
import WorkflowIndicator from '../components/workflow/WorkflowIndicator'
import defaultResponseData from '../data/emergencyResponse.json'
import { getEmergencySnapshot, getRoadDecision } from '../services/emergencyService'
import { getFloodForecast, getFloodPrediction } from '../services/floodEngine'
import { getExplainabilityData } from '../services/explainabilityService'

/* Emergency contacts by region — verified official numbers only */
const EMERGENCY_CONTACTS = {
  mumbai: { agency: 'BMC', number: '1916', full: 'Brihanmumbai Municipal Corporation' },
  delhi: { agency: 'MCD', number: '155305', full: 'Municipal Corporation of Delhi' },
  chennai: { agency: 'GCC', number: '1913', full: 'Greater Chennai Corporation' },
}

function fmtDepth(v) {
  const n = Number(v)
  return isNaN(n) ? '—' : Number(n.toFixed(1))
}

function EmergencyResponsePage() {
  const { selectedRegion, currentRegion, selectedHorizon, setSelectedHorizon, selectedStreetId, setSelectedStreetId } = useRegion()
  const [searchParams] = useSearchParams()
  const initialStreet = searchParams.get('street') || selectedStreetId || ''
  const initialHorizon = searchParams.get('horizon') || selectedHorizon || 'NOW'

  const [selectedTime, setSelectedTime] = useState(initialHorizon)
  const [focusedStreet, setFocusedStreet] = useState(initialStreet)

  // Synchronize when searchParams change
  useEffect(() => {
    const s = searchParams.get('street')
    const h = searchParams.get('horizon')
    if (s) setFocusedStreet(s)
    if (h) setSelectedTime(h)
  }, [searchParams])

  const snapshot = useMemo(() => getEmergencySnapshot(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const prediction = useMemo(() => getFloodPrediction(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const responseData = currentRegion?.emergencyResponse || defaultResponseData

  const activeFocusedStreet = snapshot.prediction.streets.some((s) => s.id === focusedStreet)
    ? focusedStreet
    : currentRegion?.primaryFocusStreet || snapshot.prediction.streets[0]?.id

  const route = snapshot.route.recommended || snapshot.route.alternative
  const routeWithNodes = route ? { ...route, nodes: Object.fromEntries(snapshot.network.nodes.map((n) => [n.id, n])) } : null

  // Peak impact across all horizons
  const peakPoint = useMemo(() => {
    return forecast.reduce(
      (best, pt) => (pt.highestWaterDepth > best.highestWaterDepth ? pt : best),
      forecast[0] || { highestWaterDepth: 0, time: 'NOW' }
    )
  }, [forecast])

  // Priority response zones — sorted by waterDepth and critical risk
  const priorities = useMemo(() => {
    return [...prediction.streets]
      .filter((s) => s.waterDepth >= 10 || s.risk === 'CRITICAL' || s.risk === 'HIGH')
      .sort((a, b) => {
        if (b.risk === 'CRITICAL' && a.risk !== 'CRITICAL') return 1
        if (a.risk === 'CRITICAL' && b.risk !== 'CRITICAL') return -1
        return b.waterDepth - a.waterDepth
      })
      .slice(0, 8)
  }, [prediction])

  // Calculate peak time for any street across forecast
  const getStreetPeak = (streetId) => {
    let maxDepth = -1
    let peakHorizon = selectedTime
    forecast.forEach((step) => {
      const found = step.streets?.find((item) => item.id === streetId)
      if (found && found.waterDepth > maxDepth) {
        maxDepth = found.waterDepth
        peakHorizon = step.time
      }
    })
    return peakHorizon
  }

  // Selected street detail
  const focusedStreetObj = prediction.streets.find((s) => s.id === activeFocusedStreet) || prediction.streets[0]
  const focusedAnalysis = useMemo(() => {
    if (!activeFocusedStreet) return null
    return getExplainabilityData(activeFocusedStreet, selectedTime, selectedRegion)
  }, [activeFocusedStreet, selectedTime, selectedRegion])

  const focusedDrainNode = prediction.drainage.nodes?.find((n) => n.id === focusedStreetObj?.drainageNode)
  const focusedDrainUtil = Math.round((focusedDrainNode?.utilization ?? prediction.drainage.utilization) * 100)
  const drainageUtil = Math.round(prediction.drainage.utilization * 100)
  const criticalZones = prediction.streets.filter((s) => s.risk === 'CRITICAL').length
  const affectedRoads = prediction.streets.filter((s) => s.waterDepth >= 15).length
  const overallRisk =
    prediction.highestWaterDepth >= 45 || criticalZones > 0
      ? 'CRITICAL'
      : prediction.highestWaterDepth >= 25
      ? 'HIGH'
      : prediction.highestWaterDepth >= 10
      ? 'MODERATE'
      : 'LOW'

  const contact = EMERGENCY_CONTACTS[selectedRegion] || EMERGENCY_CONTACTS.mumbai

  // Blocked segments count from drainage model
  const blockedDrainageSegments = prediction.drainage.edges?.filter((e) => e.blocked) || []
  const blockedCount = blockedDrainageSegments.length

  // Surcharge and backflow status
  const surchargeRiskVal = Math.round((prediction.drainage.surchargeRisk || 0) * 100)
  const surchargeStatus = surchargeRiskVal >= 40 ? `${surchargeRiskVal}% · Elevated` : `${surchargeRiskVal}% · Normal`

  const backflowProbVal = Math.round((prediction.drainage.backflowProbability || 0) * 100)
  const backflowStatus = backflowProbVal >= 50 ? `${backflowProbVal}% · High Risk` : `${backflowProbVal}% · Low Risk`

  // Response actions derived from current model conditions (worded as RECOMMENDED CONSIDERATION)
  const responseActions = useMemo(() => {
    const actions = []
    if (criticalZones > 0 || prediction.highestWaterDepth >= 45) {
      actions.push('Prepare traffic restrictions for affected corridors with critical predicted flood depth.')
    }
    if (drainageUtil >= 100) {
      actions.push('Inspect overloaded drainage nodes and assess surcharge conditions.')
    }
    if (blockedCount > 0) {
      actions.push('Deploy maintenance teams to inspect blocked segments.')
    }
    if (affectedRoads >= 3) {
      actions.push('Coordinate traffic diversion and emergency access for multiple corridors at risk.')
    }
    if (prediction.drainage.backflowProbability >= 0.5) {
      actions.push('Inspect downstream drainage junctions for backflow conditions.')
    }
    if (actions.length === 0) {
      actions.push('Maintain active monitoring of rainfall telemetry and review next forecast horizon for changes.')
    }
    return actions
  }, [criticalZones, prediction.highestWaterDepth, drainageUtil, blockedCount, affectedRoads, prediction.drainage.backflowProbability])

  // Get street drainage status string
  const getStreetDrainageStatus = (street) => {
    const node = prediction.drainage.nodes?.find((n) => n.id === street.drainageNode)
    const util = Math.round((node?.utilization ?? prediction.drainage.utilization) * 100)
    if (util >= 100) return `${util}% · Over Capacity`
    if (util >= 80) return `${util}% · Near Capacity`
    return `${util}% · Within Capacity`
  }

  // Get street recommended consideration
  const getStreetRecommendation = (street) => {
    const regionalAction = currentRegion?.priorityActions?.[street.id]?.action
    if (regionalAction) return regionalAction
    if (street.waterDepth >= 60) return 'Enforce vehicle restriction & isolate corridor'
    if (street.waterDepth >= 30) return 'Prepare traffic restrictions for affected corridor'
    if (street.waterDepth >= 15) return 'Coordinate traffic diversion and emergency access'
    if (focusedDrainUtil >= 100) return 'Inspect overloaded drainage node'
    return 'Maintain observation during forecast horizon'
  }

  return (
    <div className="er-container">
      {/* ── Page Header ── */}
      <div className="fra-page-top">
        <div>
          <span className="eyebrow">EMERGENCY OPERATIONS</span>
          <h1 className="fra-title">EMERGENCY RESPONSE</h1>
          <p className="fra-subtitle">Flood impact monitoring and operational response coordination</p>
        </div>
        <div className="nc-header-meta">
          <div className="nc-meta-block">
            <span className="nc-meta-label">REGION</span>
            <span className="nc-meta-value">{currentRegion?.name || selectedRegion}</span>
          </div>
          <div className="nc-meta-block">
            <span className="nc-meta-label">FORECAST HORIZON</span>
            <span className="nc-meta-value">
              <select
                className="er-time-select"
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value)
                  setSelectedHorizon?.(e.target.value)
                }}
                aria-label="Forecast horizon selection"
              >
                <option value="NOW">NOW (Current)</option>
                <option value="+30 MIN">+30 MIN</option>
                <option value="+60 MIN">+60 MIN</option>
                <option value="+90 MIN">+90 MIN</option>
                <option value="+120 MIN">+120 MIN</option>
                <option value="+180 MIN">+180 MIN</option>
              </select>
            </span>
          </div>
          <div className="nc-meta-block nc-meta-demo">
            <span className="nc-meta-label">RAINFALL INPUT</span>
            <span className="nc-meta-value">DEMONSTRATION DATA</span>
          </div>
        </div>
      </div>

      {/* Operational Workflow Indicator */}
      <WorkflowIndicator currentStage="RESPOND" style={{ marginBottom: '14px' }} />

      {/* ── Section 2: Current Flood Situation (Compact Operational Status Panel) ── */}
      <Panel className="er-situation-panel">
        <div className="er-situation-header">
          <span className="er-situation-kicker">INCIDENT MONITORING</span>
          <h2>CURRENT FLOOD SITUATION</h2>
        </div>
        <div className="er-situation-grid">
          <div className="er-situation-metric">
            <span className="er-metric-label">REGION</span>
            <strong className="er-metric-value">{currentRegion?.name || selectedRegion}</strong>
          </div>
          <div className="er-situation-metric">
            <span className="er-metric-label">OVERALL STATUS</span>
            <div className="er-metric-badge-wrap">
              <RiskBadge level={overallRisk} />
            </div>
          </div>
          <div className="er-situation-metric">
            <span className="er-metric-label">PEAK PREDICTED DEPTH</span>
            <strong
              className="er-metric-value"
              style={{ color: peakPoint.highestWaterDepth >= 30 ? '#dc2626' : '#1e293b' }}
            >
              {fmtDepth(peakPoint.highestWaterDepth)} cm
            </strong>
          </div>
          <div className="er-situation-metric">
            <span className="er-metric-label">PEAK IMPACT</span>
            <strong className="er-metric-value">{peakPoint.time}</strong>
          </div>
          <div className="er-situation-metric">
            <span className="er-metric-label">CRITICAL ZONES</span>
            <strong
              className="er-metric-value"
              style={{ color: criticalZones > 0 ? '#dc2626' : '#1e293b' }}
            >
              {criticalZones}
            </strong>
          </div>
          <div className="er-situation-metric">
            <span className="er-metric-label">ROADS AT RISK</span>
            <strong
              className="er-metric-value"
              style={{ color: affectedRoads > 0 ? '#ea580c' : '#1e293b' }}
            >
              {affectedRoads}
            </strong>
          </div>
          <div className="er-situation-metric">
            <span className="er-metric-label">DRAINAGE STATUS</span>
            <strong
              className="er-metric-value"
              style={{ color: drainageUtil >= 100 ? '#dc2626' : drainageUtil >= 80 ? '#d97706' : '#059669' }}
            >
              {drainageUtil >= 100 ? 'OVER CAPACITY' : drainageUtil >= 80 ? 'NEAR CAPACITY' : 'WITHIN CAPACITY'}
            </strong>
          </div>
        </div>
      </Panel>

      {/* ── Main Operations Workspace: Map + Side Details ── */}
      <div className="er-workspace">
        {/* Map Panel */}
        <Panel className="er-map-panel">
          <div className="fra-map-header">
            <div>
              <span className="fra-panel-label">GEOSPATIAL OPERATIONS</span>
              <h2>Response Priority Map · {selectedTime === 'NOW' ? 'Current Conditions' : selectedTime}</h2>
            </div>
            <span className="nc-demo-chip">Demonstration Scenario</span>
          </div>
          <div className="er-map-container">
            <EmergencyResponseMap
              key={`${currentRegion?.id || selectedRegion}-${selectedTime}`}
              streets={snapshot.prediction.streets}
              safeRoute={routeWithNodes}
              teamLocations={responseData.teamLocations || []}
              focusedStreet={activeFocusedStreet}
              onFocusStreet={setFocusedStreet}
              center={currentRegion?.center || NEUTRAL_MAP_CENTER}
              zoom={currentRegion?.zoom || 11}
            />
          </div>
        </Panel>

        {/* Right Operational Coordination Column */}
        <div className="er-side-col">
          {/* Section 4: Emergency Contacts */}
          <Panel className="er-contacts-panel">
            <div className="er-panel-title-wrap">
              <span className="fra-panel-label">VERIFIED OFFICIAL NUMBERS</span>
              <h3>EMERGENCY CONTACTS</h3>
            </div>
            <div className="er-contact-cards">
              <div className="er-contact-card er-contact-national">
                <div className="er-contact-info">
                  <strong>National Emergency: 112</strong>
                  <span className="er-contact-desc">For immediate life-threatening emergencies, call 112.</span>
                </div>
                <a
                  href="tel:112"
                  className="er-call-btn er-call-red"
                  title="Call National Emergency 112"
                >
                  CALL 112
                </a>
              </div>

              <div className="er-contact-card er-contact-regional">
                <div className="er-contact-info">
                  <strong>
                    {currentRegion?.name || selectedRegion}: {contact.agency} ({contact.number})
                  </strong>
                  <span className="er-contact-desc">{contact.full}</span>
                </div>
                <a
                  href={`tel:${contact.number}`}
                  className="er-call-btn er-call-blue"
                  title={`Call ${contact.agency} at ${contact.number}`}
                >
                  CALL {contact.agency} ({contact.number})
                </a>
              </div>
            </div>
            <p className="er-contacts-note">
              Verified official emergency numbers. Click-to-call requires explicit user confirmation.
            </p>
          </Panel>

          {/* Section 6: Incident Detail */}
          {focusedStreetObj && (
            <Panel className="er-incident-panel">
              <div className="er-panel-title-wrap">
                <span className="fra-panel-label">OPERATIONAL INSPECTION</span>
                <h3>INCIDENT DETAIL</h3>
              </div>
              <div className="er-incident-header">
                <div>
                  <h4 className="er-incident-name">{focusedStreetObj.name}</h4>
                  <span className="er-incident-sub">
                    Drainage Node: {focusedStreetObj.drainageNode} · Terrain: {focusedStreetObj.terrain?.id || 'Urban'}
                  </span>
                </div>
                <RiskBadge level={focusedStreetObj.risk} />
              </div>

              <div className="er-incident-grid">
                <div className="er-inc-cell">
                  <span className="er-inc-label">Location</span>
                  <strong className="er-inc-val">{focusedStreetObj.name}</strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Risk</span>
                  <strong className="er-inc-val">{focusedStreetObj.risk}</strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Predicted Depth</span>
                  <strong
                    className="er-inc-val"
                    style={{ color: focusedStreetObj.waterDepth >= 30 ? '#dc2626' : '#1e293b' }}
                  >
                    {fmtDepth(focusedStreetObj.waterDepth)} cm
                  </strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Peak Time</span>
                  <strong className="er-inc-val">{getStreetPeak(focusedStreetObj.id)}</strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Rainfall</span>
                  <strong className="er-inc-val">{prediction.intensity} mm/hr</strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Drainage Utilization</span>
                  <strong
                    className="er-inc-val"
                    style={{ color: focusedDrainUtil >= 100 ? '#dc2626' : '#1e293b' }}
                  >
                    {focusedDrainUtil}%
                  </strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Blocked Segments</span>
                  <strong className="er-inc-val">{blockedCount} segment(s)</strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Surcharge Status</span>
                  <strong className="er-inc-val">{surchargeStatus}</strong>
                </div>
                <div className="er-inc-cell">
                  <span className="er-inc-label">Backflow Risk</span>
                  <strong className="er-inc-val">{backflowStatus}</strong>
                </div>
              </div>

              <div className="er-incident-why">
                <span className="er-incident-why-label">WHY THIS LOCATION IS AT RISK</span>
                <p className="er-incident-why-text">
                  {focusedAnalysis?.explanation ||
                    `Coupled runoff of ${focusedStreetObj.runoffVolume || 0} m³ combines with low elevation and ${focusedDrainUtil}% drainage utilization, causing localized accumulation.`}
                </p>
              </div>

              <div className="er-incident-actions">
                <Link
                  className="er-link-btn primary"
                  to={`/explainable-ai?street=${encodeURIComponent(activeFocusedStreet)}&horizon=${encodeURIComponent(selectedTime)}`}
                >
                  VIEW FLOOD RISK ANALYSIS →
                </Link>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* ── Section 3: Priority Response Zones ── */}
      <Panel className="er-priorities-panel">
        <div className="fra-section-head">
          <div>
            <span className="fra-panel-label">PRIORITIZED OPERATIONAL TARGETS</span>
            <h2>PRIORITY RESPONSE ZONES</h2>
            <p className="fra-subtitle" style={{ margin: '4px 0 0' }}>
              Highest-priority modeled locations using existing flood forecast data. Click any location to inspect incident detail and explainability.
            </p>
          </div>
          <span className="er-badge-count">{priorities.length} Priority Locations</span>
        </div>

        <div className="er-priority-table-wrap">
          <table className="er-priority-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>PRIORITY</th>
                <th>LOCATION</th>
                <th style={{ width: '110px' }}>RISK</th>
                <th style={{ width: '140px' }}>PREDICTED DEPTH</th>
                <th style={{ width: '110px' }}>PEAK TIME</th>
                <th style={{ width: '160px' }}>DRAINAGE STATUS</th>
                <th>RECOMMENDED CONSIDERATION</th>
              </tr>
            </thead>
            <tbody>
              {priorities.map((street, index) => {
                const isSelected = activeFocusedStreet === street.id
                const peakTime = getStreetPeak(street.id)
                const drainageStatusStr = getStreetDrainageStatus(street)
                const recommendation = getStreetRecommendation(street)
                return (
                  <tr
                    key={street.id}
                    className={`er-priority-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setFocusedStreet(street.id)
                      setSelectedStreetId?.(street.id)
                    }}
                    title="Click to view incident detail"
                  >
                    <td>
                      <span className="er-priority-num">P-{String(index + 1).padStart(2, '0')}</span>
                    </td>
                    <td>
                      <strong className="er-priority-name">{street.name}</strong>
                    </td>
                    <td>
                      <RiskBadge level={street.risk} />
                    </td>
                    <td>
                      <strong
                        className="er-depth-val"
                        style={{ color: street.waterDepth >= 30 ? '#dc2626' : '#1e293b' }}
                      >
                        {fmtDepth(street.waterDepth)} cm
                      </strong>
                    </td>
                    <td>
                      <span className="er-time-val">{peakTime}</span>
                    </td>
                    <td>
                      <span className="er-drain-val">{drainageStatusStr}</span>
                    </td>
                    <td>
                      <span className="er-rec-val">{recommendation}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Section 5: Response Actions & Municipal Access ── */}
      <div className="er-bottom-grid">
        {/* Response Actions */}
        <Panel className="er-actions-panel">
          <div className="fra-section-head">
            <div>
              <span className="fra-panel-label">MUNICIPAL DECISION SUPPORT</span>
              <h2>RESPONSE ACTIONS</h2>
              <p className="fra-subtitle" style={{ margin: '4px 0 0' }}>
                Operational considerations derived from current coupled flood model conditions
              </p>
            </div>
          </div>
          <div className="er-action-list">
            {responseActions.map((action, i) => (
              <div key={i} className="er-action-item">
                <span className="er-action-tag">RECOMMENDED CONSIDERATION {String(i + 1).padStart(2, '0')}</span>
                <p className="er-action-text">{action}</p>
              </div>
            ))}
          </div>
          <p className="fra-rec-note">
            RECOMMENDED CONSIDERATIONS are operational decision-support outputs based on coupled hydrological and hydraulic simulation. Operational verification required before field deployment.
          </p>
        </Panel>

        {/* Emergency Access & Resources */}
        <div className="er-side-col">
          <Panel className="er-access-panel">
            <span className="fra-panel-label">EVACUATION & CORRIDOR ACCESS</span>
            <h3>SAFE EMERGENCY ACCESS</h3>
            <div className="er-access-detail">
              <span>Primary Corridors Evaluated</span>
              <strong>
                {currentRegion?.defaultOrigin || 'Origin'} ➔ {currentRegion?.defaultDestination || 'Destination'}
              </strong>
            </div>
            <p className="er-access-desc">
              Navigation routes must account for predicted flood exposure rather than travel distance alone.
            </p>
            <Link
              className="er-link-btn primary"
              to={`/safe-routes?horizon=${encodeURIComponent(selectedTime)}${activeFocusedStreet ? `&incident=${encodeURIComponent(activeFocusedStreet)}` : ''}`}
            >
              ASSESS ROUTE IMPACT →
            </Link>
          </Panel>

          <Panel className="er-resources-panel">
            <span className="fra-panel-label">MUNICIPAL ASSET READINESS</span>
            <h3>RESPONSE RESOURCES</h3>
            <div className="er-resource-list">
              {(responseData.resources || []).map((resource) => (
                <div className="er-resource-row" key={resource.id}>
                  <div>
                    <strong>{resource.type}</strong>
                    <span>{resource.assignment}</span>
                  </div>
                  <span className={`er-resource-status ${resource.status.toLowerCase().replace(' ', '-')}`}>
                    {resource.status}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Road Access Decisions Table ── */}
      <Panel className="er-road-panel">
        <div className="fra-section-head">
          <div>
            <span className="fra-panel-label">CORRIDOR ACCESS STATUS</span>
            <h2>RECOMMENDED ROAD ACCESS DECISIONS</h2>
          </div>
          <span className="muted" style={{ fontSize: '11px' }}>
            Coupled flood model · {selectedTime}
          </span>
        </div>
        <div className="er-road-table-wrap">
          <table className="er-road-table">
            <thead>
              <tr>
                <th>ROAD / LOCATION</th>
                <th style={{ width: '140px' }}>PREDICTED DEPTH</th>
                <th style={{ width: '110px' }}>RISK</th>
                <th style={{ width: '160px' }}>STATUS</th>
                <th>OPERATIONAL ACTION</th>
              </tr>
            </thead>
            <tbody>
              {prediction.streets.map((street) => {
                const decision = getRoadDecision(street)
                return (
                  <tr
                    key={street.id}
                    className="er-road-row"
                    onClick={() => {
                      setFocusedStreet(street.id)
                      setSelectedStreetId?.(street.id)
                    }}
                  >
                    <td>
                      <strong>{street.name}</strong>
                    </td>
                    <td>
                      <strong style={{ color: street.waterDepth >= 30 ? '#dc2626' : '#1e293b' }}>
                        {fmtDepth(street.waterDepth)} cm
                      </strong>
                    </td>
                    <td>
                      <RiskBadge level={street.risk} />
                    </td>
                    <td>
                      <span className={`er-decision-status er-decision-${decision.status.toLowerCase().replaceAll(' ', '-')}`}>
                        {decision.status}
                      </span>
                    </td>
                    <td>{decision.action}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Disclaimer */}
      <div className="jd-disclaimer">
        <strong>JalDrishti</strong> — Urban Flood Intelligence & Decision Support System · Prototype / Demonstration System · Model outputs are intended for decision support and require operational verification before field deployment.
      </div>
    </div>
  )
}

export default EmergencyResponsePage
