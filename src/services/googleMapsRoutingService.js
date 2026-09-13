import { getFloodPrediction } from './floodEngine'
import { calculateSafeRoute, resolveRoadLocationIds, getRoadLocations, getRoutingGeocodeSuffix } from './routingService'
import { DEFAULT_REGION_ID, getRegionConfig, resolveRegionId } from '../data/regions/index.js'

const travelModeMap = {
  'Emergency Vehicle': 'DRIVING',
  Commuter: 'DRIVING',
  'Commuter Vehicle': 'DRIVING',
  Car: 'DRIVING',
  'Public Transport': 'TRANSIT',
  Walking: 'WALKING',
  'Pedestrian / Foot': 'WALKING',
}

const googleNavModeMap = {
  'Emergency Vehicle': 'driving',
  Commuter: 'driving',
  'Commuter Vehicle': 'driving',
  Car: 'driving',
  'Public Transport': 'transit',
  Walking: 'walking',
  'Pedestrian / Foot': 'walking',
}

let googleMapsPromise = null

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
}

export function buildGoogleMapsDirectionsUrl(origin, destination, travelMode = 'Emergency Vehicle', regionId = DEFAULT_REGION_ID) {
  const suffix = getRoutingGeocodeSuffix(regionId)
  const originStr = typeof origin === 'string' ? origin : origin ? `${origin.latitude || origin.lat},${origin.longitude || origin.lng}` : suffix
  const destStr = typeof destination === 'string' ? destination : destination ? `${destination.latitude || destination.lat},${destination.longitude || destination.lng}` : suffix
  const navMode = googleNavModeMap[travelMode] || 'driving'
  const cityToken = suffix.split(',')[0]

  const originQuery = originStr.includes(cityToken) ? originStr : `${originStr}, ${suffix}`
  const destQuery = destStr.includes(cityToken) ? destStr : `${destStr}, ${suffix}`

  const params = new URLSearchParams({
    api: '1',
    origin: originQuery,
    destination: destQuery,
    travelmode: navMode,
  })

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function loadGoogleMapsApi() {
  const apiKey = getGoogleMapsApiKey()

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_GOOGLE_MAPS_API_KEY')) {
    return Promise.reject(new Error('Google Maps API key is not configured.'))
  }

  if (window.google?.maps?.DirectionsService) {
    return Promise.resolve(window.google.maps)
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
      if (existingScript) {
        if (window.google?.maps?.DirectionsService) {
          resolve(window.google.maps)
          return
        }
        existingScript.addEventListener('load', () => {
          if (window.google?.maps?.DirectionsService) {
            resolve(window.google.maps)
          } else {
            googleMapsPromise = null
            reject(new Error('Google Maps loaded without DirectionsService.'))
          }
        })
        existingScript.addEventListener('error', () => {
          googleMapsPromise = null
          reject(new Error('Failed to load Google Maps script.'))
        })
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google?.maps?.DirectionsService) {
          resolve(window.google.maps)
        } else {
          googleMapsPromise = null
          reject(new Error('Google Maps API loaded but google.maps.DirectionsService is undefined.'))
        }
      }
      script.onerror = () => {
        googleMapsPromise = null
        reject(new Error('Google Maps script network request failed.'))
      }
      document.head.appendChild(script)
    })
  }

  return googleMapsPromise
}

export function evaluatePolylineAgainstFloodData(polyline, prediction, regionId = DEFAULT_REGION_ID) {
  const floodStreets = (prediction.streets || []).filter((s) => s.waterDepth > 0)
  const regionConfig = getRegionConfig(regionId)
  const drainageNodes = regionConfig.drainageNetwork?.nodes || []
  const terrainZones = regionConfig.terrain || []
  const surchargeRisk = prediction.drainage?.surchargeRisk || 0

  let maximumWaterDepth = 0
  let totalDepth = 0
  let sampledPoints = 0
  let blockedCount = 0
  let floodedCount = 0
  let cautionCount = 0
  let highDrainageExposure = false

  polyline.forEach((point) => {
    let pointDepth = 0
    let minDistance = Number.POSITIVE_INFINITY

    // Proximity to flooded streets in JalDrishti hydrological forecast
    floodStreets.forEach((street) => {
      const dist = Math.hypot(point.lat - street.latitude, point.lng - street.longitude)
      if (dist < minDistance) {
        minDistance = dist
        if (dist < 0.008) {
          // Proximity weight falloff (~800m zone)
          const factor = Math.max(0, 1 - dist / 0.008)
          pointDepth = Math.max(pointDepth, street.waterDepth * factor)
        }
      }
    })

    // Check low-lying terrain depression zones
    terrainZones.forEach((zone) => {
      const zoneDist = Math.hypot(point.lat - zone.latitude, point.lng - zone.longitude)
      if (zoneDist < 0.007 && zone.accumulationPotential > 0.65) {
        const terrainEffect = (zone.accumulationPotential - 0.45) * (prediction.intensity || 10) * 0.18
        pointDepth = Math.max(pointDepth, terrainEffect)
      }
    })

    // Check drainage surcharge risk
    drainageNodes.forEach((node) => {
      const drainDist = Math.hypot(point.lat - node.lat, point.lng - node.lng)
      if (drainDist < 0.006 && (node.status === 'watch' || surchargeRisk > 0.35)) {
        highDrainageExposure = true
        pointDepth = Math.max(pointDepth, pointDepth + surchargeRisk * 4.5)
      }
    })

    pointDepth = Number(pointDepth.toFixed(1))
    if (pointDepth > 0) {
      sampledPoints += 1
      totalDepth += pointDepth
      maximumWaterDepth = Math.max(maximumWaterDepth, pointDepth)

      if (pointDepth > 30) {
        blockedCount += 1
      } else if (pointDepth >= 15) {
        floodedCount += 1
      } else if (pointDepth >= 5) {
        cautionCount += 1
      }
    }
  })

  maximumWaterDepth = Number(maximumWaterDepth.toFixed(1))
  const averageWaterDepth = sampledPoints > 0 ? Number((totalDepth / sampledPoints).toFixed(1)) : 0
  const roadsAvoided = Math.max(0, floodStreets.length - (blockedCount > 0 ? 1 : 0) - (floodedCount > 0 ? 1 : 0))

  const floodExposure =
    maximumWaterDepth >= 30 ? 'CRITICAL' : maximumWaterDepth >= 15 ? 'HIGH' : maximumWaterDepth >= 5 ? 'MODERATE' : 'LOW'
  const drainageRisk = highDrainageExposure || surchargeRisk > 0.45 ? 'Elevated' : 'Low'

  return {
    maximumWaterDepth,
    averageWaterDepth,
    blockedCount,
    floodedCount,
    cautionCount,
    roadsAvoided,
    floodExposure,
    drainageRisk,
    surchargeRisk,
  }
}

export function calculateRouteSafetyScore(evaluation) {
  const depthPenalty = Math.min(50, Math.pow(evaluation.maximumWaterDepth / 2.8, 1.35))
  const blockedPenalty = evaluation.blockedCount * 35
  const floodedPenalty = evaluation.floodedCount * 14
  const cautionPenalty = evaluation.cautionCount * 4
  const drainagePenalty = evaluation.drainageRisk === 'Elevated' ? 10 : 0

  const rawScore = 100 - depthPenalty - blockedPenalty - floodedPenalty - cautionPenalty - drainagePenalty
  return Math.round(clamp(rawScore, 0, 100))
}

function buildRouteHighlights(status, evaluation, viable) {
  if (status === 'RECOMMENDED' || viable) {
    const highlights = [
      `Avoids ${evaluation.roadsAvoided || 0} predicted flood zones`,
      `${evaluation.blockedCount || 0} blocked roads`,
      evaluation.drainageRisk === 'Elevated' ? 'Moderate drainage surcharge exposure' : 'Low drainage surcharge exposure',
    ]
    if (evaluation.maximumWaterDepth > 0) {
      highlights.push(`Max water depth: ${evaluation.maximumWaterDepth} cm`)
    }
    return highlights
  }

  if (status === 'ALTERNATIVE') {
    return [
      'Secondary passable corridor',
      `Max water depth: ${evaluation.maximumWaterDepth} cm`,
      evaluation.floodedCount > 0 ? `${evaluation.floodedCount} flood-prone segments` : 'Passable under caution',
    ]
  }

  return [
    evaluation.blockedCount > 0 ? `${evaluation.blockedCount} blocked road segment(s)` : `${evaluation.floodedCount} flood-prone segment(s)`,
    `Severe depth reaches ${evaluation.maximumWaterDepth} cm`,
    'High vehicle stalling & submersion risk',
  ]
}

function normalizeGoogleRoute(route, index, origin, destination, time, mode, regionId = DEFAULT_REGION_ID) {
  const prediction = getFloodPrediction(time, regionId)
  const polyline = (route.overview_path || []).map((point) => ({
    lat: typeof point.lat === 'function' ? point.lat() : point.lat,
    lng: typeof point.lng === 'function' ? point.lng() : point.lng,
  }))

  const distanceMeters = (route.legs || []).reduce((sum, leg) => sum + (leg.distance?.value || 0), 0)
  const durationSeconds = (route.legs || []).reduce((sum, leg) => sum + (leg.duration?.value || 0), 0)
  const distanceKm = Number((distanceMeters / 1000).toFixed(1))
  const durationMin = Math.max(1, Math.round(durationSeconds / 60))

  const evaluation = evaluatePolylineAgainstFloodData(polyline, prediction, regionId)
  const safetyScore = calculateRouteSafetyScore(evaluation, distanceKm, durationMin)
  const viable = evaluation.blockedCount === 0 && evaluation.maximumWaterDepth < 30

  let safetyRating = 'UNSAFE'
  if (viable) {
    if (safetyScore >= 80) safetyRating = 'SAFE'
    else if (safetyScore >= 60) safetyRating = 'MODERATE'
    else safetyRating = 'HIGH RISK'
  }

  const status = viable ? (index === 0 ? 'RECOMMENDED' : 'ALTERNATIVE') : 'UNSAFE'
  const highlights = buildRouteHighlights(status, evaluation, viable)

  const reason = viable
    ? `Route remains navigable with ${evaluation.blockedCount} blocked segments and ${evaluation.maximumWaterDepth} cm maximum predicted water depth.`
    : `Severe flood risk detected along this corridor. Maximum predicted water depth reaches ${evaluation.maximumWaterDepth} cm with ${evaluation.blockedCount} impassable segments.`

  return {
    id: `google-route-${index}`,
    name: viable ? (index === 0 ? 'RECOMMENDED SAFE ROUTE' : 'ALTERNATIVE ROUTE') : 'SHORTEST BUT UNSAFE',
    source: typeof origin === 'string' ? origin : 'Start Location',
    target: typeof destination === 'string' ? destination : 'Destination',
    distance: distanceKm,
    travelTime: durationMin,
    polyline,
    coordinates: polyline,
    routePolyline: polyline,
    maximumWaterDepth: evaluation.maximumWaterDepth,
    floodDepth: evaluation.maximumWaterDepth,
    averageWaterDepth: evaluation.averageWaterDepth,
    floodExposure: evaluation.floodExposure,
    blockedRoads: evaluation.blockedCount,
    blockedSegments: evaluation.blockedCount,
    floodedSegments: evaluation.floodedCount,
    cautionSegments: evaluation.cautionCount,
    roadsAvoided: evaluation.roadsAvoided,
    drainageRisk: evaluation.drainageRisk,
    risk: evaluation.floodExposure,
    safetyScore,
    safetyRating,
    status,
    sourceType: 'google',
    viable,
    reason,
    highlights,
    googleMapsUrl: buildGoogleMapsDirectionsUrl(origin, destination, mode, regionId),
    segments: (route.legs || []).flatMap((leg) =>
      (leg.steps || []).slice(0, 5).map((step, sIdx) => ({
        id: `g-step-${index}-${sIdx}`,
        name: step.instructions ? step.instructions.replace(/<[^>]*>?/gm, '') : `Segment ${sIdx + 1}`,
        floodDepth: evaluation.averageWaterDepth,
        status: evaluation.blockedCount > 0 ? 'BLOCKED' : evaluation.floodedCount > 0 ? 'FLOODED' : 'OPEN',
        risk: evaluation.floodExposure,
        from: leg.start_address || '',
        to: leg.end_address || '',
      })),
    ),
  }
}

export async function getGoogleRoutes(origin, destination, travelMode = 'Emergency Vehicle', regionId = DEFAULT_REGION_ID) {
  const maps = await loadGoogleMapsApi()
  const directionsService = new maps.DirectionsService()
  const modeKey = travelModeMap[travelMode] || 'DRIVING'
  const suffix = getRoutingGeocodeSuffix(regionId)
  const cityToken = suffix.split(',')[0]

  const locations = getRoadLocations(regionId)
  const originNode = locations.find((l) => l.name.toLowerCase() === (origin || '').trim().toLowerCase() || l.id.toLowerCase() === (origin || '').trim().toLowerCase())
  const destNode = locations.find((l) => l.name.toLowerCase() === (destination || '').trim().toLowerCase() || l.id.toLowerCase() === (destination || '').trim().toLowerCase())

  const originParam = originNode ? { lat: originNode.latitude, lng: originNode.longitude } : ((origin || '').includes(cityToken) ? origin : `${origin}, ${suffix}`)
  const destParam = destNode ? { lat: destNode.latitude, lng: destNode.longitude } : ((destination || '').includes(cityToken) ? destination : `${destination}, ${suffix}`)

  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin: originParam,
        destination: destParam,
        travelMode: maps.TravelMode[modeKey] || maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        unitSystem: maps.UnitSystem.METRIC,
      },
      (result, status) => {
        if (status === 'OK' && result && result.routes?.length) {
          resolve(result.routes)
        } else {
          // If TRANSIT mode failed or returned ZERO_RESULTS, fallback to DRIVING
          if (modeKey === 'TRANSIT' && status !== 'OK') {
            directionsService.route(
              {
                origin: originParam,
                destination: destParam,
                travelMode: maps.TravelMode.DRIVING,
                provideRouteAlternatives: true,
                unitSystem: maps.UnitSystem.METRIC,
              },
              (fallbackResult, fallbackStatus) => {
                if (fallbackStatus === 'OK' && fallbackResult && fallbackResult.routes?.length) {
                  resolve(fallbackResult.routes)
                } else {
                  reject(new Error(status || fallbackStatus || 'Directions request returned no routes.'))
                }
              },
            )
            return
          }
          reject(new Error(status || 'Google Directions request returned no routes.'))
        }
      },
    )
  })
}

export async function calculateGoogleAwareSafeRoute({
  origin,
  destination,
  time = 'NOW',
  mode = 'Emergency Vehicle',
  fallbackStartId,
  fallbackDestinationId,
  regionId = DEFAULT_REGION_ID,
}) {
  const activeRegionId = resolveRegionId(regionId)
  const regionConfig = getRegionConfig(activeRegionId)
  const resolvedOrigin = origin || regionConfig.defaultOrigin
  const resolvedDestination = destination || regionConfig.defaultDestination
  const { startId, destinationId } = resolveRoadLocationIds(resolvedOrigin, resolvedDestination, activeRegionId)
  const resolvedStartId = fallbackStartId || startId
  const resolvedDestId = fallbackDestinationId || destinationId

  const fallbackResult = calculateSafeRoute(resolvedStartId, resolvedDestId, time, mode, activeRegionId)
  const demonstrationNotice = `JalDrishti demonstration route for ${regionConfig.shortName || regionConfig.name}. Simulated flood-aware corridors — not live Google routing.`

  const apiKey = getGoogleMapsApiKey()
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_GOOGLE_MAPS_API_KEY')) {
    return {
      ...fallbackResult,
      googleMapsAvailable: false,
      sourceType: 'simulation',
      notice: demonstrationNotice,
    }
  }

  try {
    const rawRoutes = await getGoogleRoutes(resolvedOrigin, resolvedDestination, mode, activeRegionId)
    if (!rawRoutes || rawRoutes.length === 0) {
      return {
        ...fallbackResult,
        googleMapsAvailable: false,
        sourceType: 'simulation',
        notice: demonstrationNotice,
      }
    }

    // Normalize and evaluate each Google route against JalDrishti flood prediction
    const evaluatedRoutes = rawRoutes
      .slice(0, 3)
      .map((route, index) => normalizeGoogleRoute(route, index, resolvedOrigin, resolvedDestination, time, mode, activeRegionId))

    // 1. Identify shortest route (by distance)
    const sortedByDistance = [...evaluatedRoutes].sort((a, b) => a.distance - b.distance)
    const shortestCandidate = sortedByDistance[0]

    // 2. Rank all routes by SAFETY SCORE (highest safety score first)
    // Core Differentiator: Safety must have higher priority than shortest distance!
    evaluatedRoutes.sort((a, b) => b.safetyScore - a.safetyScore)

    const viableRoutes = evaluatedRoutes.filter((r) => r.viable)
    const recommended = viableRoutes[0] || evaluatedRoutes[0] || null
    const alternative = viableRoutes.length > 1 ? viableRoutes[1] : evaluatedRoutes.find((r) => r !== recommended) || null

    // Shortest normal route is kept separately for comparison
    let shortestNormal = shortestCandidate
    if (shortestNormal && shortestNormal.id === recommended?.id) {
      // If shortest is also the recommended safe route, find an alternative or keep it
      shortestNormal = evaluatedRoutes.find((r) => r.id !== recommended?.id) || shortestCandidate
    }

    // Update names & status descriptions
    if (recommended) {
      recommended.name = 'RECOMMENDED SAFE ROUTE'
      recommended.status = 'RECOMMENDED'
      recommended.reason = recommended.maximumWaterDepth < (shortestNormal?.maximumWaterDepth || 30)
        ? `Recommended because it maintains a safe maximum water depth of ${recommended.maximumWaterDepth} cm and avoids ${recommended.roadsAvoided} critical flood zones, outperforming shorter but flooded alternatives.`
        : `Recommended corridor with lowest surface runoff risk and clear drainage nodes.`
    }
    if (alternative && alternative.id !== recommended?.id) {
      alternative.name = 'ALTERNATIVE ROUTE'
      alternative.status = 'ALTERNATIVE'
      alternative.reason = `Alternative viable option with ${alternative.maximumWaterDepth} cm predicted water accumulation.`
    }
    if (shortestNormal && shortestNormal.id !== recommended?.id) {
      const isUnsafe = shortestNormal.safetyScore < 60 || !shortestNormal.viable || shortestNormal.maximumWaterDepth >= 25
      shortestNormal.name = isUnsafe ? 'SHORTEST BUT UNSAFE' : 'SHORTEST NORMAL ROUTE'
      shortestNormal.status = isUnsafe ? 'UNSAFE' : 'PASSABLE'
      shortestNormal.reason = isUnsafe
        ? `Shortest direct route reaches ${shortestNormal.maximumWaterDepth} cm predicted flood depth with ${shortestNormal.blockedSegments} blocked road segment(s).`
        : `Direct shortest corridor with ${shortestNormal.travelTime} min ETA.`
    }

    const locations = getRoadLocations(activeRegionId)
    const [centerLat, centerLng] = regionConfig.center || [20.5937, 78.9629]
    const startNode = locations.find((l) => l.id === resolvedStartId) || { id: resolvedStartId, name: resolvedOrigin, latitude: centerLat, longitude: centerLng }
    const destNode = locations.find((l) => l.id === resolvedDestId) || { id: resolvedDestId, name: resolvedDestination, latitude: centerLat, longitude: centerLng }

    return {
      regionId: activeRegionId,
      start: startNode,
      destination: destNode,
      time,
      mode,
      segments: fallbackResult.segments,
      routes: evaluatedRoutes,
      recommended,
      alternative: alternative?.id !== recommended?.id ? alternative : null,
      shortestNormal: shortestNormal?.id !== recommended?.id ? shortestNormal : null,
      availableSafeRoutes: viableRoutes.length,
      noSafeRouteAvailable: viableRoutes.length === 0,
      googleMapsAvailable: true,
      sourceType: 'google',
      notice: `Google Maps real-world routing active for ${regionConfig.shortName || regionConfig.name}. JalDrishti flood scoring applied to all route alternatives.`,
      floodHotspots: (getFloodPrediction(time, activeRegionId).streets || []).filter((street) => street.waterDepth > 0),
    }
  } catch (error) {
    return {
      ...fallbackResult,
      googleMapsAvailable: false,
      sourceType: 'simulation',
      notice: demonstrationNotice,
      googleError: error?.message || 'Google Maps API error',
    }
  }
}
