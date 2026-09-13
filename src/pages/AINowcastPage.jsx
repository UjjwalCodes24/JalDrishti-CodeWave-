import { useMemo, useState } from 'react'
import { Panel, PageHeader, RiskBadge } from '../components/ui'
import { useRegion } from '../context/useRegion'

import { getRainfallInput, formatObservationTime } from '../services/dataSourceService'
import { getForecastConfidence, getForecastDirection } from '../services/nowcastService'
import { getNowcastImpact, getForecastImpact } from '../services/floodPredictionService'

function getEventSet(impacts) {
  const watch = impacts.find((impact) => impact.drainage.utilization >= 0.8)
  const warning = impacts.find((impact) => impact.highestWaterDepth >= 15)
  const critical = impacts.find((impact) => impact.highestWaterDepth >= 30)
  const peakIndex = impacts.reduce((peak, impact, index) => impact.intensity > impacts[peak].intensity ? index : peak, 0)
  const recovery = impacts.find((impact, index) => index > peakIndex && impact.intensity < impacts[index - 1].intensity)
  return [
    watch && { type: 'WATCH', label: 'Drainage utilization exceeds warning threshold', time: watch.time, tone: 'watch' },
    warning && { type: 'WARNING', label: 'Water accumulation increasing across low-lying zones', time: warning.time, tone: 'warning' },
    critical && { type: 'CRITICAL', label: 'Street predicted to exceed critical water depth', time: critical.time, tone: 'critical' },
    recovery && { type: 'RECOVERY', label: 'Rainfall intensity decreasing after the peak', time: recovery.time, tone: 'recovery' },
  ].filter(Boolean)
}

function SourceStatus({ source }) {
  return (
    <Panel className="source-status-panel">
      <div className="source-status-heading">
        <div>
          <span className="eyebrow">Input integrity</span>
          <h2>IMD RAINFALL INPUT</h2>
        </div>
        <span className={`source-badge ${source.isLive ? 'connected' : 'fallback'}`}>{source.mode}</span>
      </div>
      <div className="source-status-grid">
        <div><span>RAIN DATA SOURCE</span><strong>{source.provider}</strong></div>
        <div><span>DATA STATUS</span><strong>{source.connection === 'connected' ? 'Connected' : 'Demo Fallback'}</strong></div>
        <div><span>LAST OBSERVATION</span><strong>{formatObservationTime(source.lastObservation)}</strong></div>
        <div><span>INPUT COVERAGE</span><strong>Radar {source.radarCoverage}% · Stations {source.stationCoverage}%</strong></div>
      </div>
      <p className="source-notice">{source.notice}</p>
    </Panel>
  )
}

function ForecastChart({ observations, forecast, selectedTime, onSelectTime, confidenceFor }) {
  const allPoints = [...observations.map((point) => ({ ...point, kind: 'observed' })), ...forecast.filter((point) => point.time !== 'NOW').map((point) => ({ ...point, kind: 'forecast' }))]
  const maxIntensity = Math.max(...allPoints.map((point) => point.intensity), 1)
  return (
    <Panel className="nowcast-chart-panel">
      <div className="chart-panel-heading">
        <div>
          <span className="eyebrow">0–3 HOUR PREDICTION</span>
          <h2>Rainfall nowcast trajectory</h2>
          <p className="muted">Observed radar history, current input, and AI-generated future rainfall.</p>
        </div>
        <span className="chart-direction">{getForecastDirection(forecast)}</span>
      </div>
      <div className="nowcast-chart">
        <div className="chart-now-marker" aria-hidden="true"><span>N O W</span></div>
        <div className="confidence-band" aria-hidden="true" />
        {allPoints.map((point) => {
          const selected = point.time === selectedTime
          const confidence = point.kind === 'forecast' ? confidenceFor(point) : point.quality
          return (
            <button
              type="button"
              key={`${point.kind}-${point.time}`}
              className={`nowcast-point ${point.kind} ${selected ? 'selected' : ''}`}
              style={{ '--bar-height': `${Math.max(8, point.intensity / maxIntensity * 76)}%`, '--confidence': `${Math.max(8, 100 - confidence)}%` }}
              onClick={() => point.kind === 'forecast' && onSelectTime(point.time)}
              title={`${point.time}: ${point.intensity} mm/hr`}
            >
              <span className="point-bar" />
              <strong>{point.intensity}</strong>
              <small>{point.time}</small>
            </button>
          )
        })}
      </div>
      <div className="chart-legend">
        <span><i className="observed-swatch" />Observed rainfall</span>
        <span><i className="forecast-swatch" />AI nowcast</span>
        <span><i className="confidence-swatch" />Confidence band</span>
      </div>
    </Panel>
  )
}

function Pipeline({ impact, source }) {
  const runoff = Math.min(99, Math.round(impact.streets.reduce((sum, street) => sum + street.runoffVolume, 0) / Math.max(impact.intensity * impact.streets.length, 1) * 100))
  const terrainPotential = Math.round(impact.streets.reduce((sum, street) => sum + street.terrain.accumulationPotential, 0) / impact.streets.length * 100)
  const stages = [
    ['🌧', 'RAIN INPUT', source.provider, `${impact.intensity} mm/hr`],
    ['🏙', 'SURFACE RUNOFF MODEL', 'Impervious urban surface', `${runoff}% runoff response`],
    ['🗺', 'TERRAIN / DEM ROUTING', 'Low-elevation flow paths', `${terrainPotential}% accumulation potential`],
    ['🔵', 'DRAINAGE NETWORK GRAPH', `${impact.drainage.overloadedNodes.length} overloaded nodes`, `${Math.round(impact.drainage.utilization * 100)}% utilization`],
    ['🌊', 'STREET-LEVEL PREDICTION', `${impact.criticalRoads} critical roads`, `${impact.highestWaterDepth} cm peak depth`],
  ]
  return (
    <Panel className="nowcast-pipeline-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">COUPLED FLOOD PREDICTION ENGINE</span>
          <h2>Rainfall enters. Streets emerge.</h2>
        </div>
        <span className="prototype-label">MODEL OUTPUT · {impact.time}</span>
      </div>
      <div className="nowcast-pipeline">
        {stages.map(([icon, label, detail, value], index) => (
          <div className="nowcast-stage" key={label}>
            <span className="stage-icon">{icon}</span>
            <span className="stage-label">{label}</span>
            <small>{detail}</small>
            <strong>{value}</strong>
            {index < stages.length - 1 && <i>→</i>}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function AINowcastPage() {
  const { selectedRegion, currentRegion } = useRegion()
  const input = useMemo(() => getRainfallInput(selectedRegion), [selectedRegion])
  const source = input.dataSource
  const [selectedTime, setSelectedTime] = useState('NOW')
  const forecast = input.forecast
  const impact = useMemo(() => getNowcastImpact(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  const impacts = useMemo(() => getForecastImpact(selectedRegion), [selectedRegion])
  const selectedPoint = forecast.find((point) => point.time === selectedTime) || forecast[0]
  const confidenceFor = (point) => getForecastConfidence(point, source)
  const confidence = confidenceFor(selectedPoint)
  const events = useMemo(() => getEventSet(impacts), [impacts])
  const factors = [
    ['Rainfall data quality', source.dataQuality],
    ['Radar coverage', source.radarCoverage],
    ['Sensor availability', source.stationCoverage],
    ['Terrain data quality', 91],
    ['Drainage network coverage', 84],
  ]
  return (
    <>
      <PageHeader
        eyebrow="PREDICTIVE INTELLIGENCE"
        title="AI Flood Nowcast"
        description={`Coupling rainfall nowcasts with terrain and drainage intelligence for ${currentRegion?.name || 'the selected region'}.`}
        action={
          <div className="nowcast-header-status">
            <span className={`source-badge ${source.isLive ? 'connected' : 'fallback'}`}>{source.mode}</span>
            <span className="model-status">NOWCAST ENGINE ACTIVE</span>
            <small>Last update · {formatObservationTime(source.lastObservation)}</small>
          </div>
        }
      />
      <SourceStatus source={source} />
      <ForecastChart observations={input.observations} forecast={forecast} selectedTime={selectedTime} onSelectTime={setSelectedTime} confidenceFor={confidenceFor} />
      <div className="nowcast-impact-strip">
        <div><span>SELECTED HORIZON</span><strong>{selectedTime}</strong></div>
        <div><span>RAINFALL INTENSITY</span><strong>{selectedPoint.intensity} mm/hr</strong></div>
        <div><span>FLOOD RISK</span><RiskBadge level={impact.criticalStatus === 'STABLE' ? 'Low' : impact.criticalStatus === 'WATCH' ? 'Moderate' : impact.criticalStatus === 'CRITICAL' ? 'Critical' : 'High'} /></div>
        <div><span>WATER DEPTH</span><strong>{impact.highestWaterDepth} cm</strong></div>
        <div><span>HIGH-RISK ROADS</span><strong>{impact.highRiskRoads}</strong></div>
      </div>
      <div className="nowcast-grid">
        <Panel className="forecast-events-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">FORECAST EVENTS</span>
              <h2>What the model detects</h2>
            </div>
            <span className="muted">Derived from engine outputs</span>
          </div>
          <div className="forecast-events">
            {events.map((event) => (
              <button type="button" key={event.type} className={`forecast-event ${event.tone}`} onClick={() => setSelectedTime(event.time)}>
                <strong>{event.type}</strong>
                <span>{event.label}</span>
                <b>{event.time}</b>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="confidence-panel nowcast-confidence">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MODEL CONFIDENCE</span>
              <h2>Forecast reliability</h2>
            </div>
            <strong className="confidence-score">{confidence}%</strong>
          </div>
          <div className="confidence-progress"><span style={{ width: `${confidence}%` }} /></div>
          <div className="confidence-factors">
            {factors.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}%</strong>
                <div><i style={{ width: `${value}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Pipeline impact={impact} source={source} />
      <Panel className="forecast-impact-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">FORECAST IMPACT · {selectedTime}</span>
            <h2>Operational outputs</h2>
          </div>
          <span className="muted">All values from the coupled flood engine</span>
        </div>
        <div className="impact-grid">
          <div><span>HIGH-RISK WARDS</span><strong>{impact.highRiskRoads > 2 ? 1 : 0}</strong></div>
          <div><span>CRITICAL ROADS</span><strong>{impact.criticalRoads}</strong></div>
          <div><span>OVERLOADED DRAINAGE NODES</span><strong>{impact.drainage.overloadedNodes.length}</strong></div>
          <div><span>MAXIMUM PREDICTED DEPTH</span><strong>{impact.highestWaterDepth} cm</strong></div>
          <div><span>EXPECTED PEAK TIME</span><strong>{impact.expectedPeakTime}</strong></div>
        </div>
      </Panel>
    </>
  )
}

export default AINowcastPage

