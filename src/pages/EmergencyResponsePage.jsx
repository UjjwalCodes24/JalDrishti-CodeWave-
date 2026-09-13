import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Panel, RiskBadge } from '../components/ui'
import { useRegion } from '../context/useRegion'
import { NEUTRAL_MAP_CENTER } from '../data/regions'
import EmergencyResponseMap from '../components/EmergencyResponseMap'
import defaultResponseData from '../data/emergencyResponse.json'
import { getEmergencySnapshot, getRoadDecision } from '../services/emergencyService'

function EmergencyResponsePage() {
  const { selectedRegion, currentRegion } = useRegion()
  const [selectedTime, setSelectedTime] = useState('NOW')
  const [focusedStreet, setFocusedStreet] = useState('')
  const [assignedTeams, setAssignedTeams] = useState([])

  const snapshot = useMemo(() => getEmergencySnapshot(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const responseData = currentRegion?.emergencyResponse || defaultResponseData

  const activeFocusedStreet = snapshot.prediction.streets.some((s) => s.id === focusedStreet)
    ? focusedStreet
    : currentRegion?.primaryFocusStreet || snapshot.prediction.streets[0]?.id


  const teamLocations = (responseData.teamLocations || []).map((team) => (
    assignedTeams.includes(team.id) ? { ...team, status: 'DEPLOYED' } : team
  ))

  const route = snapshot.route.recommended || snapshot.route.alternative
  const routeWithNodes = route ? { ...route, nodes: Object.fromEntries(snapshot.network.nodes.map((node) => [node.id, node])) } : null
  const priorities = snapshot.prediction.streets.filter((street) => street.waterDepth >= 15).slice(0, 3)
  const resources = (responseData.resources || []).map((resource) => (
    assignedTeams.length && resource.status === 'AVAILABLE'
      ? { ...resource, available: Math.max(0, resource.available - assignedTeams.length) }
      : resource
  ))

  const assignTeam = (streetId) => {
    const team = (responseData.teamLocations || []).find((item) => !assignedTeams.includes(item.id))
    if (team && !assignedTeams.includes(team.id)) {
      setAssignedTeams((current) => [...current, team.id])
    }
    setFocusedStreet(streetId)
  }

  const defaultAction = { action: 'Monitor corridor and limit traffic', reason: 'High predicted water depth.' }

  return (
    <>
      <PageHeader
        eyebrow="OPERATIONAL RESPONSE • DECISION SUPPORT"
        title="Emergency response"
        description={`Prioritization of flood response actions, resources and safe emergency access for ${currentRegion?.name || 'the selected region'}.`}
        action={
          <div className="response-header-status">
            <span className="live-indicator"><span className="status-dot" /> Demonstration scenario</span>
            <span className="prototype-label">DEMO MODE • SIMULATED DATA</span>
          </div>
        }
      />
      <section className="critical-response-banner">
        <div>
          <span className="eyebrow">CRITICAL FLOOD RESPONSE</span>
          <h2>Action required before predicted inundation affects major access routes.</h2>
        </div>
        <div className="critical-banner-status">
          <RiskBadge level={snapshot.criticalZones > 0 ? 'Critical' : 'High'} />
          <strong>{snapshot.firstImpact}</strong>
          <span>TIME TO FIRST MAJOR IMPACT</span>
        </div>
      </section>
      <div className="response-summary-grid">
        <div className="response-summary-card critical">
          <span>◉</span>
          <small>CRITICAL ZONES</small>
          <strong>{snapshot.criticalZones}</strong>
          <p>Require immediate action</p>
        </div>
        <div className="response-summary-card warning">
          <span>▣</span>
          <small>ROADS AFFECTED</small>
          <strong>{snapshot.roadsAffected}</strong>
          <p>Closed or restricted</p>
        </div>
        <div className="response-summary-card info">
          <span>◷</span>
          <small>TIME TO IMPACT</small>
          <strong>{snapshot.firstImpact}</strong>
          <p>Before first critical flooding</p>
        </div>
        <div className="response-summary-card ready">
          <span>♙</span>
          <small>RESPONSE RESOURCES</small>
          <strong>{resources.length + (responseData.teamLocations?.length || 2)}</strong>
          <p>Teams and units available</p>
        </div>
      </div>
      <div className="response-grid response-map-grid">
        <Panel className="priority-map-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">RESPONSE PRIORITY MAP · {selectedTime}</span>
              <h2>Priority response map</h2>
              <p className="muted">Flood hotspots, restricted roads and emergency access corridors.</p>
            </div>
            <select className="response-time-select" value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)}>
              <option>NOW</option>
              <option>+30 MIN</option>
              <option>+60 MIN</option>
              <option>+90 MIN</option>
              <option>+120 MIN</option>
              <option>+180 MIN</option>
            </select>
          </div>
          <EmergencyResponseMap
            streets={snapshot.prediction.streets}
            safeRoute={routeWithNodes}
            teamLocations={teamLocations}
            focusedStreet={activeFocusedStreet}
            onFocusStreet={setFocusedStreet}
            center={currentRegion?.center || NEUTRAL_MAP_CENTER}
            zoom={currentRegion?.zoom || 11}
          />
        </Panel>
        <Panel className="response-plan-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">RECOMMENDED RESPONSE PLAN</span>
              <h2>What to do next</h2>
            </div>
            <span className="prototype-label">DEMONSTRATION SCENARIO</span>
          </div>
          <div className="priority-action-list">
            {priorities.map((street, index) => {
              const copy = currentRegion?.priorityActions?.[street.id] || defaultAction
              const assigned = assignedTeams.length > index
              return (
                <article
                  className={`priority-action ${activeFocusedStreet === street.id ? 'selected' : ''}`}
                  key={street.id}
                  onClick={() => setFocusedStreet(street.id)}
                >

                  <div className="priority-action-head">
                    <span>PRIORITY 0{index + 1}</span>
                    <RiskBadge level={street.risk} />
                  </div>
                  <h3>{street.name}</h3>
                  <p>{copy.action}</p>
                  <small>Reason: {copy.reason} {street.waterDepth} cm predicted at {selectedTime}.</small>
                  <div>
                    <b>{street.waterDepth >= 30 ? '~45 min urgency' : 'Before +60 min'}</b>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setFocusedStreet(street.id)
                      }}
                    >
                      View location
                    </button>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        assignTeam(street.id)
                      }}
                    >
                      {assigned ? 'Team assigned' : 'Assign team'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>
      </div>
      <Panel className="impact-timeline-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">TIME TO IMPACT</span>
            <h2>Flood impact timeline</h2>
          </div>
          <span className="muted">Forecast-driven milestones</span>
        </div>
        <div className="response-timeline">
          <div className="timeline-step normal">
            <b>NOW</b>
            <span>Precipitation & drainage demand monitored across {currentRegion?.shortName || 'metropolitan region'}</span>
          </div>
          <div className="timeline-step warning">
            <b>+30 MIN</b>
            <span>Trunk drainage approaching hydraulic capacity threshold</span>
          </div>
          <div className="timeline-step critical">
            <b>+45 MIN</b>
            <span>Primary low-lying hotspots predicted to accumulate flood depth</span>
          </div>
          <div className="timeline-step critical">
            <b>+60 MIN</b>
            <span>Traffic diversions and safe corridor activation recommended</span>
          </div>
        </div>
      </Panel>
      <div className="response-grid resource-road-grid">
        <Panel className="resources-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">FIELD CAPACITY</span>
              <h2>Resource deployment</h2>
            </div>
            <span className="prototype-label">DEMO INVENTORY</span>
          </div>
          <div className="resource-list">
            {resources.map((resource) => (
              <div className="resource-row" key={resource.id}>
                <div>
                  <strong>{resource.type}</strong>
                  <span>{resource.id} · {resource.assignment}</span>
                </div>
                <b>{resource.available} available</b>
                <span className={`resource-status ${resource.status.toLowerCase().replace(' ', '-')}`}>{resource.status}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="safe-access-panel">
          <span className="eyebrow">SAFE EMERGENCY ACCESS</span>
          <h2>Emergency access status</h2>
          <div className="safe-route-count">
            🚑 <strong>{snapshot.route.availableSafeRoutes || 1}</strong> verified safe routes
          </div>
          <div className="safe-route-detail">
            <span>Primary route</span>
            <strong>{currentRegion?.defaultOrigin || 'Origin'} → {currentRegion?.defaultDestination || 'Destination'}</strong>
            <RiskBadge level="Low" />
          </div>
          <Link className="button route-summary-button" to="/safe-routes">Open Flood-Safe Routes</Link>
        </Panel>
      </div>
      <Panel className="road-decisions-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">ACCESS CONTROL</span>
            <h2>Recommended road access decisions</h2>
          </div>
          <span className="muted">{selectedTime} · computed from coupled flood engine</span>
        </div>
        <div className="road-decision-table">
          <div className="road-decision-head">
            <span>Road / Location</span>
            <span>Predicted depth</span>
            <span>Risk level</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {snapshot.prediction.streets.map((street) => {
            const decision = getRoadDecision(street)
            return (
              <div className="road-decision-row" key={street.id}>
                <strong>{street.name}</strong>
                <strong>{street.waterDepth} cm</strong>
                <RiskBadge level={street.risk} />
                <span className={`decision-status ${decision.status.toLowerCase().replaceAll(' ', '-')}`}>{decision.status}</span>
                <span>{decision.action}</span>
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}

export default EmergencyResponsePage

