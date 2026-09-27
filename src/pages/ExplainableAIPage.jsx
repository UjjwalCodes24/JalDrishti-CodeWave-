import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Panel, RiskBadge } from '../components/ui'
import { useRegion } from '../context/useRegion'
import { NEUTRAL_MAP_CENTER } from '../data/regions'
import wardsData from '../data/wards.json'
import terrainData from '../data/terrain.json'
import drainageNetworkData from '../data/drainageNetwork.json'
import InteractiveRiskMap from '../components/InteractiveRiskMap'
import FactorContributionChart from '../components/explainability/FactorContributionChart'
import CausalFloodChain from '../components/explainability/CausalFloodChain'
import CounterfactualAnalysis from '../components/explainability/CounterfactualAnalysis'
import ConfidencePanel from '../components/explainability/ConfidencePanel'
import OperationalRecommendations from '../components/explainability/OperationalRecommendations'
import WorkflowIndicator from '../components/workflow/WorkflowIndicator'
import { getExplainabilityData } from '../services/explainabilityService'
import { getFloodForecast, getFloodPrediction, MODEL_METADATA } from '../services/floodEngine'
import { getRainfallDataSource } from '../services/dataSourceService'

/** Format depth values to avoid floating-point artifacts (e.g. -22.79999… → −22.8) */
function fmtDepth(value) {
  const n = Number(value)
  if (isNaN(n)) return '—'
  return Number(n.toFixed(1))
}

/* ────────────────────────────────────────────────────────────
   "Why this location is at risk" — derived from model values only.
   ──────────────────────────────────────────────────────────── */
function generateRiskExplanation(street, prediction, factors) {
  const lines = []
  const rainfall = factors.find((f) => f.id === 'rainfall')
  const drainage = factors.find((f) => f.id === 'drainage')
  const blockage = factors.find((f) => f.id === 'blockage')
  const backflow = factors.find((f) => f.id === 'backflow')
  const elevation = factors.find((f) => f.id === 'elevation')
  const accumulation = factors.find((f) => f.id === 'accumulation')

  if (rainfall && rainfall.normalized >= 0.4) {
    lines.push(`High rainfall intensity (${prediction.intensity} mm/hr) is increasing surface runoff at this location.`)
  }
  if (elevation && elevation.normalized >= 0.5) {
    lines.push(`Low elevation (${street.terrain.elevation} m) increases susceptibility to surface water accumulation.`)
  }
  if (accumulation && accumulation.normalized >= 0.5) {
    lines.push(`Terrain characteristics favor local water accumulation (${Math.round(street.terrain.accumulationPotential * 100)}% potential).`)
  }
  if (drainage && drainage.normalized >= 0.7) {
    lines.push('Drainage capacity is exceeded, increasing surface accumulation risk.')
  } else if (drainage && drainage.normalized >= 0.5) {
    lines.push('Drainage network is approaching capacity at this location.')
  }
  if (blockage && blockage.normalized >= 0.3) {
    lines.push('Reduced drainage capacity from blockage increases local surcharge risk.')
  }
  if (backflow && backflow.normalized >= 0.5) {
    lines.push('Downstream drainage conditions indicate increased backflow risk.')
  }
  if (lines.length === 0) {
    lines.push('Current model inputs do not indicate elevated risk factors at this location.')
  }
  return lines
}

/* ════════════════════════════════════════════════════════════
   Flood Risk Analysis Page
   ════════════════════════════════════════════════════════════ */
function ExplainableAIPage() {
  const { selectedRegion, currentRegion, selectedHorizon, setSelectedHorizon, selectedStreetId, setSelectedStreetId } = useRegion()
  const [searchParams] = useSearchParams()
  const initialStreet = searchParams.get('street') || selectedStreetId || ''
  const initialHorizon = searchParams.get('horizon') || selectedHorizon || 'NOW'

  const regionWards = currentRegion?.wards || wardsData
  const regionTerrain = currentRegion?.terrain || terrainData.zones
  const regionDrainage = currentRegion?.drainageNetwork || drainageNetworkData
  const source = useMemo(() => getRainfallDataSource(selectedRegion), [selectedRegion])

  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const locations = useMemo(() => forecast[0]?.streets || [], [forecast])

  const [selectedLocation, setSelectedLocation] = useState(initialStreet)
  const [selectedTime, setSelectedTime] = useState(initialHorizon)
  const [activeMapLayers, setActiveMapLayers] = useState({ risk: true, depth: true, network: true, capacity: true, terrain: true, runoff: true })

  // Synchronize search params or region switch
  useEffect(() => {
    const paramStreet = searchParams.get('street')
    const paramHorizon = searchParams.get('horizon')
    if (paramStreet && locations.some((l) => l.id === paramStreet)) {
      setSelectedLocation(paramStreet)
    }
    if (paramHorizon) {
      setSelectedTime(paramHorizon)
    }
  }, [searchParams, locations])

  const activeLocationId = locations.some((l) => l.id === selectedLocation)
    ? selectedLocation
    : locations[0]?.id || ''

  const prediction = useMemo(() => getFloodPrediction(selectedTime, selectedRegion), [selectedTime, selectedRegion])

  const analysis = useMemo(() => {
    return getExplainabilityData(activeLocationId, selectedTime, selectedRegion)
  }, [activeLocationId, selectedTime, selectedRegion])

  const { street, factors, counterfactuals } = analysis
  const riskExplanation = useMemo(() => generateRiskExplanation(street, prediction, factors), [street, prediction, factors])

  const drainageNode = prediction.drainage.nodes.find((n) => n.id === street.drainageNode)
  const drainageUtil = Math.round((drainageNode?.utilization || prediction.drainage.utilization) * 100)
  const backflowProb = Math.round(prediction.drainage.backflowProbability * 100)
  const overloadedCount = prediction.drainage.overloadedNodes?.length || 0
  const blockedEdgesCount = prediction.drainage.overloadedEdges?.filter((e) => e.blocked)?.length || 0

  const toggleMapLayer = (layer) => setActiveMapLayers((cur) => ({ ...cur, [layer]: !cur[layer] }))
  const handleStreetSelect = (id) => {
    setSelectedLocation(id)
    setSelectedStreetId(id)
  }

  const handleTimeSelect = (time) => {
    setSelectedTime(time)
    setSelectedHorizon(time)
  }

  const riskDisplay = street.risk?.charAt(0) + (street.risk?.slice(1) || '').toLowerCase()

  // Peak impact for this street across horizons
  const peakForStreet = useMemo(() => {
    return forecast.reduce((best, pt) => {
      const s = pt.streets.find((st) => st.id === activeLocationId)
      return (s && s.waterDepth > (best?.depth || 0)) ? { time: pt.time, depth: s.waterDepth } : best
    }, { time: '—', depth: 0 })
  }, [forecast, activeLocationId])

  return (
    <>
      {/* ── 1. Page header ── */}
      <div className="fra-page-top">
        <div>
          <span className="eyebrow">FLOOD RISK ANALYSIS</span>
          <h1 className="fra-title">Flood Risk Analysis</h1>
          <p className="fra-subtitle">Explain the factors driving predicted urban flood risk</p>
        </div>
        <div className="nc-header-meta">
          <div className="nc-meta-block">
            <span className="nc-meta-label">REGION</span>
            <span className="nc-meta-value">{currentRegion?.name || selectedRegion}</span>
          </div>
          <div className="nc-meta-block">
            <span className="nc-meta-label">FORECAST HORIZON</span>
            <span className="nc-meta-value">{selectedTime}</span>
          </div>
          <div className="nc-meta-block nc-meta-demo">
            <span className="nc-meta-label">RAINFALL INPUT</span>
            <span className="nc-meta-value">DEMONSTRATION DATA</span>
          </div>
        </div>
      </div>

      {/* ── Operational Workflow Indicator (Section 8) ── */}
      <WorkflowIndicator currentStage="EXPLAIN" style={{ marginBottom: '14px' }} />

      {/* ── 2. Location + time selector ── */}
      <Panel className="fra-selector-panel">
        <div className="fra-selector-row">
          <label className="fra-selector">
            <span>LOCATION / STREET</span>
            <select value={activeLocationId} onChange={(e) => setSelectedLocation(e.target.value)}>
              {locations.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.risk}</option>)}
            </select>
          </label>
          <label className="fra-selector">
            <span>FORECAST HORIZON</span>
            <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
              <option>NOW</option>
              <option>+30 MIN</option>
              <option>+60 MIN</option>
              <option>+90 MIN</option>
              <option>+120 MIN</option>
              <option>+180 MIN</option>
            </select>
          </label>
        </div>
      </Panel>

      {/* ── 3. Primary workspace: Map + Assessment ── */}
      <div className="fra-workspace">
        {/* Map */}
        <Panel className="fra-map-panel">
          <div className="fra-map-header">
            <h2>Flood Risk Map</h2>
            <span className="nc-demo-chip">Demonstration Mode</span>
          </div>
          <div className="fra-map-container">
            <InteractiveRiskMap
              wards={regionWards}
              selectedWard=""
              onSelectWard={() => {}}
              prediction={prediction}
              activeLayers={activeMapLayers}
              terrainZones={regionTerrain}
              drainageNetwork={regionDrainage}
              focusedStreet={activeLocationId}
              onSelectStreet={handleStreetSelect}
              digitalTwin
              center={currentRegion?.center || NEUTRAL_MAP_CENTER}
              zoom={currentRegion?.zoom || 12}
              wardCoordinates={currentRegion?.wardCoordinates}
            />
            <div className="nc-map-layers">
              <span className="nc-map-layers-title">MAP LAYERS</span>
              {[
                ['risk', 'Flood Risk'],
                ['depth', 'Water Depth'],
                ['runoff', 'Rainfall'],
                ['network', 'Drainage Network'],
                ['capacity', 'Overloaded Nodes'],
                ['terrain', 'Elevation']
              ].map(([id, label]) => (
                <label key={id} className="nc-map-layer-item">
                  <input type="checkbox" checked={activeMapLayers[id] !== false} onChange={() => toggleMapLayer(id)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </Panel>

        {/* Right: Assessment */}
        <div className="fra-assessment-col">
          {/* Risk summary */}
          <Panel className="fra-risk-summary">
            <span className="fra-panel-label">FLOOD RISK ASSESSMENT</span>
            <h3 className="fra-location-name">{street.name}</h3>
            <p className="fra-location-terrain">{street.terrain.terrainType} · {street.terrain.elevation} m elevation</p>
            <div className="fra-risk-grid">
              <div>
                <span>Risk</span>
                <strong><RiskBadge level={riskDisplay} /></strong>
              </div>
              <div>
                <span>Predicted Depth</span>
                <strong className="fra-depth-value" style={{ color: street.waterDepth >= 30 ? '#dc2626' : street.waterDepth >= 15 ? '#ea580c' : '#1e293b' }}>{street.waterDepth} cm</strong>
              </div>
              <div>
                <span>Forecast Horizon</span>
                <strong>{selectedTime === 'NOW' ? 'Current' : selectedTime}</strong>
              </div>
              <div>
                <span>Peak Impact</span>
                <strong>{peakForStreet.depth} cm at {peakForStreet.time === 'NOW' ? 'current' : peakForStreet.time}</strong>
              </div>
            </div>
          </Panel>

          {/* Why this location is at risk */}
          <Panel className="fra-why-panel">
            <span className="fra-panel-label">WHY THIS LOCATION IS AT RISK</span>
            <div className="fra-why-lines">
              {riskExplanation.map((line, i) => (
                <p key={i} className="fra-why-line">{line}</p>
              ))}
            </div>
          </Panel>

          {/* Terrain analysis */}
          <Panel className="fra-terrain-panel">
            <span className="fra-panel-label">TERRAIN CONTRIBUTION</span>
            <div className="fra-terrain-grid">
              <div>
                <span>Elevation</span>
                <strong>{street.terrain.elevation} m — {street.terrain.terrainType}</strong>
              </div>
              <div>
                <span>Slope</span>
                <strong>{street.terrain.slope != null ? `${street.terrain.slope}°` : street.terrain.terrainType}</strong>
              </div>
              <div>
                <span>Accumulation Potential</span>
                <strong>{Math.round(street.terrain.accumulationPotential * 100)}%</strong>
              </div>
            </div>
            <p className="fra-terrain-note">
              {street.terrain.elevation <= 8
                ? 'Low elevation and higher accumulation potential increase the likelihood of surface water retention under heavy rainfall.'
                : 'Higher elevation reduces surface accumulation risk, though local drainage conditions still influence predicted depth.'}
            </p>
          </Panel>
        </div>
      </div>

      {/* ── 4. Contributing factors ── */}
      <Panel className="fra-factors-panel">
        <div className="fra-section-head">
          <div>
            <h2>Contributing Factors</h2>
            <p className="muted">Normalized factor contributions from the coupled flood model</p>
          </div>
          <strong className="fra-depth-badge">{fmtDepth(street.waterDepth)} <small>cm</small></strong>
        </div>
        <FactorContributionChart factors={factors} />
      </Panel>

      {/* ── 5. Causal flood chain ── */}
      <Panel className="fra-chain-panel">
        <div className="fra-section-head">
          <div>
            <h2>Causal Flood Chain · {selectedTime === 'NOW' ? 'Current' : selectedTime}</h2>
            <p className="muted">How rainfall converts to predicted street-level flood depth</p>
          </div>
          <span className="muted" style={{ fontSize: '11px' }}>Terrain-aware coupled model</span>
        </div>
        <CausalFloodChain street={street} prediction={prediction} />
      </Panel>

      {/* ── 6. Drainage analysis ── */}
      <Panel className="fra-drainage-panel">
        <div className="fra-section-head">
          <h2>Drainage Network Assessment</h2>
        </div>
        <div className="fra-drainage-grid">
          <div>
            <span>DRAINAGE UTILIZATION</span>
            <strong style={{ color: drainageUtil >= 100 ? '#dc2626' : drainageUtil >= 80 ? '#ea580c' : '#1e293b' }}>{drainageUtil}%</strong>
          </div>
          <div>
            <span>CAPACITY STATUS</span>
            <strong style={{ color: drainageUtil >= 100 ? '#dc2626' : '#1e293b' }}>{drainageUtil >= 100 ? 'OVER CAPACITY' : drainageUtil >= 80 ? 'NEAR CAPACITY' : 'WITHIN CAPACITY'}</strong>
          </div>
          <div>
            <span>OVERLOADED NODES</span>
            <strong>{overloadedCount}</strong>
          </div>
          <div>
            <span>SURCHARGE STATUS</span>
            <strong>{prediction.drainage.surchargeRisk >= 0.7 ? 'Elevated' : prediction.drainage.surchargeRisk >= 0.4 ? 'Moderate' : 'Low'}</strong>
          </div>
          <div>
            <span>BACKFLOW PROBABILITY</span>
            <strong style={{ color: backflowProb >= 50 ? '#dc2626' : '#1e293b' }}>{backflowProb}%</strong>
          </div>
          <div>
            <span>BLOCKED SEGMENTS</span>
            <strong>{blockedEdgesCount}</strong>
          </div>
        </div>
      </Panel>

      {/* ── 7. Counterfactual / Intervention assessment + Operational recommendations ── */}
      <div className="fra-bottom-grid">
        <Panel className="fra-counterfactual-panel">
          <div className="fra-section-head">
            <div>
              <h2>Intervention Assessment</h2>
              <p className="muted">Simplified scenarios re-run existing runoff, drainage and depth calculations</p>
            </div>
          </div>
          <div className="fra-cf-scenarios">
            {counterfactuals.map((scenario) => (
              <div key={scenario.label} className="fra-cf-card">
                <div className="fra-cf-header">
                  <strong>{scenario.label}</strong>
                  <span className="muted">{scenario.detail}</span>
                </div>
                <div className="fra-cf-comparison">
                  <div className="fra-cf-current">
                    <span>CURRENT</span>
                    <strong>{fmtDepth(scenario.from)} cm</strong>
                  </div>
                  <span className="fra-cf-arrow">→</span>
                  <div className="fra-cf-scenario">
                    <span>MODELLED</span>
                    <strong style={{ color: scenario.to < scenario.from ? '#16a34a' : '#1e293b' }}>{fmtDepth(scenario.to)} cm</strong>
                  </div>
                  <div className="fra-cf-delta">
                    <span>CHANGE</span>
                    <strong style={{ color: scenario.to < scenario.from ? '#16a34a' : '#ea580c' }}>
                      {scenario.to < scenario.from ? '−' : '+'}{fmtDepth(Math.abs(scenario.from - scenario.to))} cm
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="fra-cf-note" style={{ margin: '12px 0 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.45 }}>
            Scenario results are model outputs for decision support and require operational verification.
          </p>
        </Panel>

        <Panel className="fra-recommendations-panel">
          <div className="fra-section-head">
            <h2>Operational Considerations</h2>
          </div>
          <OperationalRecommendations factors={factors} street={street} />
          <p className="fra-rec-note">Recommended considerations based on prototype model conditions. Operational verification required before field deployment.</p>

          {/* Section 5: Transition to Emergency Response */}
          <div className="fra-transition-card" style={{ marginTop: '14px', padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
              OPERATIONAL RESPONSE COORDINATION
            </span>
            <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: '#1e293b', lineHeight: 1.45 }}>
              Transition from cause analysis to field operations for {street.name} ({fmtDepth(street.waterDepth)} cm predicted depth).
            </p>
            <Link
              to={`/emergency-response?street=${activeLocationId}&horizon=${selectedTime}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 14px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#ffffff',
                background: '#0284c7',
                borderRadius: '4px',
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onClick={() => {
                setSelectedStreetId(activeLocationId)
                setSelectedHorizon(selectedTime)
              }}
            >
              OPEN EMERGENCY RESPONSE →
            </Link>
          </div>
        </Panel>
      </div>

      {/* ── 8. Model confidence ── */}
      <Panel className="fra-confidence-panel">
        <div className="fra-section-head">
          <div>
            <h2>Model Input Quality</h2>
            <p className="muted">Input completeness and coverage indicators for prototype data sources</p>
          </div>
          <span className="nc-demo-chip">{source.isLive ? 'IMD Connected' : 'Demo / Simulated Input'}</span>
        </div>
        <ConfidencePanel factors={factors} regionId={selectedRegion} />
      </Panel>

      {/* ── 9. Analysis inputs (data provenance) ── */}
      <Panel className="fra-provenance-panel">
        <div className="fra-section-head" style={{ marginBottom: '8px' }}>
          <h2>Analysis Inputs</h2>
          <span className="muted" style={{ fontSize: '11px' }}>Data sources for this analysis</span>
        </div>
        <table className="nc-source-table">
          <thead>
            <tr>
              <th>DATA / MODEL</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Rainfall</td><td>{source.isLive ? 'IMD Connected' : 'Demonstration / simulated'}</td></tr>
            <tr><td>Terrain</td><td>Terrain-derived spatial characteristics</td></tr>
            <tr><td>Drainage</td><td>Directed drainage network graph</td></tr>
            <tr><td>Flood Engine</td><td>{MODEL_METADATA.name} ({MODEL_METADATA.version})</td></tr>
            <tr><td>Forecast Horizon</td><td>0–180 minutes</td></tr>
            <tr><td>Region</td><td>{currentRegion?.name || selectedRegion}</td></tr>
          </tbody>
        </table>
      </Panel>

      {/* Disclaimer */}
      <div className="jd-disclaimer">
        <strong>JalDrishti</strong> — Urban Flood Intelligence & Decision Support System · Prototype / Demonstration System · Model outputs are intended for decision support and require operational verification before field deployment.
      </div>
    </>
  )
}

export default ExplainableAIPage
