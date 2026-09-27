import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '../components/ui'
import { useRegion } from '../context/useRegion'
import RoutePlanner from '../components/routing/RoutePlanner'
import RouteTimeline from '../components/routing/RouteTimeline'
import RouteTypeSelector from '../components/routing/RouteTypeSelector'
import RouteCard from '../components/routing/RouteCard'
import RouteMap from '../components/routing/RouteMap'
import RouteDetails from '../components/routing/RouteDetails'
import WorkflowIndicator from '../components/workflow/WorkflowIndicator'
import { getFloodForecast } from '../services/floodEngine'
import { calculateGoogleAwareSafeRoute } from '../services/googleMapsRoutingService'
import { getSafeRouteDataset } from '../data/routes/index.js'
import { calculateSafeRoute, resolveRoadLocationIds } from '../services/routingService'

const LOADING_STEPS = [
  'Evaluating route alternatives against regional flood model…',
  'Evaluating predicted water depth & terrain runoff…',
  'Checking drainage network surcharge & backflow…',
  'Analyzing flood exposure across road corridors…',
]

const WORKFLOW_STEPS = [
  { step: '01', label: 'INCIDENT' },
  { step: '02', label: 'SELECT DESTINATION' },
  { step: '03', label: 'FETCH ROUTE ALTERNATIVES' },
  { step: '04', label: 'EVALUATE FLOOD EXPOSURE' },
  { step: '05', label: 'COMPARE ROUTES' },
  { step: '06', label: 'SELECT LOWER-EXPOSURE ROUTE' },
  { step: '07', label: 'OPEN IN GOOGLE MAPS' },
]

function fmtDepth(v) {
  const n = Number(v)
  return isNaN(n) ? '—' : Number(n.toFixed(1))
}

function SafeRoutePage() {
  const { selectedRegion, currentRegion, selectedHorizon, setSelectedHorizon, selectedStreetId } = useRegion()
  const [searchParams] = useSearchParams()
  const regionId = currentRegion?.id || selectedRegion
  const routeDataset = useMemo(() => getSafeRouteDataset(regionId), [regionId])
  const locations = routeDataset.locations
  const corridors = routeDataset.crisisCorridors

  const paramHorizon = searchParams.get('horizon') || selectedHorizon || 'NOW'
  const paramIncident = searchParams.get('incident') || selectedStreetId || ''

  const [customOrigin, setCustomOrigin] = useState('')
  const [customDestination, setCustomDestination] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [destCoords, setDestCoords] = useState(null)
  const [isCurrentLocationActive, setIsCurrentLocationActive] = useState(false)
  const [routingError, setRoutingError] = useState(null)
  const [selectedTime, setSelectedTime] = useState(paramHorizon)
  const [routeType, setRouteType] = useState('Emergency Vehicle')
  const [loading, setLoading] = useState(false)
  const [loadingStepIdx, setLoadingStepIdx] = useState(0)
  const [selectedRouteId, setSelectedRouteId] = useState(null)

  useEffect(() => {
    const h = searchParams.get('horizon')
    if (h) {
      setSelectedTime(h)
      setSelectedHorizon?.(h)
    }
  }, [searchParams, setSelectedHorizon])

  // Reset custom coordinates if region changes
  useEffect(() => {
    setCustomOrigin('')
    setCustomDestination('')
    setOriginCoords(null)
    setDestCoords(null)
    setIsCurrentLocationActive(false)
    setRoutingError(null)
  }, [regionId])

  const defaultOriginName = routeDataset?.defaultOrigin || locations?.[0]?.name || 'Origin'
  const defaultDestName = routeDataset?.defaultDestination || locations?.[1]?.name || 'Destination'

  const originCoordsText = originCoords && typeof originCoords.lat === 'number' && typeof originCoords.lng === 'number'
    ? `Current Location (${originCoords.lat.toFixed(4)}° N, ${originCoords.lng.toFixed(4)}° E)`
    : null

  const origin = isCurrentLocationActive && originCoordsText
    ? originCoordsText
    : (customOrigin || defaultOriginName)

  const destination = customDestination || defaultDestName

  const effectiveOrigin = isCurrentLocationActive && originCoords
    ? originCoords
    : origin

  const effectiveDestination = destCoords || destination

  const originDisplayName = isCurrentLocationActive && originCoordsText
    ? originCoordsText
    : origin

  const destinationDisplayName = typeof effectiveDestination === 'object'
    ? (effectiveDestination.name || effectiveDestination.label || destination)
    : destination

  const [routingResult, setRoutingResult] = useState(() => {
    try {
      const { startId, destinationId } = resolveRoadLocationIds(
        routeDataset?.defaultOrigin || 'START',
        routeDataset?.defaultDestination || 'DEST',
        regionId
      )
      return calculateSafeRoute(startId, destinationId, 'NOW', 'Emergency Vehicle', regionId)
    } catch {
      return {
        routes: [],
        recommended: null,
        alternative: null,
        shortestNormal: null,
        googleMapsAvailable: false,
      }
    }
  })

  const handleOriginChange = (val, coords = null) => {
    setRoutingError(null)
    setCustomOrigin(val)
    if (coords && coords.lat != null && coords.lng != null) {
      setOriginCoords(coords)
      setIsCurrentLocationActive(true)
    } else {
      setOriginCoords(null)
      setIsCurrentLocationActive(false)
    }
  }

  const handleDestinationChange = (val, coords = null) => {
    setRoutingError(null)
    setCustomDestination(val)
    setDestCoords(coords)
  }

  const loadingIntervalRef = useRef(null)
  const forecast = useMemo(() => getFloodForecast(regionId), [regionId])

  // Peak impact horizon across all steps in the regional forecast
  const peakPoint = useMemo(() => {
    return forecast.reduce(
      (best, pt) => (pt.highestWaterDepth > best.highestWaterDepth ? pt : best),
      forecast[0] || { highestWaterDepth: 0, time: 'NOW' }
    )
  }, [forecast])

  const handleCalculate = async (
    targetOrigin = effectiveOrigin,
    targetDestination = effectiveDestination,
    nextTime = selectedTime,
    nextMode = routeType
  ) => {
    setRoutingError(null)

    // Requirement 5: If current location was selected, use actual coordinates.
    // If coordinate is unavailable, do NOT silently fall back to Shivaji Railway Bridge or demo corridors.
    if (isCurrentLocationActive && (!originCoords || originCoords.lat == null || originCoords.lng == null)) {
      setRoutingError('Current location is unavailable. Please select your starting point again.')
      return
    }

    if (
      typeof targetOrigin === 'string' &&
      targetOrigin.toLowerCase().startsWith('current location') &&
      !originCoords
    ) {
      setRoutingError('Current location is unavailable. Please select your starting point again.')
      return
    }

    const actualOrigin = (isCurrentLocationActive && originCoords) ? originCoords : targetOrigin
    const actualDestination = targetDestination

    const originLabel = typeof actualOrigin === 'object'
      ? (actualOrigin.name || actualOrigin.label || 'Current Location')
      : actualOrigin
    const destLabel = typeof actualDestination === 'object'
      ? (actualDestination.name || actualDestination.label || 'Destination')
      : actualDestination

    const { startId, destinationId } = resolveRoadLocationIds(originLabel, destLabel, regionId)
    setLoading(true)
    setLoadingStepIdx(0)

    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 280)

    try {
      const result = await calculateGoogleAwareSafeRoute({
        origin: actualOrigin,
        destination: actualDestination,
        time: nextTime,
        mode: nextMode,
        fallbackStartId: startId,
        fallbackDestinationId: destinationId,
        regionId,
      })

      if (!result.regionId || result.regionId === regionId) {
        setRoutingResult(result)
        // Auto-select the first route or recommended route
        const active = result.recommended?.id || result.routes?.[0]?.id || null
        setSelectedRouteId(active)
      }
    } catch {
      const fallback = calculateSafeRoute(startId, destinationId, nextTime, nextMode, regionId)
      setRoutingResult({
        ...fallback,
        notice: `JalDrishti demonstration route for ${routeDataset.regionName || 'the selected region'}`,
      })
      const active = fallback.recommended?.id || fallback.routes?.[0]?.id || null
      setSelectedRouteId(active)
    } finally {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
      }
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const currentOrigin = (isCurrentLocationActive && originCoords) ? originCoords : effectiveOrigin
    const currentDest = effectiveDestination
    const originLabel = typeof currentOrigin === 'object'
      ? (currentOrigin.name || currentOrigin.label || 'Current Location')
      : currentOrigin
    const destLabel = typeof currentDest === 'object'
      ? (currentDest.name || currentDest.label || 'Destination')
      : currentDest
    const { startId, destinationId } = resolveRoadLocationIds(originLabel, destLabel, regionId)

    calculateGoogleAwareSafeRoute({
      origin: currentOrigin,
      destination: currentDest,
      time: selectedTime,
      mode: routeType,
      fallbackStartId: startId,
      fallbackDestinationId: destinationId,
      regionId,
    })
      .then((res) => {
        if (active && (!res.regionId || res.regionId === regionId)) {
          setRoutingResult(res)
          const chosen = res.recommended?.id || res.routes?.[0]?.id || null
          setSelectedRouteId(chosen)
        }
      })
      .catch(() => {
        if (active) {
          const fallback = calculateSafeRoute(startId, destinationId, selectedTime, routeType, regionId)
          setRoutingResult(fallback)
          const chosen = fallback.recommended?.id || fallback.routes?.[0]?.id || null
          setSelectedRouteId(chosen)
        }
      })

    return () => {
      active = false
    }
  }, [effectiveOrigin, effectiveDestination, selectedTime, routeType, regionId, isCurrentLocationActive, originCoords])

  const updateRouteTime = async (time) => {
    setSelectedTime(time)
    await handleCalculate(effectiveOrigin, effectiveDestination, time, routeType)
  }

  const updateRouteType = async (mode) => {
    setRouteType(mode)
    await handleCalculate(effectiveOrigin, effectiveDestination, selectedTime, mode)
  }

  // Extract all evaluated routes
  const evaluatedRoutes = useMemo(() => {
    if (routingResult.routes && routingResult.routes.length > 0) {
      return routingResult.routes
    }
    return [routingResult.recommended, routingResult.alternative, routingResult.shortestNormal].filter(Boolean)
  }, [routingResult])

  // Identify min distance (shortest route) and lowest depth among evaluated routes (Section 12)
  const minDistance = useMemo(() => {
    if (!evaluatedRoutes.length) return 0
    return Math.min(...evaluatedRoutes.map((r) => r.distance || Number.POSITIVE_INFINITY))
  }, [evaluatedRoutes])

  const minDepth = useMemo(() => {
    if (!evaluatedRoutes.length) return 0
    return Math.min(...evaluatedRoutes.map((r) => r.maximumWaterDepth ?? r.floodDepth ?? 0))
  }, [evaluatedRoutes])

  // Active selected route
  const activeRoute = useMemo(() => {
    return (
      evaluatedRoutes.find((r) => r.id === selectedRouteId) ||
      routingResult.recommended ||
      evaluatedRoutes[0] ||
      null
    )
  }, [evaluatedRoutes, selectedRouteId, routingResult])

  return (
    <div className="sr-container">
      {/* ── Page Header (Section 7) ── */}
      <div className="fra-page-top">
        <div>
          <span className="eyebrow">ROUTE SAFETY ASSESSMENT</span>
          <h1 className="fra-title">ROUTE SAFETY ASSESSMENT</h1>
          <p className="fra-subtitle">Evaluate navigation routes against predicted flood exposure.</p>
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

      {/* Operational Workflow Indicator */}
      <WorkflowIndicator currentStage="ROUTE" style={{ marginBottom: '14px' }} />

      {/* Incident Context Reference if arriving from Emergency Response / Analysis */}
      {paramIncident && (
        <div className="jd-route-incident-banner">
          <div>
            <span className="jd-route-incident-tag">OPERATIONAL INCIDENT CONTEXT</span>
            <div className="jd-route-incident-title">
              Evaluated corridor in relation to incident location: <strong>{paramIncident}</strong>
            </div>
          </div>
          <span className="jd-route-incident-horizon">Forecast Horizon: <strong>{selectedTime}</strong></span>
        </div>
      )}

      {/* ── Section 14: Emergency Routing Workflow ── */}
      <Panel className="route-workflow-panel">
        <div className="route-workflow-heading">
          <span className="eyebrow">DECISION CHAIN</span>
          <h3>EMERGENCY ROUTING WORKFLOW</h3>
        </div>
        <div className="route-workflow-steps">
          {WORKFLOW_STEPS.map((item, idx) => (
            <div key={item.step} className="workflow-step-item">
              <div className="workflow-step-pill">
                <span className="workflow-step-num">{item.step}</span>
                <span className="workflow-step-label">{item.label}</span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && <span className="workflow-step-arrow">→</span>}
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Section 8: Route Planner ── */}
      <RoutePlanner
        key={regionId}
        locations={locations}
        origin={origin}
        destination={destination}
        originCoords={originCoords}
        isCurrentLocationActive={isCurrentLocationActive}
        onOriginChange={handleOriginChange}
        onDestinationChange={handleDestinationChange}
        onPresetSelect={(preset) => {
          setIsCurrentLocationActive(false)
          setOriginCoords(null)
          setRoutingError(null)
          setCustomOrigin(preset.origin)
          setCustomDestination(preset.destination)
          handleCalculate(preset.origin, preset.destination, selectedTime, routeType)
        }}
        onCalculate={(o, d) => {
          const targetO = isCurrentLocationActive && originCoords ? originCoords : (o || effectiveOrigin)
          const targetD = d || destCoords || customDestination || effectiveDestination
          handleCalculate(targetO, targetD)
        }}
        loading={loading}
        googleMapsAvailable={routingResult?.googleMapsAvailable}
        corridors={corridors}
        originPlaceholder="Enter starting location or use GPS"
        destinationPlaceholder="Enter destination (e.g. Connaught Place, Mumbai Airport)"
        regionName={routeDataset.regionName || 'the selected region'}
        regionId={regionId}
      />

      {/* Current Location Error Advisory Banner */}
      {routingError && (
        <div
          role="alert"
          style={{
            margin: '10px 0',
            padding: '10px 14px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <strong style={{ fontWeight: 700 }}>LOCATION ADVISORY:</strong>
          <span>{routingError}</span>
        </div>
      )}

      {/* ── Forecast Horizon Timeline & Vehicle Mode ── */}
      <Panel className="route-controls-panel">
        <div className="route-control-row">
          <div>
            <span className="eyebrow">FORECAST-AWARE TIMELINE</span>
            <h2>Travel conditions at forecast horizon: {selectedTime}</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '12px' }}>
              Corridor flood exposure dynamically updates based on coupled runoff & water depth predictions.
            </p>
          </div>
          <RouteTimeline forecast={forecast} selectedTime={selectedTime} onSelectTime={updateRouteTime} />
        </div>
        <RouteTypeSelector selectedType={routeType} onSelectType={updateRouteType} />
      </Panel>

      {/* Loading Banner */}
      {loading && (
        <div className="route-loading-banner" role="status" aria-live="polite">
          <div className="loading-spinner" />
          <div className="loading-text">
            <strong>Evaluating Route Safety…</strong>
            <span>{LOADING_STEPS[loadingStepIdx]}</span>
          </div>
        </div>
      )}

      {/* Notice if Google Maps has an issue or simulation fallback */}
      {routingResult.googleError && (
        <div style={{ margin: '10px 0', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '4px', fontSize: '12px', color: '#92400E' }}>
          <strong>Routing Advisory:</strong> Google Maps routing is currently operating in fallback mode for this corridor. JalDrishti regional hydrological simulation remains active.
        </div>
      )}

      {/* ── Section 11: Route Flood Exposure Panel (Compact Dynamic Exposure) ── */}
      <Panel className="route-exposure-panel">
        <div className="route-exposure-heading">
          <span className="eyebrow">FLOOD NOWCAST COUPLING</span>
          <h3>ROUTE FLOOD EXPOSURE</h3>
          <span className="route-active-corridor-name">
            Corridor: {activeRoute?.name || 'Selected Route'}
          </span>
        </div>
        <div className="route-exposure-grid">
          <div className="route-exposure-stat">
            <span className="stat-label">MAXIMUM PREDICTED DEPTH</span>
            <strong
              className="stat-val"
              style={{
                color: (activeRoute?.maximumWaterDepth ?? 0) >= 30 ? '#dc2626' : '#1e293b',
              }}
            >
              {fmtDepth(activeRoute?.maximumWaterDepth ?? 0)} cm
            </strong>
          </div>
          <div className="route-exposure-stat">
            <span className="stat-label">HIGH-RISK SEGMENTS</span>
            <strong
              className="stat-val"
              style={{
                color: (activeRoute?.floodedSegments ?? 0) > 0 ? '#ea580c' : '#1e293b',
              }}
            >
              {activeRoute?.floodedSegments ?? 0}
            </strong>
          </div>
          <div className="route-exposure-stat">
            <span className="stat-label">CRITICAL SEGMENTS</span>
            <strong
              className="stat-val"
              style={{
                color: (activeRoute?.blockedSegments ?? 0) > 0 ? '#dc2626' : '#1e293b',
              }}
            >
              {activeRoute?.blockedSegments ?? 0}
            </strong>
          </div>
          <div className="route-exposure-stat">
            <span className="stat-label">DRAINAGE EXPOSURE</span>
            <strong
              className="stat-val"
              style={{
                color: activeRoute?.drainageRisk === 'Elevated' ? '#ea580c' : '#059669',
              }}
            >
              {activeRoute?.drainageRisk || 'Low'}
            </strong>
          </div>
          <div className="route-exposure-stat">
            <span className="stat-label">PEAK FORECAST HORIZON</span>
            <strong className="stat-val">{peakPoint.time}</strong>
          </div>
        </div>
      </Panel>

      {/* ── Structured Route Comparison Table (Transport Operations System) ── */}
      <Panel className="route-comparison-table-panel" style={{ marginBottom: '16px' }}>
        <div className="panel-heading" style={{ marginBottom: '10px' }}>
          <div>
            <span className="eyebrow">OPERATIONAL ROUTE COMPARISON MATRIX</span>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '2px 0 0' }}>EVALUATED CORRIDORS</h3>
          </div>
          <span className="route-map-status" style={{ fontSize: '11px', color: '#64748B' }}>
            Hydrological Overlay: {selectedTime} Horizon
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse', border: '1px solid #D9DEE5' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #D9DEE5', color: '#475569' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>ROUTE</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>DISTANCE</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>ESTIMATED TIME</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>MAX PREDICTED DEPTH</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>AFFECTED SEGMENTS</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>FLOOD EXPOSURE</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedRoutes.map((route, idx) => {
                const maxD = route.maximumWaterDepth ?? route.floodDepth ?? 0
                const isSelected = route.id === activeRoute?.id
                const isShort = route.distance === minDistance
                const isLow = maxD === minDepth
                const blocked = route.blockedSegments ?? route.blockedRoads ?? 0
                const flooded = route.floodedSegments ?? 0
                return (
                  <tr
                    key={route.id || idx}
                    style={{
                      background: isSelected ? '#F0F4F8' : idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF',
                      borderBottom: '1px solid #E2E8F0',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedRouteId(route.id)}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{route.name || `Route Alternative ${idx + 1}`}</span>
                        {isLow && (
                          <span style={{ fontSize: '10px', color: '#059669', background: '#DCFCE7', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                            LOWER PREDICTED FLOOD EXPOSURE
                          </span>
                        )}
                        {isShort && (
                          <span style={{ fontSize: '10px', color: '#0284C7', background: '#E0F2FE', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                            SHORTEST DIRECT ROUTE
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{route.distance} km</td>
                    <td style={{ padding: '8px 12px' }}>{route.travelTime} min</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: maxD >= 30 ? '#DC2626' : maxD >= 15 ? '#D97706' : '#1E293B' }}>
                      {typeof maxD === 'number' ? maxD.toFixed(1) : maxD} cm
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {flooded} flooded ({blocked} critical)
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`route-status-pill status-${route.floodExposure === 'CRITICAL' ? 'danger' : route.floodExposure === 'HIGH' ? 'danger' : route.floodExposure === 'MODERATE' ? 'warning' : 'safe'}`}>
                        {route.floodExposure || 'LOW'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            background: isSelected ? '#0F233A' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#334155',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRouteId(route.id)
                          }}
                        >
                          {isSelected ? 'Selected' : 'Inspect'}
                        </button>
                        {route.googleMapsUrl && (
                          <a
                            href={route.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              color: '#0F233A',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Open this route in Google Maps navigation"
                          >
                            Open in Google Maps →
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Required Operational Disclaimer Banner */}
        <div style={{ marginTop: '12px', padding: '10px 14px', background: '#F8FAFC', border: '1px solid #D9DEE5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#475569' }}>
            <strong>OPERATIONAL ADVISORY:</strong> Route assessment is based on current JalDrishti flood predictions and does not guarantee road safety.
          </span>
          {activeRoute?.googleMapsUrl && (
            <a
              href={activeRoute.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0F233A',
                color: '#FFFFFF',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              <span>OPEN ROUTE IN GOOGLE MAPS →</span>
            </a>
          )}
        </div>
      </Panel>

      {/* ── Main Routing Workspace: Map (Left) + Comparison Cards (Right) (Section 13, 9) ── */}
      <div className="route-workspace">
        {/* Section 13: Route Map */}
        <Panel className="route-map-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ROAD NETWORK & FLOOD EXPOSURE</span>
              <h2>
                {originDisplayName} → {destinationDisplayName}
              </h2>
            </div>
            <span className="route-map-status">
              {evaluatedRoutes.length} Route Alternative(s) Evaluated
            </span>
          </div>
          <RouteMap
            routingResult={routingResult}
            regionCenter={routeDataset.center}
            mapKey={regionId}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(route) => setSelectedRouteId(route.id)}
          />
        </Panel>

        {/* Section 9 & 12: Route Comparison Column */}
        <div className="route-results">
          <div className="route-comparison-intro">
            <span className="eyebrow">ROUTE COMPARISON</span>
            <h3>EVALUATED ALTERNATIVES</h3>
            <p className="muted" style={{ margin: '3px 0 10px', fontSize: '11px' }}>
              Comparison of road distance versus predicted hydrological exposure. Click any corridor to inspect on map.
            </p>
          </div>

          {evaluatedRoutes.map((route, idx) => {
            const isShortest = route.distance === minDistance
            const isLowerExposure = (route.maximumWaterDepth ?? route.floodDepth ?? 0) === minDepth
            return (
              <RouteCard
                key={route.id || `route-${idx}`}
                route={route}
                index={idx}
                isSelected={route.id === activeRoute?.id}
                onSelect={(r) => setSelectedRouteId(r.id)}
                isShortest={isShortest}
                isLowerExposure={isLowerExposure}
              />
            )
          })}
        </div>
      </div>

      {/* ── Section 15: Important Technical Explanation ── */}
      <Panel className="route-tech-panel">
        <div className="tech-panel-header">
          <span className="eyebrow">OPERATIONAL SPECIFICATION</span>
          <h3>HOW JALDRISHTI EVALUATES ROUTES</h3>
        </div>
        <p className="tech-panel-intro">
          Google Maps provides road-network route alternatives. JalDrishti evaluates those alternatives against its predicted flood conditions, including:
        </p>
        <div className="tech-eval-grid">
          <div className="tech-eval-item">
            <strong>• Predicted flood depth</strong>
            <p>Spatial overlay of hydrological water depth along each coordinate of the route polyline.</p>
          </div>
          <div className="tech-eval-item">
            <strong>• Affected road exposure</strong>
            <p>Proximity weighting against predicted flooded corridors and critical junctions.</p>
          </div>
          <div className="tech-eval-item">
            <strong>• Drainage conditions</strong>
            <p>Proximity to surcharging drainage nodes and backflow-risk infrastructure.</p>
          </div>
          <div className="tech-eval-item">
            <strong>• Modeled high-risk segments</strong>
            <p>Identification of impassable segments (depth ≥ 30 cm) and caution corridors.</p>
          </div>
        </div>
        <p className="tech-panel-note">
          This allows route selection to consider flood exposure rather than distance alone. Navigation geometry is generated via Google Maps; flood exposure assessment is computed by JalDrishti.
        </p>
      </Panel>

      {/* ── Road & Corridor Flood Impact List ── */}
      <RouteDetails routingResult={routingResult} />

      {/* Disclaimer */}
      <div className="jd-disclaimer">
        <strong>JalDrishti</strong> — Urban Flood Intelligence & Decision Support System · Prototype / Demonstration System · Model outputs are intended for decision support and require operational verification before field deployment.
      </div>
    </div>
  )
}

export default SafeRoutePage
