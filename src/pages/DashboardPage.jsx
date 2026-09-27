import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRegion } from '../context/useRegion'
import { NEUTRAL_MAP_CENTER } from '../data/regions'
import wardsData from '../data/wards.json'
import terrainData from '../data/terrain.json'
import drainageNetworkData from '../data/drainageNetwork.json'
import InteractiveRiskMap from '../components/InteractiveRiskMap'
import WorkflowIndicator from '../components/workflow/WorkflowIndicator'
import { getFloodForecast, getFloodPrediction, MODEL_METADATA } from '../services/floodEngine'
import { getExplainabilityData } from '../services/explainabilityService'
import { calculateSafeRoute, resolveRoadLocationIds } from '../services/routingService'
import { getEmergencySnapshot } from '../services/emergencyService'
import { Panel, RiskBadge } from '../components/ui'

function fmtDepth(v) {
  const n = Number(v)
  return isNaN(n) ? '—' : Number(n.toFixed(1))
}

function DashboardPage() {
  const { selectedRegion, currentRegion, setSelectedHorizon, setSelectedStreetId } = useRegion()
  const [selectedTime, setSelectedTime] = useState('NOW')
  const [selectedWard, setSelectedWard] = useState('')
  const [focusedStreet, setFocusedStreet] = useState('')
  const [activeMapLayers, setActiveMapLayers] = useState({ risk: true, depth: true, network: true, capacity: true, terrain: false, runoff: true })

  const regionWards = currentRegion?.wards || wardsData
  const regionTerrain = currentRegion?.terrain || terrainData.zones
  const regionDrainage = currentRegion?.drainageNetwork || drainageNetworkData

  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const prediction = useMemo(() => getFloodPrediction(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const sortedStreets = useMemo(() => [...prediction.streets].sort((a, b) => b.waterDepth - a.waterDepth), [prediction.streets])
  const recommendedRoute = useMemo(() => {
    const origin = currentRegion?.defaultOrigin
    const destination = currentRegion?.defaultDestination
    if (!origin || !destination) return null
    const { startId, destinationId } = resolveRoadLocationIds(origin, destination, selectedRegion)
    return calculateSafeRoute(startId, destinationId, selectedTime, 'Emergency Vehicle', selectedRegion)?.recommended || null
  }, [currentRegion, selectedRegion, selectedTime])
  const emergencySnapshot = useMemo(() => getEmergencySnapshot(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const priorityStreets = sortedStreets.slice(0, 5)

  const focusedStreetObj = prediction.streets.find((street) => street.id === focusedStreet)
  const activeStreet = focusedStreetObj || priorityStreets[0] || prediction.streets[0]
  const activeWard = regionWards.some((w) => w.id === selectedWard) ? selectedWard : ''
  const activeStreetId = activeStreet?.id || currentRegion?.primaryFocusStreet

  const criticalZones = prediction.streets.filter((street) => street.risk === 'CRITICAL').length
  const highZones = prediction.streets.filter((street) => street.risk === 'HIGH').length
  const affectedRoads = prediction.streets.filter((street) => street.waterDepth >= 15).length
  const toggleMapLayer = (layer) => setActiveMapLayers((current) => ({ ...current, [layer]: !current[layer] }))

  const explainability = getExplainabilityData(activeStreetId, selectedTime, selectedRegion)

  // Find peak forecast horizon
  const peakPoint = forecast.reduce((best, pt) => pt.highestWaterDepth > best.highestWaterDepth ? pt : best, forecast[0])
  const peakTime = peakPoint?.time === 'NOW' ? 'Current' : peakPoint?.time || '—'

  // Drainage utilization
  const drainageUtil = Math.round(prediction.drainage.utilization * 100)

  // Overall status
  const overallStatus = prediction.highestWaterDepth >= 30 ? 'CRITICAL' : prediction.highestWaterDepth >= 15 ? 'HIGH' : prediction.highestWaterDepth >= 5 ? 'MODERATE' : 'NORMAL'
  const statusColors = {
    CRITICAL: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', text: 'Critical flood conditions predicted' },
    HIGH: { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c', text: 'High flood risk in monitored areas' },
    MODERATE: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', text: 'Moderate flood risk — monitoring active' },
    NORMAL: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', text: 'Normal conditions — no significant flood risk' },
  }
  const sc = statusColors[overallStatus]

  return (
    <>
      {/* ── Operational Workflow Indicator (Section 8) ── */}
      <WorkflowIndicator currentStage="IDENTIFY" style={{ marginBottom: '14px' }} />

      {/* Section 1: Current Flood Situation banner */}
      <div className="jd-situation-banner" style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderLeft: `4px solid ${sc.color}`, borderRadius: '8px', padding: '14px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>CURRENT FLOOD SITUATION</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: sc.color }}>{sc.text}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: sc.color, background: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '4px', border: `1px solid ${sc.border}` }}>
            {overallStatus}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {currentRegion?.name || 'Selected Region'} · {selectedTime === 'NOW' ? 'Current' : selectedTime}
          </span>
        </div>
      </div>

      {/* Section 2: Operational Metrics (compact strip) */}
      <div className="jd-metrics-strip">
        <div className="jd-metric-item">
          <span className="jd-metric-label">MAX PREDICTED STREET DEPTH</span>
          <span className="jd-metric-value" style={{ color: prediction.highestWaterDepth >= 30 ? '#dc2626' : prediction.highestWaterDepth >= 15 ? '#ea580c' : '#16a34a' }}>
            {fmtDepth(prediction.highestWaterDepth)} <small>cm</small>
          </span>
        </div>
        <div className="jd-metric-divider" />
        <div className="jd-metric-item">
          <span className="jd-metric-label">PEAK IMPACT</span>
          <span className="jd-metric-value">{peakTime}</span>
        </div>
        <div className="jd-metric-divider" />
        <div className="jd-metric-item">
          <span className="jd-metric-label">CRITICAL ZONES</span>
          <span className="jd-metric-value" style={{ color: criticalZones > 0 ? '#dc2626' : '#16a34a' }}>{criticalZones}</span>
        </div>
        <div className="jd-metric-divider" />
        <div className="jd-metric-item">
          <span className="jd-metric-label">ROADS AT RISK</span>
          <span className="jd-metric-value" style={{ color: affectedRoads > 0 ? '#ea580c' : '#16a34a' }}>{affectedRoads}</span>
        </div>
        <div className="jd-metric-divider" />
        <div className="jd-metric-item">
          <span className="jd-metric-label">DRAINAGE UTILIZATION</span>
          <span className="jd-metric-value" style={{ color: drainageUtil >= 150 ? '#dc2626' : drainageUtil >= 100 ? '#ea580c' : '#16a34a' }}>
            {drainageUtil}<small>%</small>
          </span>
        </div>
        <div className="jd-metric-divider" />
        <div className="jd-metric-item">
          <span className="jd-metric-label">RAINFALL</span>
          <span className="jd-metric-value">{prediction.intensity} <small>mm/hr</small></span>
        </div>
      </div>

      {/* Section 3: Main GIS Map — Visual centerpiece */}
      <Panel className="jd-map-panel" style={{ padding: '0', marginBottom: '16px', overflow: 'hidden' }}>
        <div className="jd-map-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Flood Situation Map</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              {currentRegion?.name} · {prediction.time} · {prediction.intensity} mm/hr rainfall
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#0d9488', background: '#f0fdfa', padding: '3px 10px', borderRadius: '4px', border: '1px solid #ccfbf1' }}>
              Demonstration Mode
            </span>
          </div>
        </div>
        <div className="jd-map-container" style={{ height: '520px', position: 'relative' }}>
          <InteractiveRiskMap
            wards={regionWards}
            selectedWard={activeWard}
            onSelectWard={setSelectedWard}
            prediction={prediction}
            activeLayers={activeMapLayers}
            terrainZones={regionTerrain}
            drainageNetwork={regionDrainage}
            focusedStreet={focusedStreet}
            onSelectStreet={setFocusedStreet}
            digitalTwin
            center={currentRegion?.center || NEUTRAL_MAP_CENTER}
            zoom={currentRegion?.zoom || 11}
            wardCoordinates={currentRegion?.wardCoordinates}
          />

          {/* Layer controls */}
          <div className="jd-map-layers">
            <span className="jd-map-layers-title">Map Layers</span>
            {[
              ['risk', 'Flood risk'],
              ['depth', 'Water depth'],
              ['runoff', 'Rainfall'],
              ['network', 'Drainage network'],
              ['capacity', 'Overloaded nodes'],
              ['terrain', 'Elevation']
            ].map(([id, label]) => (
              <label key={id} className="jd-map-layer-item">
                <input
                  type="checkbox"
                  checked={activeMapLayers[id] !== false}
                  onChange={() => toggleMapLayer(id)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {/* Legend */}
          <div className="jd-map-legend">
            <span className="jd-map-legend-title">Predicted Street Depth</span>
            <div className="jd-map-legend-items">
              <span><i style={{ background: '#22c55e' }} />0–5 cm (Safe)</span>
              <span><i style={{ background: '#3b82f6' }} />5–15 cm (Low)</span>
              <span><i style={{ background: '#f59e0b' }} />15–30 cm (Moderate)</span>
              <span><i style={{ background: '#ef4444' }} />30–50 cm (High)</span>
              <span><i style={{ background: '#991b1b' }} />50+ cm (Critical)</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Section 4: Forecast Timeline */}
      <Panel className="jd-forecast-panel" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Flood Impact Forecast</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Street-level flood progression · 0–180 minutes</p>
          </div>
          <Link to={`/nowcast?horizon=${selectedTime}`} style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
            Full Nowcast ({selectedTime}) →
          </Link>
        </div>
        <div className="jd-forecast-grid">
          {forecast.map((point, index) => {
            const isSelected = selectedTime === point.time
            const pointRisk = point.highestWaterDepth >= 30 ? 'CRITICAL' : point.highestWaterDepth >= 15 ? 'HIGH' : point.highestWaterDepth >= 5 ? 'MODERATE' : 'SAFE'
            const roadsCount = point.streets.filter((s) => s.waterDepth >= 15).length
            const riskColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MODERATE: '#d97706', SAFE: '#16a34a' }
            const riskBg = { CRITICAL: '#fef2f2', HIGH: '#fff7ed', MODERATE: '#fffbeb', SAFE: '#f0fdf4' }

            return (
              <button
                type="button"
                key={point.time}
                className={`jd-forecast-step${isSelected ? ' selected' : ''}`}
                onClick={() => {
                  setSelectedTime(point.time)
                  setSelectedHorizon(point.time)
                }}
              >
                <div className="jd-forecast-step-top">
                  <span className="jd-forecast-step-time">{index === 0 ? 'NOW' : point.time}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: riskColors[pointRisk], background: riskBg[pointRisk], padding: '1px 6px', borderRadius: '3px' }}>{pointRisk}</span>
                </div>
                <div className="jd-forecast-step-metrics">
                  <div className="jd-forecast-metric">
                    <span>Depth</span><strong>{fmtDepth(point.highestWaterDepth)} cm</strong>
                  </div>
                  <div className="jd-forecast-metric">
                    <span>Drainage</span><strong>{Math.round(point.drainage.utilization * 100)}%</strong>
                  </div>
                  <div className="jd-forecast-metric">
                    <span>Rain</span><strong>{point.intensity} mm/hr</strong>
                  </div>
                  <div className="jd-forecast-metric">
                    <span>Roads</span><strong>{roadsCount} at risk</strong>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Section 5: Priority Flood Zones table (Section 3 entry point) */}
      <Panel className="jd-priority-panel" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Priority Flood Zones</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Operational entry point · Click any location to open coupled flood risk analysis · {selectedTime === 'NOW' ? 'Current' : selectedTime}
            </p>
          </div>
          <Link to="/risk-map" style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7', textDecoration: 'none' }}>Full Risk Map →</Link>
        </div>
        <div className="jd-priority-table">
          <div className="jd-priority-table-header" style={{ gridTemplateColumns: '1.2fr 0.7fr 1fr 0.8fr 1fr 0.6fr 1.2fr' }}>
            <span>LOCATION</span>
            <span>RISK</span>
            <span>PREDICTED DEPTH</span>
            <span>PEAK TIME</span>
            <span>DRAINAGE STATUS</span>
            <span>PRIORITY</span>
            <span>OPERATIONAL ACTION</span>
          </div>
          {sortedStreets.map((street, index) => {
            const peakHorizon = forecast.reduce((best, pt) => {
              const s = pt.streets.find(st => st.id === street.id)
              return (s && s.waterDepth > (best?.depth || 0)) ? { time: pt.time, depth: s.waterDepth } : best
            }, { time: '—', depth: 0 })
            const nodeUtil = street.drainageUtilization != null ? Math.round(street.drainageUtilization * 100) : drainageUtil
            const priority = street.risk === 'CRITICAL' ? 'P01' : street.risk === 'HIGH' ? 'P02' : street.risk === 'MODERATE' ? 'P03' : 'P04'

            return (
              <div
                key={street.id}
                className={`jd-priority-table-row${focusedStreet === street.id ? ' selected' : ''}`}
                style={{ gridTemplateColumns: '1.2fr 0.7fr 1fr 0.8fr 1fr 0.6fr 1.2fr', alignItems: 'center', display: 'grid' }}
                onClick={() => {
                  setFocusedStreet(street.id)
                  setSelectedStreetId(street.id)
                  setSelectedHorizon(selectedTime)
                }}
              >
                <span className="jd-priority-location">
                  <strong>{street.name}</strong>
                  <small>{street.terrain?.terrainType} · {street.terrain?.elevation}m</small>
                </span>
                <span><RiskBadge level={street.risk} /></span>
                <span className="jd-priority-depth">
                  <strong style={{ color: street.waterDepth >= 30 ? '#dc2626' : street.waterDepth >= 15 ? '#ea580c' : '#1e293b' }}>{fmtDepth(street.waterDepth)} cm</strong>
                  <div className="jd-depth-bar"><div style={{ width: `${Math.min(100, street.waterDepth * 1.5)}%`, background: street.waterDepth >= 30 ? '#dc2626' : street.waterDepth >= 15 ? '#ea580c' : street.waterDepth >= 5 ? '#d97706' : '#16a34a' }} /></div>
                </span>
                <span style={{ fontSize: '12px', color: '#475569' }}>{peakHorizon.time === 'NOW' ? 'Current' : peakHorizon.time}</span>
                <span style={{ fontSize: '12px', color: nodeUtil >= 100 ? '#dc2626' : '#475569' }}>{nodeUtil}% utilization</span>
                <span className="jd-priority-tag" style={{ color: priority === 'P01' ? '#dc2626' : priority === 'P02' ? '#ea580c' : '#64748b' }}>{priority}</span>
                <span>
                  <Link
                    to={`/explainable-ai?street=${street.id}&horizon=${selectedTime}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#0284c7',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedStreetId(street.id)
                      setSelectedHorizon(selectedTime)
                    }}
                  >
                    EXPLAIN RISK →
                  </Link>
                </span>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Section 6: Flood Intelligence Pipeline */}
      <Panel style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Flood Intelligence Pipeline</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>How JalDrishti converts rainfall into flood-impact intelligence</p>
          </div>
          <Link to="/data-status" style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>Data & Model Status →</Link>
        </div>
        <div className="jd-pipeline-horizontal">
          {[
            { step: '01', label: 'Rainfall', detail: `${prediction.intensity} mm/hr` },
            { step: '02', label: 'Surface Runoff', detail: 'Terrain accumulation' },
            { step: '03', label: 'Terrain Response', detail: 'Elevation & slope' },
            { step: '04', label: 'Drainage Network', detail: `${prediction.drainage.nodes?.length || 0} nodes` },
            { step: '05', label: 'Capacity / Blockage', detail: `${drainageUtil}% utilized` },
            { step: '06', label: 'Surcharge / Backflow', detail: `${Math.round(prediction.drainage.backflowProbability * 100)}% prob` },
            { step: '07', label: 'Predicted Street Depth', detail: `${fmtDepth(prediction.highestWaterDepth)} cm max` },
          ].map((item, i, arr) => (
            <div key={i} className="jd-pipeline-h-step">
              <div className="jd-pipeline-h-stepnum">{item.step}</div>
              <div className="jd-pipeline-h-text">
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
              {i < arr.length - 1 && <div className="jd-pipeline-h-arrow">→</div>}
            </div>
          ))}
        </div>
      </Panel>

      {/* Section 7: Quick links & operational status */}
      <div className="jd-bottom-row">
        <Panel className="jd-data-status-compact">
          <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Data & Model Status</h3>
          <div className="jd-data-status-grid">
            {[
              { label: 'Rainfall Input', value: 'Demonstration', status: 'demo' },
              { label: 'Terrain', value: 'Loaded', status: 'ok' },
              { label: 'Drainage', value: 'Loaded', status: 'ok' },
              { label: 'Flood Engine', value: MODEL_METADATA.version, status: 'ok' },
              { label: 'Forecast', value: '0–180 min', status: 'ok' },
              { label: 'Region', value: currentRegion?.shortName || selectedRegion, status: 'ok' },
            ].map((item) => (
              <div key={item.label} className="jd-data-status-item">
                <span className="jd-data-status-dot" style={{ background: item.status === 'demo' ? '#f59e0b' : '#22c55e' }} />
                <div>
                  <span className="jd-data-status-lbl">{item.label}</span>
                  <span className="jd-data-status-val">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/data-status" style={{ display: 'block', marginTop: '10px', fontSize: '11px', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>View Full Status →</Link>
        </Panel>

        <Panel className="jd-quick-actions">
          <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Decision Support</h3>
          <div className="jd-quick-links">
            <Link to="/risk-map" className="jd-quick-link">
              <span className="jd-ql-icon-num">01</span>
              <div><strong>Risk Map</strong><span>Spatial flood intelligence</span></div>
            </Link>
            <Link to="/safe-routes" className="jd-quick-link">
              <span className="jd-ql-icon-num">02</span>
              <div><strong>Flood-Safe Routes</strong><span>Lower predicted flood exposure</span></div>
            </Link>
            <Link to="/nowcast" className="jd-quick-link">
              <span className="jd-ql-icon-num">03</span>
              <div><strong>Flood Nowcast</strong><span>0–3 hour forecast</span></div>
            </Link>
            <Link to="/emergency-response" className="jd-quick-link">
              <span className="jd-ql-icon-num">04</span>
              <div><strong>Emergency Response</strong><span>Response coordination</span></div>
            </Link>
            <Link to="/explainable-ai" className="jd-quick-link">
              <span className="jd-ql-icon-num">05</span>
              <div><strong>Flood Risk Analysis</strong><span>Coupled cause analysis</span></div>
            </Link>
          </div>
        </Panel>
      </div>

      {/* Disclaimer */}
      <div className="jd-disclaimer">
        <strong>JalDrishti</strong> — Urban Flood Intelligence & Decision Support System · Prototype / Demonstration System · Model outputs are intended for decision support and require operational verification before field deployment.
      </div>
    </>
  )
}

export default DashboardPage
