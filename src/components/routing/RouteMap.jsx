import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { loadGoogleMapsApi } from '../../services/googleMapsRoutingService'

const routeColors = {
  recommended: '#10b981',
  alternative: '#f59e0b',
  shortest: '#ef4444',
}

const DEFAULT_CENTER = [20.5937, 78.9629]

function toLatLng(point) {
  if (!point) return null
  if (Array.isArray(point) && point.length >= 2) {
    return { lat: point[0], lng: point[1] }
  }
  const lat = point.lat ?? point.latitude
  const lng = point.lng ?? point.longitude
  if (lat == null || lng == null) return null
  return { lat, lng }
}

function buildRoutePath(route) {
  if (!route) return []
  if (route.routePolyline?.length) {
    return route.routePolyline.map((p) => toLatLng(p)).filter(Boolean)
  }
  if (route.polyline?.length) {
    return route.polyline.map((p) => toLatLng(p)).filter(Boolean)
  }
  if (route.coordinates?.length) {
    return route.coordinates.map((p) => toLatLng(p)).filter(Boolean)
  }
  return []
}

function RouteMap({ routingResult, regionCenter, mapKey }) {
  const [mapMode, setMapMode] = useState('loading')
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const overlaysRef = useRef([])
  const [centerLat, centerLng] = regionCenter?.length >= 2 ? regionCenter : DEFAULT_CENTER

  useEffect(() => {
    mapInstanceRef.current = null
  }, [mapKey])

  useEffect(() => {
    let cancelled = false

    const renderGoogleMap = async () => {
      try {
        const maps = await loadGoogleMapsApi()

        if (cancelled) return

        if (!maps || !maps.Map) {
          setMapMode('fallback')
          return
        }

        setMapMode('google')

        if (!mapRef.current) return

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center: { lat: centerLat, lng: centerLng },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#cbe6f7' }],
              },
              {
                featureType: 'landscape',
                elementType: 'geometry',
                stylers: [{ color: '#f8fafc' }],
              },
            ],
          })
        }

        const map = mapInstanceRef.current
        map.setCenter({ lat: centerLat, lng: centerLng })
        const bounds = new maps.LatLngBounds()

        overlaysRef.current.forEach((overlay) => overlay.setMap(null))
        overlaysRef.current = []

        const addOverlay = (overlay) => {
          overlay.setMap(map)
          overlaysRef.current.push(overlay)
        }

        const routeEntries = [
          ['shortest', routingResult.shortestNormal],
          ['alternative', routingResult.alternative],
          ['recommended', routingResult.recommended],
        ].filter(([, route]) => route)

        routeEntries.forEach(([type, route]) => {
          const coordinates = buildRoutePath(route)

          if (coordinates.length) {
            const polyline = new maps.Polyline({
              path: coordinates,
              geodesic: true,
              strokeColor: routeColors[type] || '#2563eb',
              strokeOpacity: type === 'recommended' ? 0.95 : type === 'alternative' ? 0.85 : 0.7,
              strokeWeight: type === 'recommended' ? 6 : type === 'alternative' ? 5 : 4,
              zIndex: type === 'recommended' ? 10 : type === 'alternative' ? 5 : 2,
            })

            addOverlay(polyline)
            coordinates.forEach((point) => bounds.extend(point))
          }
        })

        if (routingResult.start && routingResult.destination) {
          const startPos = toLatLng(routingResult.start) || { lat: centerLat, lng: centerLng }
          const destPos = toLatLng(routingResult.destination) || { lat: centerLat, lng: centerLng }

          const startMarker = new maps.Marker({
            position: startPos,
            map,
            title: `Origin: ${routingResult.start.name || 'Start'}`,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
          })

          const destinationMarker = new maps.Marker({
            position: destPos,
            map,
            title: `Destination: ${routingResult.destination.name || 'Destination'}`,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
          })

          overlaysRef.current.push(startMarker, destinationMarker)
          bounds.extend(startPos)
          bounds.extend(destPos)
        }

        if (routingResult.floodHotspots?.length) {
          routingResult.floodHotspots.forEach((street) => {
            const center = toLatLng(street)
            if (!center) return
            const circle = new maps.Circle({
              center,
              radius: Math.max(140, Math.min(300, (street.waterDepth || 10) * 8)),
              strokeColor: street.waterDepth >= 30 ? '#ef4444' : '#f59e0b',
              strokeOpacity: 0.7,
              strokeWeight: 1.5,
              fillColor: street.waterDepth >= 30 ? '#ef4444' : '#f59e0b',
              fillOpacity: 0.22,
            })

            addOverlay(circle)
            bounds.extend(center)
          })
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
        }
      } catch {
        if (!cancelled) {
          setMapMode('fallback')
        }
      }
    }

    renderGoogleMap()

    return () => {
      cancelled = true
      overlaysRef.current.forEach((overlay) => overlay.setMap(null))
      overlaysRef.current = []
    }
  }, [routingResult, centerLat, centerLng, mapKey])

  if (mapMode === 'fallback') {
    return <FallbackRouteMap routingResult={routingResult} regionCenter={[centerLat, centerLng]} mapKey={mapKey} />
  }

  if (mapMode === 'loading') {
    return (
      <div className="route-map-wrap">
        <div className="route-map-loading-placeholder">
          <div className="pulse-ring" />
          <span>Initializing routing map…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="route-map-wrap">
      <div ref={mapRef} className="route-map" />
      <div className="route-map-legend">
        <span><i style={{ background: routeColors.recommended }} />Recommended Safe Route</span>
        <span><i style={{ background: routeColors.alternative }} />Alternative Route</span>
        <span><i style={{ background: routeColors.shortest }} />Passable / Unsafe Route</span>
        <span><i className="blocked-dot" />Predicted Flood Hotspot</span>
      </div>
    </div>
  )
}

function MapViewport({ start, destination, regionCenter }) {
  const map = useMap()
  const points = [start, destination]
    .map((point) => toLatLng(point))
    .filter(Boolean)
    .map((point) => [point.lat, point.lng])

  if (points.length === 2) {
    map.fitBounds(points, { padding: [40, 40] })
  } else if (regionCenter?.length >= 2) {
    map.setView(regionCenter, 12)
  }

  return null
}

function FallbackRouteMap({ routingResult, regionCenter, mapKey }) {
  const routeLines = [
    ['shortest', routingResult.shortestNormal],
    ['alternative', routingResult.alternative],
    ['recommended', routingResult.recommended],
  ].filter(([, route]) => route)

  const fallbackPolylines = routeLines.map(([type, route]) => {
    const coordinates = buildRoutePath(route).map((p) => [p.lat, p.lng])
    if (!coordinates.length) return null

    return (
      <Polyline
        key={`poly-${type}-${route.id}`}
        positions={coordinates}
        pathOptions={{
          color: routeColors[type] || '#2563eb',
          weight: type === 'recommended' ? 6 : type === 'alternative' ? 5 : 4,
          opacity: type === 'recommended' ? 0.95 : type === 'alternative' ? 0.85 : 0.72,
          dashArray: type === 'shortest' ? '8 6' : undefined,
        }}
      >
        <Popup>
          <strong>{route.name}</strong><br />
          Safety Score: {route.safetyScore}/100 · {route.distance} km · {route.travelTime} min<br />
          Max Flood Depth: {route.maximumWaterDepth} cm
        </Popup>
      </Polyline>
    )
  })

  const startPos = toLatLng(routingResult.start)
  const destPos = toLatLng(routingResult.destination)

  return (
    <div className="route-map-wrap">
      <MapContainer key={mapKey} center={regionCenter || DEFAULT_CENTER} zoom={12} scrollWheelZoom className="route-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport start={routingResult.start} destination={routingResult.destination} regionCenter={regionCenter} />
        {fallbackPolylines}
        {startPos && (
          <CircleMarker
            center={[startPos.lat, startPos.lng]}
            radius={8}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <strong>{routingResult.start?.name || 'Origin'}</strong>
            </Popup>
          </CircleMarker>
        )}
        {destPos && (
          <CircleMarker
            center={[destPos.lat, destPos.lng]}
            radius={8}
            pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <strong>{routingResult.destination?.name || 'Destination'}</strong>
            </Popup>
          </CircleMarker>
        )}
        {(routingResult.floodHotspots || []).map((street) => {
          const center = toLatLng(street)
          if (!center) return null
          return (
            <CircleMarker
              key={street.id || `${center.lat}-${center.lng}`}
              center={[center.lat, center.lng]}
              radius={Math.max(8, Math.min(16, (street.waterDepth || 8) / 2))}
              pathOptions={{
                color: street.waterDepth >= 30 ? '#ef4444' : '#f59e0b',
                fillColor: street.waterDepth >= 30 ? '#ef4444' : '#f59e0b',
                fillOpacity: 0.35,
                weight: 1.5,
              }}
            >
              <Popup>
                <strong>{street.name}</strong><br />
                {street.waterDepth} cm predicted depth
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      <div className="route-map-legend">
        <span><i style={{ background: routeColors.recommended }} />Recommended Safe Route</span>
        <span><i style={{ background: routeColors.alternative }} />Alternative Route</span>
        <span><i style={{ background: routeColors.shortest }} />Passable / Unsafe Route</span>
        <span><i className="blocked-dot" />Flood Hotspot</span>
      </div>
    </div>
  )
}

export default RouteMap
