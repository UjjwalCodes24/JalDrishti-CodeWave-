import { Fragment, useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polygon, Popup, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { NEUTRAL_MAP_CENTER } from '../data/regions'

const defaultWardCoordinates = {}
const riskColors = { CRITICAL: '#dc2626', Critical: '#dc2626', HIGH: '#ea580c', High: '#ea580c', MODERATE: '#d97706', Moderate: '#d97706', LOW: '#16a34a', Low: '#16a34a', SAFE: '#16a34a', Safe: '#16a34a' }
const terrainColors = { 'low-lying': '#0284c7', moderate: '#d97706', higher: '#16a34a' }
const depthColors = { low: '#0284c7', moderate: '#d97706', critical: '#dc2626' }
const twinFootprints = [
  [[19.0737, 72.8814], [19.0745, 72.8818], [19.0741, 72.8830], [19.0733, 72.8826]],
  [[19.0778, 72.8780], [19.0788, 72.8784], [19.0783, 72.8796], [19.0774, 72.8792]],
  [[19.0662, 72.8732], [19.0670, 72.8737], [19.0666, 72.8750], [19.0658, 72.8745]],
  [[19.1027, 72.8888], [19.1040, 72.8891], [19.1035, 72.8905], [19.1023, 72.8901]],
  [[19.0623, 72.8675], [19.0635, 72.8678], [19.0631, 72.8690], [19.0619, 72.8686]],
  [[19.0560, 72.8700], [19.0569, 72.8703], [19.0566, 72.8713], [19.0557, 72.8710]],
]

function getOperationalAction(risk) {
  if (risk === 'CRITICAL') return 'Emergency response required'
  if (risk === 'HIGH') return 'Restrict traffic'
  if (risk === 'MODERATE') return 'Monitor closely'
  return 'Normal monitoring'
}

function MapFocus({ wardId, focusedStreet, streets, center = NEUTRAL_MAP_CENTER, zoom = 11, wardCoords = defaultWardCoordinates }) {
  const map = useMap()
  useEffect(() => {
    const street = streets.find((item) => item.id === focusedStreet)
    const target = street
      ? [street.latitude, street.longitude]
      : wardId && wardCoords[wardId]
      ? wardCoords[wardId]
      : center
    const targetZoom = street || wardId ? 13 : zoom
    map.flyTo(target, targetZoom, { duration: 0.8 })
  }, [focusedStreet, map, streets, wardId, center, zoom, wardCoords])
  return null
}

function markerIcon(label, color, className = 'ward-marker', riskLevel = '') {
  const levelClass = riskLevel ? `risk-${riskLevel.toLowerCase()}` : ''
  return L.divIcon({
    className: 'ward-marker-wrapper',
    html: `<span class="${className} ${levelClass}" style="--marker-color:${color}">${label}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  })
}

function FloodPopup({ street, prediction, utilization }) {
  const runoffPercent = Math.min(99, Math.round(street.runoffVolume / Math.max(prediction.intensity, 1) * 100))
  return (
    <div className="map-popup flood-popup">
      <span className="eyebrow">Street status · {prediction.time}</span>
      <strong>{street.name}</strong>
      <div className="popup-depth-pair">
        <span>Current <b>{street.currentWaterDepth} cm</b></span>
        <span>Predicted <b>{street.waterDepth} cm</b></span>
      </div>
      <div className="popup-detail-grid">
        <span>Rainfall<strong>{prediction.intensity} mm/hr</strong></span>
        <span>Drainage<strong>{Math.round(utilization * 100)}%</strong></span>
        <span>Runoff<strong>{runoffPercent}%</strong></span>
        <span>Terrain<strong>{street.terrain.elevation} m · {street.terrain.terrainType}</strong></span>
      </div>
      <div className="popup-action">
        <b>{street.risk}</b>
        <span>{getOperationalAction(street.risk)}</span>
      </div>
    </div>
  )
}

function InteractiveRiskMap({
  wards = [],
  selectedWard,
  onSelectWard,
  prediction,
  activeLayers = {},
  terrainZones = [],
  drainageNetwork,
  focusedStreet,
  onSelectStreet,
  digitalTwin = false,
  center = NEUTRAL_MAP_CENTER,
  zoom = 11,
  wardCoordinates: propWardCoordinates
}) {
  const wardCoords = propWardCoordinates || defaultWardCoordinates
  const visibleWards = selectedWard ? wards.filter((ward) => ward.id === selectedWard) : wards
  const show = (layer) => activeLayers[layer] !== false
  const streets = prediction?.streets || []
  const nodes = drainageNetwork?.nodes || []
  const nodeLookup = Object.fromEntries(nodes.map((node) => [node.id, [node.lat, node.lng]]))
  const predictedNodes = prediction?.drainage?.nodes || []
  const predictedEdges = prediction?.drainage?.edges || []
  const utilizationFor = (nodeId) => predictedNodes.find((node) => node.id === nodeId)?.utilization || 0
  const streetForNode = (nodeId) => streets.find((street) => street.drainageNode === nodeId)

  return (
    <div className="leaflet-map-wrap">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFocus wardId={selectedWard} focusedStreet={focusedStreet} streets={streets} center={center} zoom={zoom} wardCoords={wardCoords} />
        {digitalTwin && center[0] > 18.8 && center[0] < 19.3 && (
          <>
            {twinFootprints.map((footprint, index) => (
              <Polygon
                key={`twin-building-${index}`}
                positions={footprint}
                pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.12, weight: 1.2 }}
              />
            ))}
            <Polyline
              positions={[[19.082, 72.875], [19.064, 72.869], [19.043, 72.855]]}
              pathOptions={{ color: '#0284c7', weight: 2, opacity: 0.5, dashArray: '4 6' }}
            />
            <Polyline
              positions={[[19.104, 72.889], [19.078, 72.879], [19.063, 72.868]]}
              pathOptions={{ color: '#0369a1', weight: 2, opacity: 0.45, dashArray: '3 7' }}
            />
          </>
        )}
        {show('risk') && visibleWards.map((ward) => {
          const position = wardCoords[ward.id]
          if (!position) return null
          const color = riskColors[ward.status] || '#0d9488'
          return (
            <Fragment key={ward.id}>
              <Circle
                center={position}
                radius={selectedWard ? 1250 : 850}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.16, weight: 2 }}
              />

              <Marker
                position={position}
                icon={markerIcon(ward.risk, color, 'ward-marker', ward.status)}
                eventHandlers={{ click: () => onSelectWard?.(ward.id) }}
              >
                <Popup>
                  <div className="map-popup">
                    <span className="eyebrow">{ward.name}</span>
                    <strong>{ward.area}</strong>
                    <div><b>{ward.risk}%</b> composite flood risk</div>
                    <small>{ward.rainfall} mm/h rainfall · {ward.drainage}% drainage headroom</small>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          )
        })}
        {(show('risk') || show('depth')) && streets.map((street) => {
          const isCritical = street.risk === 'CRITICAL' || street.waterDepth >= 30
          const radius = Math.max(280, Math.min(1100, 280 + street.waterDepth * 7))
          return (
            <Circle
              key={`inundation-${street.id}`}
              center={[street.latitude, street.longitude]}
              radius={radius}
              className="flood-water-inundation-layer"
              pathOptions={{
                color: isCritical ? '#1d4ed8' : '#2563eb',
                fillColor: isCritical ? '#1e40af' : '#3b82f6',
                fillOpacity: focusedStreet === street.id ? 0.48 : isCritical ? 0.38 : 0.24,
                weight: focusedStreet === street.id ? 3 : 1.5,
                dashArray: focusedStreet === street.id ? undefined : '5 5'
              }}
            />
          )
        })}
        {show('depth') && streets.map((street) => {
          const color = riskColors[street.risk] || '#dc2626'
          const utilization = utilizationFor(street.drainageNode)
          const isCritical = street.risk === 'CRITICAL'
          const radius = isCritical ? Math.max(12, Math.min(28, street.waterDepth / 2)) : Math.max(9, Math.min(22, street.waterDepth / 2))
          return (
            <CircleMarker
              key={`depth-${street.id}`}
              center={[street.latitude, street.longitude]}
              radius={radius}
              className={`hotspot-circle-marker risk-${street.risk.toLowerCase()}`}
              pathOptions={{
                color: '#ffffff',
                fillColor: color,
                fillOpacity: 0.92,
                weight: focusedStreet === street.id ? 3.5 : 2
              }}
              eventHandlers={{ click: () => onSelectStreet?.(street.id) }}
            >
              <Popup><FloodPopup street={street} prediction={prediction} utilization={utilization} /></Popup>
            </CircleMarker>
          )
        })}
        {show('terrain') && terrainZones.map((zone) => (
          <Circle
            key={`terrain-${zone.id}`}
            center={[zone.latitude, zone.longitude]}
            radius={Math.max(220, zone.accumulationPotential * 520)}
            pathOptions={{ color: terrainColors[zone.terrainType], fillColor: terrainColors[zone.terrainType], fillOpacity: 0.18, weight: 1.5 }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{zone.name}</strong>
                <small>{zone.elevation} m elevation · {zone.slope}% slope · {Math.round(zone.accumulationPotential * 100)}% accumulation potential</small>
              </div>
            </Popup>
          </Circle>
        ))}
        {show('network') && drainageNetwork?.edges.map((edge) => {
          const predictedEdge = predictedEdges.find((item) => item.id === edge.id)
          const utilization = predictedEdge?.utilization || 0
          const color = predictedEdge?.status === 'overloaded' || edge.blocked ? '#dc2626' : utilization >= 0.8 ? '#ea580c' : '#2563eb'
          return (
            <Polyline
              key={edge.id}
              positions={[nodeLookup[edge.source], nodeLookup[edge.target]]}
              pathOptions={{
                color,
                weight: predictedEdge?.status === 'overloaded' || edge.blocked ? 5 : 3,
                dashArray: edge.blocked ? '7 6' : undefined
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{edge.id} · {edge.blocked ? 'Blocked pipe' : 'Stormwater link'}</strong>
                  <div><b>{Math.round(utilization * 100)}%</b> utilization</div>
                  <small>{edge.length} m · {edge.diameter} m diameter</small>
                </div>
              </Popup>
            </Polyline>
          )
        })}
        {show('capacity') && nodes.map((node) => {
          const utilization = utilizationFor(node.id)
          const color = utilization >= 1 ? '#dc2626' : utilization >= 0.8 ? '#ea580c' : '#059669'
          const linkedStreet = streetForNode(node.id)
          return (
            <Fragment key={`capacity-${node.id}`}>
              <CircleMarker
                center={[node.lat, node.lng]}
                radius={utilization >= 1 ? 11 : 8}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.92, weight: utilization >= 1 ? 3 : 2 }}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{node.name}</strong>
                    <div><b>{Math.round(utilization * 100)}%</b> capacity used</div>
                    <small>{node.type} · {node.capacity} flow units</small>
                  </div>
                </Popup>
              </CircleMarker>
              {utilization >= 1 && linkedStreet && (
                <Polyline
                  positions={[[node.lat, node.lng], [linkedStreet.latitude, linkedStreet.longitude]]}
                  pathOptions={{ color: '#dc2626', weight: 2.5, opacity: 0.75, dashArray: '3 5' }}
                />
              )}
            </Fragment>
          )
        })}
        {show('runoff') && terrainZones.map((zone) => (
          <Marker
            key={`runoff-${zone.id}`}
            position={[zone.latitude, zone.longitude]}
            icon={markerIcon('↘', '#0f766e', 'runoff-marker')}
          >
            <Popup>
              <div className="map-popup">
                <strong>Surface runoff</strong>
                <small>{zone.name} · flow toward {zone.flowDirection}</small>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-overlay map-legend leaflet-legend" aria-label="Flood map legend">
        <strong>DEMO MODE · {prediction?.time || 'WARD RISK'}</strong>
        {(show('risk') || show('depth')) && (
          <>
            <span><i className="legend-dot" style={{ background: depthColors.low }} />0–10 cm low</span>
            <span><i className="legend-dot" style={{ background: depthColors.moderate }} />10–30 cm moderate</span>
            <span><i className="legend-dot" style={{ background: depthColors.critical }} />30+ cm critical</span>
          </>
        )}
        {show('network') && <span><i className="legend-dot" style={{ background: '#2563eb' }} />Drainage graph</span>}
        {show('capacity') && <span><i className="legend-dot" style={{ background: '#dc2626' }} />Overloaded node</span>}
      </div>
    </div>
  )
}

export default InteractiveRiskMap

