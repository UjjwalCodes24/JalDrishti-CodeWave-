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

  const [routingResult, setRoutingResult] = useState(() => {
    const { startId, destinationId } = resolveRoadLocationIds(
      routeDataset.defaultOrigin,
      routeDataset.defaultDestination,
      regionId
    )
    return calculateSafeRoute(startId, destinationId, 'NOW', 'Emergency Vehicle', regionId)
  })

  const regionLocationNames = new Set(locations.map((location) => location.name))
  const origin = regionLocationNames.has(customOrigin)
    ? customOrigin
    : routeDataset.defaultOrigin || locations[0]?.name || 'Origin'
  const destination = regionLocationNames.has(customDestination)
    ? customDestination
    : routeDataset.defaultDestination || locations[1]?.name || 'Destination'

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
    targetOrigin = origin,
    targetDestination = destination,
    nextTime = selectedTime,
    nextMode = routeType
  ) => {
    const { startId, destinationId } = resolveRoadLocationIds(targetOrigin, targetDestination, regionId)
    setLoading(true)
    setLoadingStepIdx(0)

    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 280)

    try {
      const result = await calculateGoogleAwareSafeRoute({
        origin: targetOrigin,
        destination: targetDestination,
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
    const { startId, destinationId } = resolveRoadLocationIds(origin, destination, regionId)

    calculateGoogleAwareSafeRoute({
      origin,
      destination,
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
  }, [origin, destination, selectedTime, routeType, regionId])

  const updateRouteTime = async (time) => {
    setSelectedTime(time)
    await handleCalculate(origin, destination, time, routeType)
  }

  const updateRouteType = async (mode) => {
    setRouteType(mode)
    await handleCalculate(origin, destination, selectedTime, mode)
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
              {idx < WORKFLOW_STEPS.length - 1 && <span className="workflow-step-arrow">➔</span>}
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
        onOriginChange={setCustomOrigin}
        onDestinationChange={setCustomDestination}
        onCalculate={(o, d) => handleCalculate(o || origin, d || destination)}
        loading={loading}
        googleMapsAvailable={routingResult.googleMapsAvailable}
        corridors={corridors}
        originPlaceholder={routeDataset.defaultOrigin || 'Start location'}
        destinationPlaceholder={routeDataset.defaultDestination || 'Destination'}
        regionName={routeDataset.regionName || 'the selected region'}
      />

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

      {/* ── Main Routing Workspace: Map (Left) + Comparison Cards (Right) (Section 13, 9) ── */}
      <div className="route-workspace">
        {/* Section 13: Route Map */}
        <Panel className="route-map-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ROAD NETWORK & FLOOD EXPOSURE</span>
              <h2>
                {origin} ➔ {destination}
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
