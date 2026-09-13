import { useMemo, useState } from 'react'
import { useRegion } from '../context/useRegion'
import { NEUTRAL_MAP_CENTER } from '../data/regions'

import wardsData from '../data/wards.json'
import terrainData from '../data/terrain.json'
import drainageNetworkData from '../data/drainageNetwork.json'
import InteractiveRiskMap from '../components/InteractiveRiskMap'
import CoupledFloodEngine from '../components/CoupledFloodEngine'
import { getFloodForecast, getFloodPrediction } from '../services/floodEngine'
import { PageHeader, Panel, RiskBadge } from '../components/ui'

function getStreetStatus(depth) {
  if (depth >= 30) return 'Closed'
  if (depth >= 15) return 'Restricted'
  if (depth >= 5) return 'Caution'
  return 'Open'
}

function getOnsetTime(streetId, forecast) {
  const onset = forecast.find((point) => point.streets.find((street) => street.id === streetId)?.waterDepth >= 5)
  return onset?.time || 'Beyond +180 MIN'
}

function getSeverity(prediction) {
  const peak = prediction.streets.reduce((highest, street) => street.waterDepth > highest.waterDepth ? street : highest, prediction.streets[0])
  return peak.waterDepth >= 30 ? 'CRITICAL' : peak.waterDepth >= 15 ? 'HIGH' : peak.waterDepth >= 5 ? 'MODERATE' : 'LOW'
}

function FloodRiskMapPage() {
  const { selectedRegion, currentRegion } = useRegion()
  const [selectedWard, setSelectedWard] = useState('')
  const [selectedTime, setSelectedTime] = useState('NOW')
  const [focusedStreet, setFocusedStreet] = useState('')
  const [activeLayers, setActiveLayers] = useState({ risk: true, depth: true, network: true, capacity: true, terrain: true, runoff: true })

  const regionWards = currentRegion?.wards || wardsData
  const regionTerrain = currentRegion?.terrain || terrainData.zones
  const regionDrainage = currentRegion?.drainageNetwork || drainageNetworkData
  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const prediction = useMemo(() => getFloodPrediction(selectedTime, selectedRegion), [selectedTime, selectedRegion])
  
  const toggleLayer = (layer) => setActiveLayers((current) => ({ ...current, [layer]: !current[layer] }))
  const severity = getSeverity(prediction)
  const peakStreet = prediction.streets.reduce((highest, street) => street.waterDepth > highest.waterDepth ? street : highest, prediction.streets[0])

  return (
    <>
      <PageHeader
        eyebrow="Spatial intelligence"
        title="Flood risk map"
        description={`Street-level flood accumulation coupled to a prototype rainfall, terrain and drainage model for ${currentRegion?.name || 'the selected region'}.`}
        action={<span className="prototype-label">DEMO MODE · SIMULATED DATA</span>}
      />
      <CoupledFloodEngine
        prediction={prediction}
        forecast={forecast}
        selectedTime={selectedTime}
        onSelectTime={setSelectedTime}
        activeLayers={activeLayers}
        onToggleLayer={toggleLayer}
        showLayers
      />
      <div className="map-layout">
        <Panel className="map-panel large-map-panel">
          <div className="panel-heading">
            <div>
              <h2>Coupled risk surface</h2>
              <p className="muted">{prediction.time} · {prediction.intensity} mm/hr · {prediction.highestWaterDepth} cm highest predicted depth</p>
            </div>
            <label className="ward-filter">
              <span>Focus ward</span>
              <select value={selectedWard} onChange={(event) => setSelectedWard(event.target.value)}>
                <option value="">All wards</option>
                {regionWards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name} · {ward.area}</option>)}
              </select>
            </label>
          </div>
          <InteractiveRiskMap
            wards={regionWards}
            selectedWard={selectedWard}
            onSelectWard={setSelectedWard}
            prediction={prediction}
            activeLayers={activeLayers}
            terrainZones={regionTerrain}
            drainageNetwork={regionDrainage}
            focusedStreet={focusedStreet}
            onSelectStreet={setFocusedStreet}
            center={currentRegion?.center || NEUTRAL_MAP_CENTER}
            zoom={currentRegion?.zoom || 11}
            wardCoordinates={currentRegion?.wardCoordinates}
          />
        </Panel>
        <Panel className="map-side-panel">
          <div className="response-panel-heading">
            <div>
              <span className="eyebrow">Drainage response · {prediction.time}</span>
              <h2>{prediction.drainage.overloadedNodes.length} overloaded nodes</h2>
            </div>
            <RiskBadge level={severity} />
          </div>
          <p className="muted">Capacity analysis updates with the selected forecast horizon. Red connectors identify overloaded nodes and nearby flood zones.</p>
          <div className="selected-ward-detail">
            <strong>{Math.round(prediction.drainage.utilization * 100)}%</strong>
            <span>Average network utilization</span>
            <div className="utilization-meter"><span style={{ width: `${Math.min(100, prediction.drainage.utilization * 100)}%` }} /></div>
            <span>{prediction.drainage.overloadedEdges.length} overloaded edges</span>
            <span>{Math.round(prediction.drainage.backflowProbability * 100)}% backflow probability</span>
            <span>Peak zone: {peakStreet.name}</span>
          </div>
        </Panel>
      </div>
      <Panel className="table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Street-level predictions</span>
            <h2>Predicted water depth</h2>
          </div>
          <span className="muted">CENTIMETERS · {prediction.time}</span>
        </div>
        <div className="data-table street-table">
          {prediction.streets.map((street) => (
            <button type="button" className={`table-row street-row ${focusedStreet === street.id ? 'selected' : ''}`} key={street.id} onClick={() => setFocusedStreet(street.id)}>
              <strong>{street.name}</strong>
              <span>{street.terrain.terrainType} · {street.terrain.elevation} m</span>
              <div className="depth-cell">
                <strong>{street.waterDepth} cm</strong>
                <span className="depth-bar"><i style={{ width: `${Math.min(100, street.waterDepth)}%` }} /></span>
              </div>
              <RiskBadge level={street.risk} />
              <span>{getOnsetTime(street.id, forecast)}</span>
              <span className={`road-status ${getStreetStatus(street.waterDepth).toLowerCase()}`}>{getStreetStatus(street.waterDepth)}</span>
            </button>
          ))}
        </div>
      </Panel>
    </>
  )
}
export default FloodRiskMapPage
