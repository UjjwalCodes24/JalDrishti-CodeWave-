import { Panel, RiskBadge } from './ui'

const layerOptions = [
  ['risk', 'Flood Risk'],
  ['depth', 'Predicted Water Depth'],
  ['network', 'Drainage Network'],
  ['capacity', 'Drainage Capacity'],
  ['terrain', 'Terrain / DEM'],
  ['runoff', 'Surface Runoff'],
]

export function ForecastTimeline({ forecast, selectedTime, onSelectTime }) {
  return <div className="engine-timeline" role="group" aria-label="Flood forecast timeline">{forecast.map((point) => <button type="button" key={point.time} className={selectedTime === point.time ? 'active' : ''} onClick={() => onSelectTime(point.time)}>{point.time}</button>)}</div>
}

export function LayerControls({ activeLayers, onToggleLayer }) {
  return <div className="layer-controls" aria-label="Flood map layers">{layerOptions.map(([id, label]) => <label key={id}><input type="checkbox" checked={activeLayers[id] !== false} onChange={() => onToggleLayer(id)} />{label}</label>)}</div>
}

function CoupledFloodEngine({ prediction, forecast, selectedTime, onSelectTime, activeLayers, onToggleLayer, showLayers = false }) {
  const values = [
    ['🌧', 'Rainfall Nowcast', `${prediction.intensity} mm/hr`],
    ['🏙', 'Surface Runoff', `${Math.min(99, Math.round(prediction.streets.reduce((sum, street) => sum + street.runoffVolume, 0) / Math.max(prediction.intensity * prediction.streets.length, 1) * 100))}%`],
    ['🗺', 'Terrain / DEM', `${Math.round(prediction.streets.reduce((sum, street) => sum + street.terrain.accumulationPotential, 0) / prediction.streets.length * 100)}% avg potential`],
    ['🔵', 'Drainage Network / Capacity', `${Math.round(prediction.drainage.utilization * 100)}% · ${prediction.drainage.overloadedNodes.length} overloaded`],
    ['🌊', 'Predicted Flood Depth', `${prediction.highestWaterDepth} cm peak`],
  ]
  return <Panel className="engine-panel"><div className="panel-heading"><div><span className="eyebrow">DEMO MODE · SIMULATED DATA</span><h2>COUPLED FLOOD ENGINE</h2><p className="muted">Live prototype chain for the selected forecast horizon.</p></div><RiskBadge level={prediction.streets.reduce((highest, street) => street.waterDepth > highest.waterDepth ? street : highest, prediction.streets[0]).risk} /></div><ForecastTimeline forecast={forecast} selectedTime={selectedTime} onSelectTime={onSelectTime} /><div className="engine-pipeline">{values.map(([icon, label, value], index) => <div className="engine-step" key={label}><span className="engine-step-icon" aria-hidden="true">{icon}</span><span className="engine-step-label">{label}</span><strong>{value}</strong>{index < values.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div>{showLayers && <LayerControls activeLayers={activeLayers} onToggleLayer={onToggleLayer} />}</Panel>
}

export default CoupledFloodEngine
