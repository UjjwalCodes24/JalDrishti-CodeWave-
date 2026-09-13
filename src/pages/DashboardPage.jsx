import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRegion } from '../context/useRegion'
import { NEUTRAL_MAP_CENTER } from '../data/regions'
import wardsData from '../data/wards.json'
import terrainData from '../data/terrain.json'
import drainageNetworkData from '../data/drainageNetwork.json'
import InteractiveRiskMap from '../components/InteractiveRiskMap'
import { getFloodForecast, getFloodPrediction } from '../services/floodEngine'
import { getExplainabilityData } from '../services/explainabilityService'
import { calculateSafeRoute, resolveRoadLocationIds } from '../services/routingService'
import { getEmergencySnapshot } from '../services/emergencyService'
import { Panel, RiskBadge } from '../components/ui'
import heroImage from '../assets/hero.png'

const quickModules = [
  { icon: '🌧️', title: 'Flood Risk Map', metric: 'Hotspots & wards', label: 'Open Map', to: '/risk-map', tone: 'teal' },
  { icon: '🚑', title: 'Flood-Safe Routes', metric: 'Passable corridors', label: 'Plan Route', to: '/safe-routes', tone: 'blue' },
  { icon: '🔍', title: 'Explainable AI', metric: 'Flood cause analysis', label: 'Explain Why', to: '/explainable-ai', tone: 'purple' },
  { icon: '⏱', title: 'AI Nowcast', metric: '3-hour forecast', label: 'View Forecast', to: '/nowcast', tone: 'cyan' },
  { icon: '🚨', title: 'Emergency Response', metric: 'Response units', label: 'Deploy Units', to: '/emergency-response', tone: 'red' },
  { icon: '📊', title: 'Situation Reports', metric: 'Current situation', label: 'View Report', to: '/dashboard', tone: 'slate' },
]

function DashboardPage() {
  const { selectedRegion, currentRegion } = useRegion()
  const [selectedTime, setSelectedTime] = useState('NOW')
  const [selectedWard, setSelectedWard] = useState('')
  const [focusedStreet, setFocusedStreet] = useState('')
  const [activeMapLayers, setActiveMapLayers] = useState({ risk: true, depth: true, network: true, capacity: true, terrain: false, runoff: true })

  const regionWards = currentRegion?.wards || wardsData
  const regionTerrain = currentRegion?.terrain || terrainData.zones
  const regionDrainage = currentRegion?.drainageNetwork || drainageNetworkData
  const dataSources = currentRegion?.dataSources || []

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
  const priorityStreets = sortedStreets.slice(0, 3)
  
  const focusedStreetObj = prediction.streets.find((street) => street.id === focusedStreet)
  const activeStreet = focusedStreetObj || priorityStreets[0] || prediction.streets[0]
  const activeWard = regionWards.some((w) => w.id === selectedWard) ? selectedWard : ''
  const activeStreetId = activeStreet?.id || currentRegion?.primaryFocusStreet
  
  const criticalZones = prediction.streets.filter((street) => street.risk === 'CRITICAL').length
  const affectedRoads = prediction.streets.filter((street) => street.waterDepth >= 15).length
  const status = prediction.highestWaterDepth >= 30 ? 'CRITICAL' : prediction.highestWaterDepth >= 15 ? 'HIGH' : 'MODERATE'
  const setHorizon = (time) => setSelectedTime(time)
  const toggleMapLayer = (layer) => setActiveMapLayers((current) => ({ ...current, [layer]: !current[layer] }))
  
  const explainability = getExplainabilityData(activeStreetId, selectedTime, selectedRegion)

  const topDrivers = explainability.factors.slice(0, 4)
  const primaryDriver = explainability.factors[0]

  const updatedAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const responseTeams = (currentRegion?.emergencyResponse?.teamLocations || []).length
  const corridor = currentRegion?.crisisCorridors?.[0]
  const rainSparkPoints = forecast
    .map((point, index) => {
      const maxRain = Math.max(...forecast.map((item) => item.intensity), 1)
      const x = (index / Math.max(forecast.length - 1, 1)) * 70
      const y = 26 - (point.intensity / maxRain) * 20
      return `${x},${y}`
    })
    .join(' ')

  return (
    <>
      <section className="dashboard-hero" style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '16px', padding: '24px 32px', color: 'white', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13, 31, 51, 0.9) 0%, rgba(20, 50, 80, 0.7) 50%, rgba(20, 50, 80, 0.4) 100%)', zIndex: 1 }}></div>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '60%' }}>
          {/* Change 2: Logo/icon removed — banner starts directly with eyebrow text */}
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#88aadd', textTransform: 'uppercase' }}>URBAN FLOOD MONITORING</span>
          <h1 style={{ fontSize: '32px', margin: '4px 0', fontWeight: 700 }}>Flood Intelligence Dashboard</h1>
          {/* Change 3: Updated subtitle to cover all urban cities, not just Mumbai */}
          <p style={{ margin: 0, color: '#cceeff', fontSize: '15px' }}>Monitor rainfall, drainage conditions and flood risk across urban cities.</p>
        </div>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
          <div style={{ background: 'rgba(20, 122, 90, 0.8)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', background: '#4dff4d', borderRadius: '50%' }}></span>
            Demonstration scenario
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '16px', color: '#112233', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '220px' }}>
            <div style={{ fontSize: '28px' }}>🌧️</div>
            <div>
              <div style={{ fontSize: '11px', color: '#556677', fontWeight: 600 }}>Current Weather</div>
              <div style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0' }}>Heavy Rainfall</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#004488' }}>{prediction.intensity} mm/hr</div>
            </div>
          </div>
        </div>
      </section>

      <div className="situation-summary-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="situation-card" style={{ border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', background: '#fffafa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: '#fee2e2', color: '#ef4444', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>!</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.5px' }}>CRITICAL ALERT</span>
            </div>
            <strong style={{ fontSize: '15px', display: 'block', color: '#111827' }}>{priorityStreets[0]?.name || 'Kurla Station Road'}</strong>
            <span style={{ fontSize: '12px', color: '#4b5563' }}>{priorityStreets[0]?.waterDepth || '97.8'} cm predicted depth</span>
          </div>
          <button style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '999px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, marginTop: '12px', cursor: 'pointer' }}>View on Map →</button>
        </div>

        <div className="situation-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span>🌧️</span> Rainfall
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{prediction.intensity}</span>
            <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '4px' }}>mm/hr</span>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>Heavy rainfall</div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>IMD / Radar (Simulated)</div>
        </div>

        <div className="situation-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ color: '#ef4444' }}>⚠️</span> Flood Risk
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>Critical</span>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>{criticalZones} locations require attention</div>
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>View Details →</div>
        </div>

        <div className="situation-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ color: '#3b82f6' }}>⚖️</span> Drainage Load
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{Math.round(prediction.drainage.utilization * 100)}%</span>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>{prediction.drainage.overloadedNodes.length} nodes overloaded</div>
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>View Details →</div>
        </div>

        <div className="situation-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ color: '#1e293b' }}>🛣️</span> Roads at Risk
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{affectedRoads}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>{affectedRoads} roads restricted</div>
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>View Details →</div>
        </div>
      </div>

      <div className="ops-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.9fr)', gap: '16px' }}>
        <div className="ops-main" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Panel className="dashboard-map-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div className="panel-heading" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px', color: '#14b8a6' }}>🗺️</span>
              <div>
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Live Flood Situation Map</h2>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>Current flood risk, water depth and affected roads.</p>
              </div>
            </div>
            <div className="dashboard-map-hero" style={{ height: '480px', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
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
              
              <div className="map-glass map-status-overlay" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                <span className="map-status-title" style={{ fontWeight: 600, color: '#14b8a6', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="status-dot" style={{ width: '6px', height: '6px', background: '#14b8a6', borderRadius: '50%' }} /> Demonstration mode</span>
                <small className="map-status-subtitle" style={{ color: '#64748b' }}>{currentRegion?.name || 'Mumbai Metropolitan Area'}</small>
              </div>

              <div className="map-glass map-layer-overlay" style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1000, padding: '12px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span className="map-layer-title" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>Map Layers</span>
                <div className="map-layer-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    ['risk', 'Flood risk'],
                    ['depth', 'Water depth'],
                    ['runoff', 'Rainfall'],
                    ['network', 'Drainage network'],
                    ['capacity', 'Overloaded nodes'],
                    ['terrain', 'Elevation']
                  ].map(([id, label]) => (
                    <label key={id} className="map-layer-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={activeMapLayers[id] !== false}
                        onChange={() => toggleMapLayer(id)}
                        style={{ accentColor: '#14b8a6' }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="map-glass map-legend-overlay" style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000, padding: '10px 12px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span className="map-legend-title" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Flood Depth</span>
                <div className="map-legend-grid" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} /> 0–5 cm (Safe)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} /> 5–15 cm (Low)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} /> 15–30 cm (Moderate)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} /> 30–50 cm (High)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#991b1b' }} /> 50+ cm (Critical)</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="dashboard-forecast-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
            <div className="panel-heading forecast-panel-heading" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '20px' }}>📈</span>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700, color: '#1e293b' }}>Flood Impact Forecast</h2>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Street-level flood progression over the next 3 hours.</p>
              </div>
            </div>
            
            <div className="forecast-timeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0', background: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {forecast.map((point, index) => {
                const isSelected = selectedTime === point.time
                const pointRisk = point.highestWaterDepth >= 30 ? 'CRITICAL' : point.highestWaterDepth >= 15 ? 'HIGH' : point.highestWaterDepth >= 5 ? 'MODERATE' : 'SAFE'
                const roadsCount = point.streets.filter((s) => s.waterDepth >= 15).length
                const stageName = index === 0 ? 'Baseline' : index === 1 ? 'Early accumulation' : index === 2 ? 'Drainage stress' : index === 3 ? 'Peak inundation' : index === 4 ? 'Flood impact' : 'Recovery'
                const horizonLabel = index === 0 ? 'NOW' : point.time

                return (
                  <button
                    type="button"
                    key={point.time}
                    className={`forecast-timeline-step severity-${pointRisk.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setHorizon(point.time)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 10px',
                      borderRadius: '0',
                      border: 'none',
                      minWidth: 0,
                      background: isSelected ? '#ffffff' : '#f8fafc',
                      borderRight: index < 5 ? '1px solid #e2e8f0' : 'none',
                      boxShadow: isSelected ? 'inset 0 -3px 0 #3b82f6' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                      zIndex: isSelected ? 10 : 1,
                      borderTop: isSelected ? '3px solid #3b82f6' : 'none'
                    }}
                  >
                      <div>
                        <div className="timeline-step-header" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span className="timeline-step-time" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{horizonLabel}</span>
                          <span className={`forecast-risk-tag ${pointRisk.toLowerCase()}`} style={{ fontSize: '10px', fontWeight: 700, color: pointRisk === 'CRITICAL' ? '#dc2626' : pointRisk === 'HIGH' ? '#ea580c' : '#ca8a04', background: pointRisk === 'CRITICAL' ? '#fee2e2' : pointRisk === 'HIGH' ? '#ffedd5' : '#fef9c3', padding: '2px 8px', borderRadius: '4px' }}>{pointRisk}</span>
                        </div>
                      </div>
                      
                      <div className="timeline-step-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <div className="timeline-metric-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'rgba(255,255,255,0.7)', padding: '5px 8px', borderRadius: '6px' }}>
                          <span className="timeline-metric-label" style={{ color: '#64748b' }}>Depth</span>
                          <strong className="timeline-metric-val" style={{ color: '#0f172a', fontSize: '13px' }}>{point.highestWaterDepth} cm</strong>
                        </div>
                        <div className="timeline-metric-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'rgba(255,255,255,0.7)', padding: '5px 8px', borderRadius: '6px' }}>
                          <span className="timeline-metric-label" style={{ color: '#64748b' }}>Drainage</span>
                          <strong className="timeline-metric-val" style={{ color: '#0f172a', fontSize: '13px' }}>{Math.round(point.drainage.utilization * 100)}%</strong>
                        </div>
                        <div className="timeline-metric-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'rgba(255,255,255,0.7)', padding: '5px 8px', borderRadius: '6px' }}>
                          <span className="timeline-metric-label" style={{ color: '#64748b' }}>Rain</span>
                          <strong className="timeline-metric-val" style={{ color: '#0f172a', fontSize: '13px' }}>{point.intensity} mm/hr</strong>
                        </div>
                        <div className="timeline-metric-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'rgba(255,255,255,0.7)', padding: '5px 8px', borderRadius: '6px' }}>
                          <span className="timeline-metric-label" style={{ color: '#64748b' }}>Roads</span>
                          <strong className="timeline-metric-val" style={{ color: '#0f172a', fontSize: '13px' }}>{roadsCount} at risk</strong>
                        </div>
                      </div>
                  </button>
                )
              })}
            </div>
          </Panel>
        </div>

        <div className="ops-aside" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Panel className="priority-alerts-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>
            <div className="priority-alerts-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', color: '#ef4444' }}>🛡️</span>
                <div>
                  <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Priority Alerts</h2>
                  <span className="priority-alerts-subtitle" style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Ranked by severity</span>
                </div>
              </div>
              <div className="alerts-head-actions">
                <span className="alert-count-badge" style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{priorityStreets.length} active</span>
              </div>
            </div>
            
            <div className="dashboard-alert-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {priorityStreets.map((street, index) => {
                const riskLevel = (street.risk || 'MODERATE').toUpperCase()
                const actionText = street.waterDepth >= 60 ? 'Restrict traffic: Deploy pumps' : street.waterDepth >= 30 ? 'Prepare emergency response' : 'Stage emergency response'

                return (
                  <article
                    className="dashboard-alert"
                    key={street.id}
                    onClick={() => setFocusedStreet(street.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      background: '#fffafa',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="dashboard-alert-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="priority-rank-tag" style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>P0{index + 1}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>CRITICAL</span>
                    </div>
                    <h3 className="alert-location-title" style={{ fontSize: '14px', margin: '0 0 4px', fontWeight: 700 }}>{street.name}</h3>
                    <div className="alert-depth-stat" style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      <span className="alert-depth-number" style={{ fontWeight: 700, color: '#1e293b' }}>{street.waterDepth} cm</span> predicted depth
                    </div>
                    <div className="alert-action-recommendation" style={{ fontSize: '12px', padding: '6px 0', borderTop: '1px solid #fee2e2', color: '#ef4444' }}>
                      {actionText}
                    </div>
                    <button
                      type="button"
                      className="alert-locate-btn"
                      onClick={(event) => { event.stopPropagation(); setFocusedStreet(street.id) }}
                      style={{ background: 'transparent', border: 'none', padding: 0, color: '#14b8a6', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
                    >
                      Locate on Map →
                    </button>
                  </article>
                )
              })}
            </div>
            
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link className="priority-alerts-action-link" to="/emergency-response" style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 600 }}>
                View All Alerts →
              </Link>
            </div>
          </Panel>

          <section className="quick-modules-section" style={{ background: 'transparent', padding: 0, margin: 0, borderRadius: 0 }}>
            <div className="section-heading" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span style={{ fontSize: '18px' }}>🧩</span>
               <h2 style={{ fontSize: '14px', margin: 0, fontWeight: 700 }}>Decision Support Actions</h2>
            </div>
            <div className="quick-module-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {quickModules.slice(0, 3).map((module) => (
                <Link className={`quick-module ${module.tone}`} to={module.to} key={module.title} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 'auto' }}>
                  <span className="quick-module-icon" style={{ fontSize: '20px', marginBottom: '8px' }}>{module.icon}</span>
                  <strong style={{ fontSize: '11px', color: '#1e293b', marginBottom: '2px', lineHeight: 1.2 }}>{module.title}</strong>
                  <span className="module-metric-pill" style={{ fontSize: '9px', color: '#64748b', marginBottom: '8px', lineHeight: 1.2 }}>{module.metric}</span>
                  <b style={{ fontSize: '10px', color: '#3b82f6', marginTop: 'auto' }}>{module.label} →</b>
                </Link>
              ))}
            </div>
          </section>

          <Panel className="data-sources-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div className="data-sources-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', background: '#14b8a6', borderRadius: '50%' }}></span>
                <div>
                  <h2 style={{ fontSize: '13px', margin: 0, fontWeight: 700 }}>System Operational</h2>
                  <p className="muted" style={{ margin: 0, fontSize: '10px' }}>Monitoring & data sources</p>
                </div>
              </div>
              <div className="system-operational" style={{ fontSize: '10px', background: 'white', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                <span className="status-dot" style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', marginRight: '4px' }} /> Demo Mode
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ color: '#1e293b' }}>IMD Rainfall</strong>
                <span style={{ color: '#14b8a6' }}>Live data</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ color: '#1e293b' }}>Doppler Radar</strong>
                <span style={{ color: '#3b82f6' }}>Simulation</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ color: '#1e293b' }}>Drainage Network</strong>
                <span style={{ color: '#64748b' }}>Loaded</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Link to="/explainable-ai" style={{ color: '#3b82f6', fontWeight: 600 }}>View All Sources →</Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <footer className="dashboard-footer" style={{ marginTop: '24px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', background: 'white', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong style={{ fontSize: '13px', color: '#1e293b' }}>Safer Cities</strong>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Stronger Communities</span>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>SELECTED HORIZON</span>
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>NOW</strong>
            <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>ESTIMATED RISK <span style={{ color: '#ef4444', fontWeight: 700 }}>▲ High</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
             <span style={{ fontSize: '9px', color: '#64748b' }}>Rainfall</span>
             <strong style={{ fontSize: '14px', color: '#1e293b' }}>{prediction.intensity} mm/hr</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
             <span style={{ fontSize: '9px', color: '#64748b' }}>Peak Water Depth</span>
             <strong style={{ fontSize: '14px', color: '#1e293b' }}>{prediction.highestWaterDepth} cm</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
             <span style={{ fontSize: '9px', color: '#64748b' }}>Drainage Load</span>
             <strong style={{ fontSize: '14px', color: '#1e293b' }}>{Math.round(prediction.drainage.utilization * 100)}%</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
             <span style={{ fontSize: '9px', color: '#64748b' }}>Affected Roads</span>
             <strong style={{ fontSize: '14px', color: '#1e293b' }}>{affectedRoads} sectors</strong>
          </div>
        </div>
      </footer>
    </>
  )
}

export default DashboardPage


