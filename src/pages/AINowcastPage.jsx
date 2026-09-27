import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Panel, PageHeader, RiskBadge } from '../components/ui'
import { useRegion } from '../context/useRegion'
import { NEUTRAL_MAP_CENTER } from '../data/regions'
import wardsData from '../data/wards.json'
import terrainData from '../data/terrain.json'
import drainageNetworkData from '../data/drainageNetwork.json'
import InteractiveRiskMap from '../components/InteractiveRiskMap'
import WorkflowIndicator from '../components/workflow/WorkflowIndicator'
import { getFloodForecast, getFloodPrediction, MODEL_METADATA } from '../services/floodEngine'
import { getRainfallInput } from '../services/dataSourceService'
import { getNowcastImpact, getForecastImpact } from '../services/floodPredictionService'

function fmtDepth(v) {
  const n = Number(v)
  return isNaN(n) ? '—' : Number(n.toFixed(1))
}

/* ────────────────────────────────────────────────────────────
   Operational interpretation — derived from available data only.
   No unsupported claims. No generic AI paragraphs.
   ──────────────────────────────────────────────────────────── */
function getOperationalInterpretation(impact, drainageUtil) {
  const lines = []
  if (impact.criticalRoads > 0) {
    lines.push(`${impact.criticalRoads} modeled location${impact.criticalRoads > 1 ? 's' : ''} exceed${impact.criticalRoads === 1 ? 's' : ''} the critical depth threshold. Priority monitoring is required.`)
  }
  if (drainageUtil >= 100) {
    lines.push('Drainage capacity is exceeded at modeled locations, increasing surface accumulation risk.')
  } else if (drainageUtil >= 80) {
    lines.push('Drainage network approaching capacity. Surface accumulation risk is elevated.')
  }
  if (impact.highRiskRoads > 0 && impact.criticalRoads === 0) {
    lines.push(`${impact.highRiskRoads} location${impact.highRiskRoads > 1 ? 's are' : ' is'} classified as high risk. Continued monitoring recommended.`)
  }
  if (lines.length === 0) {
    if (impact.highestWaterDepth >= 5) {
      lines.push('Localized flood risk is indicated. Continued monitoring is recommended.')
    } else {
      lines.push('No significant flood risk at modeled locations. Normal monitoring conditions.')
    }
  }
  return lines
}

/* ────────────────────────────────────────────────────────────
   Progression description — derived from existing forecast data.
   ──────────────────────────────────────────────────────────── */
function getProgressionLabel(impacts, index) {
  if (!impacts || !impacts[index]) return ''
  const curr = impacts[index]
  const prev = index > 0 ? impacts[index - 1] : null
  const peakIdx = impacts.reduce((pi, p, i) => p.highestWaterDepth > impacts[pi].highestWaterDepth ? i : pi, 0)

  if (index === 0) {
    if (curr.criticalRoads > 0) return 'Critical conditions'
    if (curr.highRiskRoads > 0) return 'Elevated risk'
    return 'Baseline conditions'
  }
  if (index === peakIdx) return 'Peak predicted impact'
  if (prev) {
    const depthChange = curr.highestWaterDepth - prev.highestWaterDepth
    const roadsChange = curr.highRiskRoads - prev.highRiskRoads
    if (depthChange > 5 && roadsChange > 0) return 'Risk increasing'
    if (depthChange > 5) return 'Depth increasing'
    if (depthChange < -5) return 'Conditions improving'
    if (curr.criticalRoads > 0 && index > peakIdx) return 'Critical conditions persist'
    if (index > peakIdx) return 'Risk remains elevated'
  }
  return 'Monitoring active'
}

/* ════════════════════════════════════════════════════════════
   Flood Nowcast Page
   ════════════════════════════════════════════════════════════ */
function AINowcastPage() {
  const { selectedRegion, currentRegion, selectedHorizon, setSelectedHorizon, setSelectedStreetId } = useRegion()
  const [searchParams] = useSearchParams()
  const initialHorizon = searchParams.get('horizon') || selectedHorizon || 'NOW'

  const input = useMemo(() => getRainfallInput(selectedRegion), [selectedRegion])
  const source = input.dataSource

  const regionWards = currentRegion?.wards || wardsData
  const regionTerrain = currentRegion?.terrain || terrainData.zones
  const regionDrainage = currentRegion?.drainageNetwork || drainageNetworkData

  const [selectedTime, setSelectedTime] = useState(initialHorizon)
  const [focusedStreet, setFocusedStreet] = useState('')
  const [selectedWard, setSelectedWard] = useState('')
  const [activeMapLayers, setActiveMapLayers] = useState({ risk: true, depth: true, network: true, capacity: true, terrain: false, runoff: true })
  const [isPlaying, setIsPlaying] = useState(false)
  const playRef = useRef(null)

  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const prediction = useMemo(() => getFloodPrediction(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const impact = useMemo(() => getNowcastImpact(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const impacts = useMemo(() => getForecastImpact(selectedRegion), [selectedRegion])

  const activeWard = regionWards.some((w) => w.id === selectedWard) ? selectedWard : ''
  const toggleMapLayer = (layer) => setActiveMapLayers((cur) => ({ ...cur, [layer]: !cur[layer] }))

  // Peak impact across all horizons
  const peakPoint = useMemo(() => forecast.reduce((best, pt) => pt.highestWaterDepth > best.highestWaterDepth ? pt : best, forecast[0]), [forecast])
  const peakStreet = useMemo(() => {
    const p = getFloodPrediction(peakPoint.time, selectedRegion)
    return p.streets.reduce((best, s) => s.waterDepth > best.waterDepth ? s : best, p.streets[0])
  }, [peakPoint, selectedRegion])

  // Current prediction metrics
  const sortedStreets = useMemo(() => [...prediction.streets].sort((a, b) => b.waterDepth - a.waterDepth), [prediction.streets])
  const topStreet = sortedStreets[0]
  const drainageUtil = Math.round(prediction.drainage.utilization * 100)
  const criticalZones = prediction.streets.filter((s) => s.risk === 'CRITICAL').length
  const affectedRoads = prediction.streets.filter((s) => s.waterDepth >= 15).length
  const overallRisk = prediction.highestWaterDepth >= 30 ? 'CRITICAL' : prediction.highestWaterDepth >= 15 ? 'HIGH' : prediction.highestWaterDepth >= 5 ? 'MODERATE' : 'LOW'
  const riskDisplay = overallRisk.charAt(0) + overallRisk.slice(1).toLowerCase()

  // Operational interpretation
  const interpretation = useMemo(() => getOperationalInterpretation(impact, drainageUtil), [impact, drainageUtil])

  // Autoplay
  const advanceForecast = useCallback(() => {
    setSelectedTime((curr) => {
      const idx = forecast.findIndex((p) => p.time === curr)
      if (idx < 0 || idx >= forecast.length - 1) {
        setIsPlaying(false)
        return forecast[0].time
      }
      const nextTime = forecast[idx + 1].time
      setSelectedHorizon(nextTime)
      return nextTime
    })
  }, [forecast, setSelectedHorizon])

  useEffect(() => {
    if (isPlaying) {
      playRef.current = window.setInterval(advanceForecast, 2000)
    }
    return () => { if (playRef.current) window.clearInterval(playRef.current) }
  }, [isPlaying, advanceForecast])

  const togglePlay = () => setIsPlaying((p) => !p)
  const selectTime = (time) => {
    setIsPlaying(false)
    setSelectedTime(time)
    setSelectedHorizon(time)
  }

  const peakRisk = peakPoint.highestWaterDepth >= 30 ? 'Critical' : peakPoint.highestWaterDepth >= 15 ? 'High' : peakPoint.highestWaterDepth >= 5 ? 'Moderate' : 'Low'

  return (
    <>
      {/* ── 1. Page header ── */}
      <div className="nc-page-top">
        <div>
          <span className="eyebrow">FLOOD NOWCAST</span>
          <h1 className="nc-title">Flood Nowcast</h1>
          <p className="nc-subtitle">0–3 hour street-level flood impact outlook</p>
        </div>
        <div className="nc-header-meta">
          <div className="nc-meta-block">
            <span className="nc-meta-label">FORECAST HORIZON</span>
            <span className="nc-meta-value">0–180 MIN</span>
          </div>
          <div className="nc-meta-block">
            <span className="nc-meta-label">REGION</span>
            <span className="nc-meta-value">{currentRegion?.name || selectedRegion}</span>
          </div>
          <div className="nc-meta-block nc-meta-demo">
            <span className="nc-meta-label">DATA MODE</span>
            <span className="nc-meta-value">{source.isLive ? 'IMD CONNECTED' : 'DEMONSTRATION DATA'}</span>
          </div>
        </div>
      </div>

      {/* ── Operational Workflow Indicator (Section 8) ── */}
      <WorkflowIndicator currentStage="PREDICT" style={{ marginBottom: '14px' }} />

      {/* ── 2. Forecast Timeline ── */}
      <Panel className="nc-timeline-panel">
        <div className="nc-timeline-header">
          <div>
            <h2>Forecast Timeline</h2>
            <p className="muted">Select a forecast horizon to view predicted flood impact</p>
          </div>
          <button type="button" className="nc-play-btn" onClick={togglePlay} title={isPlaying ? 'Pause forecast' : 'Play forecast'}>
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY FORECAST'}
          </button>
        </div>
        <div className="nc-timeline-grid">
          {forecast.map((point, index) => {
            const isSelected = selectedTime === point.time
            const pointRisk = point.highestWaterDepth >= 30 ? 'CRITICAL' : point.highestWaterDepth >= 15 ? 'HIGH' : point.highestWaterDepth >= 5 ? 'MODERATE' : 'LOW'
            const roadsCount = point.streets.filter((s) => s.waterDepth >= 15).length

            return (
              <button
                type="button"
                key={point.time}
                className={`nc-timeline-step${isSelected ? ' selected' : ''}`}
                onClick={() => selectTime(point.time)}
              >
                <span className="nc-step-time">{index === 0 ? 'NOW' : point.time}</span>
                <RiskBadge level={pointRisk.charAt(0) + pointRisk.slice(1).toLowerCase()} />
                <div className="nc-step-metrics">
                  <div className="nc-step-metric">
                    <span className="nc-step-metric-label">Max depth</span>
                    <span className="nc-step-metric-val">{fmtDepth(point.highestWaterDepth)} cm</span>
                  </div>
                  <div className="nc-step-metric">
                    <span className="nc-step-metric-label">Rainfall</span>
                    <span className="nc-step-metric-val">{point.intensity} mm/hr</span>
                  </div>
                  <div className="nc-step-metric">
                    <span className="nc-step-metric-label">Drainage</span>
                    <span className="nc-step-metric-val">{Math.round(point.drainage.utilization * 100)}%</span>
                  </div>
                  <div className="nc-step-metric">
                    <span className="nc-step-metric-label">Roads at risk</span>
                    <span className="nc-step-metric-val">{roadsCount}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* ── 3. Map ── */}
      <Panel className="nc-map-panel">
        <div className="nc-map-header">
          <div>
            <h2>Flood Situation Map</h2>
            <p className="muted">{currentRegion?.name} · {selectedTime === 'NOW' ? 'Current' : selectedTime} · {prediction.intensity} mm/hr</p>
          </div>
          <span className="nc-demo-chip">Demonstration Mode</span>
        </div>
        <div className="nc-map-container">
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
          {/* Legend */}
          <div className="nc-map-legend">
            <span className="nc-map-legend-title">PREDICTED FLOOD DEPTH</span>
            <div className="nc-legend-items">
              <span><i style={{ background: '#22c55e' }} /> 0–10 cm — Low</span>
              <span><i style={{ background: '#f59e0b' }} /> 10–25 cm — Moderate</span>
              <span><i style={{ background: '#ef4444' }} /> 25–50 cm — High</span>
              <span><i style={{ background: '#991b1b' }} /> &gt;50 cm — Critical</span>
            </div>
            <div className="nc-legend-extra">
              <span><i style={{ background: '#0284c7' }} /> Drainage network</span>
              <span><i style={{ background: '#dc2626', borderRadius: '50%' }} /> Overloaded node</span>
              <span><i style={{ background: '#ea580c' }} /> Affected road</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── 4. Peak Predicted Impact (compact 4-col strip) ── */}
      <div className="nc-peak-strip">
        <div className="nc-peak-strip-item nc-peak-strip-primary">
          <span className="nc-peak-strip-label">MAX PREDICTED STREET DEPTH</span>
          <span className="nc-peak-strip-value nc-peak-strip-depth" style={{ color: peakPoint.highestWaterDepth >= 30 ? '#dc2626' : peakPoint.highestWaterDepth >= 15 ? '#ea580c' : '#16a34a' }}>
            {fmtDepth(peakPoint.highestWaterDepth)} <small>cm</small>
          </span>
        </div>
        <div className="nc-peak-strip-item">
          <span className="nc-peak-strip-label">PEAK LOCATION</span>
          <span className="nc-peak-strip-value">{peakStreet?.name || '—'}</span>
          {peakStreet?.id && (
            <Link
              to={`/explainable-ai?street=${peakStreet.id}&horizon=${peakPoint.time}`}
              className="nc-inline-action-btn"
              onClick={() => {
                setSelectedStreetId(peakStreet.id)
                setSelectedHorizon(peakPoint.time)
              }}
            >
              VIEW RISK ANALYSIS →
            </Link>
          )}
        </div>
        <div className="nc-peak-strip-item">
          <span className="nc-peak-strip-label">TIME TO PEAK IMPACT</span>
          <span className="nc-peak-strip-value">{peakPoint.time === 'NOW' ? 'At peak now' : peakPoint.time}</span>
        </div>
        <div className="nc-peak-strip-item">
          <span className="nc-peak-strip-label">RISK LEVEL</span>
          <span className="nc-peak-strip-value"><RiskBadge level={peakRisk} /></span>
        </div>
      </div>

      {/* ── 5. Forecast Assessment (grid) ── */}
      <Panel className="nc-assessment-panel">
        <div className="nc-section-head">
          <h2>Forecast Assessment</h2>
          <span className="nc-horizon-tag">{selectedTime === 'NOW' ? 'CURRENT' : selectedTime}</span>
        </div>
        <div className="nc-assessment-grid">
          <div className="nc-assess-item">
            <span className="nc-assess-label">RISK</span>
            <span className="nc-assess-value"><RiskBadge level={riskDisplay} /></span>
          </div>
          <div className="nc-assess-item">
            <span className="nc-assess-label">MAX PREDICTED STREET DEPTH</span>
            <span className="nc-assess-value nc-assess-big">{fmtDepth(prediction.highestWaterDepth)} <small>cm</small></span>
          </div>
          <div className="nc-assess-item">
            <span className="nc-assess-label">PEAK LOCATION</span>
            <span className="nc-assess-value">{topStreet?.name || '—'}</span>
            {topStreet?.id && (
              <Link
                to={`/explainable-ai?street=${topStreet.id}&horizon=${selectedTime}`}
                className="nc-inline-action-btn"
                onClick={() => {
                  setSelectedStreetId(topStreet.id)
                  setSelectedHorizon(selectedTime)
                }}
              >
                VIEW RISK ANALYSIS →
              </Link>
            )}
          </div>
          <div className="nc-assess-item">
            <span className="nc-assess-label">RAINFALL</span>
            <span className="nc-assess-value nc-assess-big">{prediction.intensity} <small>mm/hr</small></span>
          </div>
          <div className="nc-assess-item">
            <span className="nc-assess-label">DRAINAGE UTILIZATION</span>
            <span className="nc-assess-value nc-assess-big" style={{ color: drainageUtil >= 100 ? '#dc2626' : '#1e293b' }}>{drainageUtil}<small>%</small></span>
          </div>
          <div className="nc-assess-item">
            <span className="nc-assess-label">ROADS AT RISK</span>
            <span className="nc-assess-value nc-assess-big">{affectedRoads}</span>
          </div>
          <div className="nc-assess-item">
            <span className="nc-assess-label">CRITICAL ZONES</span>
            <span className="nc-assess-value nc-assess-big" style={{ color: criticalZones > 0 ? '#dc2626' : '#1e293b' }}>{criticalZones}</span>
          </div>
        </div>
      </Panel>

      {/* ── 6. Flood Impact Progression ── */}
      <Panel className="nc-progression-panel">
        <div className="nc-section-head">
          <h2>Flood Impact Progression</h2>
          <span className="muted" style={{ fontSize: '12px' }}>Predicted situation across forecast horizon</span>
        </div>
        <div className="nc-progression-grid">
          {forecast.map((point, index) => {
            const isPeak = peakPoint.time === point.time
            const isCurrent = selectedTime === point.time
            const risk = point.highestWaterDepth >= 30 ? 'CRITICAL' : point.highestWaterDepth >= 15 ? 'HIGH' : point.highestWaterDepth >= 5 ? 'MODERATE' : 'LOW'
            const riskColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MODERATE: '#d97706', LOW: '#16a34a' }
            const label = getProgressionLabel(impacts, index)

            return (
              <button
                key={point.time}
                type="button"
                className={`nc-prog-step${isCurrent ? ' selected' : ''}${isPeak ? ' peak' : ''}`}
                onClick={() => selectTime(point.time)}
              >
                <div className="nc-prog-header">
                  <span className="nc-prog-time">{index === 0 ? 'NOW' : point.time}</span>
                  {isPeak && <span className="nc-prog-peak-tag">PEAK</span>}
                </div>
                <div className="nc-prog-depth-bar">
                  <div style={{ width: `${Math.min(100, (point.highestWaterDepth / Math.max(peakPoint.highestWaterDepth, 1)) * 100)}%`, background: riskColors[risk] }} />
                </div>
                <div className="nc-prog-stats">
                  <span style={{ color: riskColors[risk], fontWeight: 700 }}>{fmtDepth(point.highestWaterDepth)} cm</span>
                  <span>{point.streets.filter((s) => s.waterDepth >= 15).length} roads</span>
                </div>
                <p className="nc-prog-desc">{label}</p>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* ── 7. Operational Interpretation ── */}
      <Panel className="nc-interpretation-panel">
        <div className="nc-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2>Operational Interpretation</h2>
            <RiskBadge level={riskDisplay} />
          </div>
          <span className="muted" style={{ fontSize: '12px' }}>{selectedTime === 'NOW' ? 'Current conditions' : selectedTime}</span>
        </div>
        <div className="nc-interpretation-lines">
          {interpretation.map((line, i) => (
            <p key={i} className="nc-interpretation-line">{line}</p>
          ))}
        </div>
      </Panel>

      {/* ── 8. Forecast Source ── */}
      <Panel className="nc-source-panel">
        <div className="nc-section-head" style={{ marginBottom: '8px' }}>
          <h2>Forecast Source</h2>
          <span className="muted" style={{ fontSize: '12px' }}>Data inputs and model status</span>
        </div>
        <table className="nc-source-table">
          <thead>
            <tr>
              <th>DATA / MODEL</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Rainfall Input</td><td>{source.isLive ? 'IMD Connected' : 'Demonstration / simulated'}</td></tr>
            <tr><td>Flood Impact</td><td>{MODEL_METADATA.name}</td></tr>
            <tr><td>Terrain</td><td>Terrain-derived spatial characteristics</td></tr>
            <tr><td>Drainage</td><td>Directed drainage network graph</td></tr>
            <tr><td>Forecast Horizon</td><td>0–180 minutes</td></tr>
            <tr><td>Region</td><td>{currentRegion?.name || selectedRegion}</td></tr>
          </tbody>
        </table>
        <p className="nc-source-notice">{source.notice}</p>
      </Panel>

      {/* Disclaimer */}
      <div className="jd-disclaimer">
        <strong>JalDrishti</strong> — Urban Flood Intelligence & Decision Support System · Prototype / Demonstration System · Model outputs are intended for decision support and require operational verification before field deployment.
      </div>
    </>
  )
}

export default AINowcastPage
