import { useEffect, useState, useRef, useMemo } from 'react'
import { PageHeader, Panel } from '../components/ui'
import { useRegion } from '../context/useRegion'
import RoutePlanner from '../components/routing/RoutePlanner'
import RouteTimeline from '../components/routing/RouteTimeline'
import RouteTypeSelector from '../components/routing/RouteTypeSelector'
import RouteCard from '../components/routing/RouteCard'
import RouteMap from '../components/routing/RouteMap'
import RouteDetails from '../components/routing/RouteDetails'
import { getFloodForecast } from '../services/floodEngine'
import { calculateGoogleAwareSafeRoute } from '../services/googleMapsRoutingService'
import { getSafeRouteDataset } from '../data/routes/index.js'
import { calculateSafeRoute, resolveRoadLocationIds } from '../services/routingService'

const LOADING_STEPS = [
  'Evaluating route alternatives against regional flood model…',
  'Evaluating predicted water depth & terrain runoff…',
  'Checking drainage network surcharge & backflow…',
  'Ranking safest viable flood navigation corridors…',
]

function SafeRoutePage() {
  const { selectedRegion, currentRegion } = useRegion()
  const regionId = currentRegion?.id || selectedRegion
  const routeDataset = useMemo(() => getSafeRouteDataset(regionId), [regionId])
  const locations = routeDataset.locations
  const corridors = routeDataset.crisisCorridors

  const [customOrigin, setCustomOrigin] = useState('')
  const [customDestination, setCustomDestination] = useState('')
  const [selectedTime, setSelectedTime] = useState('NOW')
  const [routeType, setRouteType] = useState('Emergency Vehicle')
  const [loading, setLoading] = useState(false)
  const [loadingStepIdx, setLoadingStepIdx] = useState(0)

  const [routingResult, setRoutingResult] = useState(() => {
    const { startId, destinationId } = resolveRoadLocationIds(routeDataset.defaultOrigin, routeDataset.defaultDestination, regionId)
    return calculateSafeRoute(startId, destinationId, 'NOW', 'Emergency Vehicle', regionId)
  })

  const regionLocationNames = new Set(locations.map((location) => location.name))
  const origin = regionLocationNames.has(customOrigin) ? customOrigin : (routeDataset.defaultOrigin || locations[0]?.name || 'Origin')
  const destination = regionLocationNames.has(customDestination) ? customDestination : (routeDataset.defaultDestination || locations[1]?.name || 'Destination')

  const loadingIntervalRef = useRef(null)
  const forecast = useMemo(() => getFloodForecast(regionId), [regionId])


  const handleCalculate = async (
    customOrigin = origin,
    customDestination = destination,
    nextTime = selectedTime,
    nextMode = routeType,
  ) => {
    const { startId, destinationId } = resolveRoadLocationIds(customOrigin, customDestination, regionId)
    setLoading(true)
    setLoadingStepIdx(0)

    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 280)

    try {
      const result = await calculateGoogleAwareSafeRoute({
        origin: customOrigin,
        destination: customDestination,
        time: nextTime,
        mode: nextMode,
        fallbackStartId: startId,
        fallbackDestinationId: destinationId,
        regionId,
      })

      if (!result.regionId || result.regionId === regionId) {
        setRoutingResult(result)
      }
    } catch {
      const fallback = calculateSafeRoute(startId, destinationId, nextTime, nextMode, regionId)
      setRoutingResult({
        ...fallback,
        notice: `JalDrishti demonstration route for ${routeDataset.regionName || 'the selected region'}`,
      })
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
        if (active && (!res.regionId || res.regionId === regionId)) setRoutingResult(res)
      })
      .catch(() => {
        if (active) {
          const fallback = calculateSafeRoute(startId, destinationId, selectedTime, routeType, regionId)
          setRoutingResult(fallback)
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

  const passableCount = routingResult.availableSafeRoutes ?? (routingResult.recommended?.viable ? 1 : 0)

  return (
    <>
      <PageHeader
        eyebrow="Navigation Resilience & Emergency Access"
        title="Flood-Safe Routes"
        description={`Road corridors evaluated against JalDrishti predicted flood depth, terrain runoff, and drainage overload for ${routeDataset.regionName || 'the selected region'}. Prototype demonstration corridors — not live flood warnings.`}
        action={
          <span className={`prototype-label ${routingResult.googleMapsAvailable ? 'google-active' : ''}`}>
            {routingResult.googleMapsAvailable ? 'GOOGLE MAPS ROUTING ACTIVE' : 'JalDrishti Demonstration Route'}
          </span>
        }
      />

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


      <Panel className="route-controls-panel">
        <div className="route-control-row">
          <div>
            <span className="eyebrow">FORECAST-AWARE TIMELINE</span>
            <h2>Travel conditions at forecast horizon: {selectedTime}</h2>
            <p className="muted">Safety scores dynamically update based on predicted precipitation & water accumulation.</p>
          </div>
          <RouteTimeline forecast={forecast} selectedTime={selectedTime} onSelectTime={updateRouteTime} />
        </div>
        <RouteTypeSelector selectedType={routeType} onSelectType={updateRouteType} />
      </Panel>

      {loading && (
        <div className="route-loading-banner" role="status" aria-live="polite">
          <div className="loading-spinner" />
          <div className="loading-text">
            <strong>Analyzing Route Safety…</strong>
            <span>{LOADING_STEPS[loadingStepIdx]}</span>
          </div>
        </div>
      )}

      <div className="route-workspace">
        <Panel className="route-map-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">FLOOD INTELLIGENCE MAP</span>
              <h2>{origin} ➔ {destination}</h2>
            </div>
            <span className="route-map-status">
              {passableCount > 0 ? `${passableCount} Passable Corridor(s)` : 'No Safe Route Available'}
            </span>
          </div>
          <RouteMap routingResult={routingResult} regionCenter={routeDataset.center} mapKey={regionId} />
        </Panel>

        <div className="route-results">
          <RouteCard route={routingResult.recommended} tone="recommended" />
          <RouteCard route={routingResult.alternative} tone="alternative" />
          <RouteCard route={routingResult.shortestNormal} tone="shortest" />
        </div>
      </div>

      <RouteDetails routingResult={routingResult} />
    </>
  )
}

export default SafeRoutePage

