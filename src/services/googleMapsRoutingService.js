import { getFloodPrediction } from './floodEngine.js'
import { calculateSafeRoute, resolveRoadLocationIds, getRoadLocations, getRoutingGeocodeSuffix } from './routingService.js'
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
  return import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY || ''
}

export function buildGoogleMapsDirectionsUrl(origin, destination, travelMode = 'Emergency Vehicle', regionId = DEFAULT_REGION_ID) {
  const suffix = getRoutingGeocodeSuffix(regionId)

  const formatEndpoint = (ep) => {
    if (!ep) return suffix
    if (typeof ep === 'object') {
      const lat = ep.lat ?? ep.latitude
      const lng = ep.lng ?? ep.longitude
      if (lat != null && lng != null) {
        const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat)
        const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng)
        return `${parsedLat},${parsedLng}`
      }
      return ep.name || ep.label || suffix
    }
    const str = String(ep).trim()
    // Parse coordinates from string if present (e.g. "Current Location (28.7057° N, 77.1043° E)" or "28.7057, 77.1043")
    const coordMatch = str.match(/(-?\d+(?:\.\d+)?)[°\s,NS]*[,\s]+(-?\d+(?:\.\d+)?)/i)
    if (coordMatch && !isNaN(parseFloat(coordMatch[1])) && !isNaN(parseFloat(coordMatch[2]))) {
      return `${parseFloat(coordMatch[1])},${parseFloat(coordMatch[2])}`
    }
    return str || suffix
  }

  const originStr = formatEndpoint(origin)
  const destStr = formatEndpoint(destination)
  const navMode = googleNavModeMap[travelMode] || 'driving'
  const cityToken = suffix.split(',')[0].trim().toLowerCase()

  const isCoord = (str) => /^-?\d+(?:\.\d+)?[,\s]+-?\d+(?:\.\d+)?$/.test(str.trim())
  const originQuery = isCoord(originStr) ? originStr.replace(/\s+/g, '') : (originStr.toLowerCase().includes(cityToken) ? originStr : `${originStr}, ${suffix}`)
  const destQuery = isCoord(destStr) ? destStr.replace(/\s+/g, '') : (destStr.toLowerCase().includes(cityToken) ? destStr : `${destStr}, ${suffix}`)

  const params = new URLSearchParams({
    api: '1',
    origin: originQuery,
    destination: destQuery,
    travelmode: navMode,
  })

  // Ensure origin and destination coordinates maintain literal commas in URL for Google Maps
  return `https://www.google.com/maps/dir/?${params.toString().replace(/%2C/g, ',')}`
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

export async function reverseGeocodeCoordinates(lat, lng) {
  try {
    const maps = await loadGoogleMapsApi()
    if (!maps?.Geocoder) return null
    const geocoder = new maps.Geocoder()
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].formatted_address)
        } else {
          resolve(null)
        }
      })
    })
  } catch {
    return null
  }
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
  const cityToken = suffix.split(',')[0].trim().toLowerCase()

  const locations = getRoadLocations(regionId)

  const parseEndpoint = (endpoint) => {
    if (!endpoint) return suffix
    if (typeof endpoint === 'object') {
      const lat = endpoint.lat ?? endpoint.latitude
      const lng = endpoint.lng ?? endpoint.longitude
      if (lat != null && lng != null) {
        return { lat: Number(lat), lng: Number(lng) }
      }
      return endpoint.name || endpoint.label || suffix
    }
    const str = String(endpoint).trim()
    const coordMatch = str.match(/(-?\d+(?:\.\d+)?)[°\s,NS]*[,\s]+(-?\d+(?:\.\d+)?)/i)
    if (coordMatch && !isNaN(parseFloat(coordMatch[1])) && !isNaN(parseFloat(coordMatch[2]))) {
      return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) }
    }
    const node = locations.find((l) => l.name.toLowerCase() === str.toLowerCase() || l.id.toLowerCase() === str.toLowerCase())
    if (node) {
      return { lat: node.latitude, lng: node.longitude }
    }
    return str.toLowerCase().includes(cityToken) ? str : `${str}, ${suffix}`
  }

  const originParam = parseEndpoint(origin)
  const destParam = parseEndpoint(destination)

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
  const [centerLat, centerLng] = regionConfig.center || [20.5937, 78.9629]
  const locations = getRoadLocations(activeRegionId)

  // Extract explicit GPS coordinates if passed as object or coordinate string
  const extractCoords = (ep) => {
    if (!ep) return null
    if (typeof ep === 'object' && (ep.lat != null || ep.latitude != null)) {
      return { lat: Number(ep.lat ?? ep.latitude), lng: Number(ep.lng ?? ep.longitude) }
    }
    if (typeof ep === 'string') {
      const match = ep.match(/(-?\d+(?:\.\d+)?)[°\s,NS]*[,\s]+(-?\d+(?:\.\d+)?)/i)
      if (match && !isNaN(parseFloat(match[1])) && !isNaN(parseFloat(match[2]))) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
      }
    }
    return null
  }

  const originCoords = extractCoords(origin)
  const destCoords = extractCoords(destination)

  const resolvedOrigin = originCoords || origin || regionConfig.defaultOrigin
  const resolvedDestination = destCoords || destination || regionConfig.defaultDestination

  const originLabel = originCoords
    ? 'CURRENT LOCATION'
    : (typeof resolvedOrigin === 'string' ? resolvedOrigin : regionConfig.defaultOrigin)

  const destLabel = destCoords
    ? 'DESTINATION'
    : (typeof resolvedDestination === 'string' ? resolvedDestination : regionConfig.defaultDestination)

  const { startId, destinationId } = resolveRoadLocationIds(originLabel, destLabel, activeRegionId)
  const resolvedStartId = fallbackStartId || startId
  const resolvedDestId = fallbackDestinationId || destinationId

  const fallbackResult = calculateSafeRoute(resolvedStartId, resolvedDestId, time, mode, activeRegionId)
  const demonstrationNotice = `JalDrishti demonstration route for ${regionConfig.shortName || regionConfig.name}. Simulated flood-aware corridors — not live Google routing.`

  // Always compute the explicit external navigation URL using actual origin (coords or name) and destination
  const explicitGoogleMapsUrl = buildGoogleMapsDirectionsUrl(
    originCoords || resolvedOrigin,
    destCoords || resolvedDestination,
    mode,
    activeRegionId
  )

  const startNode = originCoords
    ? {
        id: 'user-current-location',
        name: 'CURRENT LOCATION',
        latitude: originCoords.lat,
        longitude: originCoords.lng,
      }
    : (locations.find((l) => l.name.toLowerCase() === originLabel.toLowerCase() || l.id.toLowerCase() === originLabel.toLowerCase()) || {
        id: resolvedStartId || 'custom-origin',
        name: originLabel,
        latitude: centerLat,
        longitude: centerLng,
      })

  const destNode = destCoords
    ? {
        id: 'user-custom-destination',
        name: typeof destination === 'string' ? destination : 'DESTINATION',
        latitude: destCoords.lat,
        longitude: destCoords.lng,
      }
    : (locations.find((l) => l.name.toLowerCase() === destLabel.toLowerCase() || l.id.toLowerCase() === destLabel.toLowerCase()) || {
        id: resolvedDestId || 'custom-destination',
        name: destLabel,
        latitude: centerLat,
        longitude: centerLng,
      })

  const sanitizeFallbackResult = (result, extraNotice = null, errorMsg = null) => {
    const updatedRoutes = (result.routes || []).map((r) => {
      let coords = r.coordinates || r.polyline || []
      if (originCoords && coords.length > 0) {
        coords = [{ lat: originCoords.lat, lng: originCoords.lng }, ...coords]
      }
      return {
        ...r,
        source: originCoords ? 'CURRENT LOCATION' : r.source,
        googleMapsUrl: explicitGoogleMapsUrl,
        coordinates: coords,
        polyline: coords,
        routePolyline: coords,
      }
    })

    const updatedRecommended = result.recommended
      ? {
          ...result.recommended,
          source: originCoords ? 'CURRENT LOCATION' : result.recommended.source,
          googleMapsUrl: explicitGoogleMapsUrl,
          coordinates: originCoords && (result.recommended.coordinates?.length || 0) > 0
            ? [{ lat: originCoords.lat, lng: originCoords.lng }, ...result.recommended.coordinates]
            : result.recommended.coordinates,
          polyline: originCoords && (result.recommended.polyline?.length || 0) > 0
            ? [{ lat: originCoords.lat, lng: originCoords.lng }, ...result.recommended.polyline]
            : result.recommended.polyline,
          routePolyline: originCoords && (result.recommended.routePolyline?.length || 0) > 0
            ? [{ lat: originCoords.lat, lng: originCoords.lng }, ...result.recommended.routePolyline]
            : result.recommended.routePolyline,
        }
      : null

    const updatedAlternative = result.alternative
      ? {
          ...result.alternative,
          source: originCoords ? 'CURRENT LOCATION' : result.alternative.source,
          googleMapsUrl: explicitGoogleMapsUrl,
        }
      : null

    const updatedShortest = result.shortestNormal
      ? {
          ...result.shortestNormal,
          source: originCoords ? 'CURRENT LOCATION' : result.shortestNormal.source,
          googleMapsUrl: explicitGoogleMapsUrl,
        }
      : null

    return {
      ...result,
      start: startNode,
      destination: destNode,
      routes: updatedRoutes,
      recommended: updatedRecommended,
      alternative: updatedAlternative,
      shortestNormal: updatedShortest,
      googleMapsAvailable: false,
      sourceType: 'simulation',
      notice: extraNotice || demonstrationNotice,
      googleError: errorMsg,
    }
  }

  const apiKey = getGoogleMapsApiKey()
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_GOOGLE_MAPS_API_KEY')) {
    return sanitizeFallbackResult(fallbackResult)
  }

  try {
    const rawRoutes = await getGoogleRoutes(resolvedOrigin, resolvedDestination, mode, activeRegionId)
    if (!rawRoutes || rawRoutes.length === 0) {
      return sanitizeFallbackResult(fallbackResult)
    }

    // Normalize and evaluate each Google route against JalDrishti flood prediction
    const evaluatedRoutes = rawRoutes
      .slice(0, 3)
      .map((route, index) => {
        const normalized = normalizeGoogleRoute(route, index, resolvedOrigin, resolvedDestination, time, mode, activeRegionId)
        return {
          ...normalized,
          source: originCoords ? 'CURRENT LOCATION' : normalized.source,
          googleMapsUrl: explicitGoogleMapsUrl,
        }
      })

    // 1. Identify shortest route (by distance)
    const sortedByDistance = [...evaluatedRoutes].sort((a, b) => a.distance - b.distance)
    const shortestCandidate = sortedByDistance[0]

    // 2. Rank all routes by SAFETY SCORE (highest safety score first)
    evaluatedRoutes.sort((a, b) => b.safetyScore - a.safetyScore)

    const viableRoutes = evaluatedRoutes.filter((r) => r.viable)
    const recommended = viableRoutes[0] || evaluatedRoutes[0] || null
    const alternative = viableRoutes.length > 1 ? viableRoutes[1] : evaluatedRoutes.find((r) => r !== recommended) || null

    let shortestNormal = shortestCandidate
    if (shortestNormal && shortestNormal.id === recommended?.id) {
      shortestNormal = evaluatedRoutes.find((r) => r.id !== recommended?.id) || shortestCandidate
    }

    if (recommended) {
      recommended.name = 'RECOMMENDED SAFE ROUTE'
      recommended.status = 'RECOMMENDED'
      recommended.googleMapsUrl = explicitGoogleMapsUrl
      recommended.source = originCoords ? 'CURRENT LOCATION' : recommended.source
      recommended.reason = recommended.maximumWaterDepth < (shortestNormal?.maximumWaterDepth || 30)
        ? `Recommended because it maintains a safe maximum water depth of ${recommended.maximumWaterDepth} cm and avoids ${recommended.roadsAvoided} critical flood zones, outperforming shorter but flooded alternatives.`
        : `Recommended corridor with lowest surface runoff risk and clear drainage nodes.`
    }
    if (alternative && alternative.id !== recommended?.id) {
      alternative.name = 'ALTERNATIVE ROUTE'
      alternative.status = 'ALTERNATIVE'
      alternative.googleMapsUrl = explicitGoogleMapsUrl
      alternative.source = originCoords ? 'CURRENT LOCATION' : alternative.source
      alternative.reason = `Alternative viable option with ${alternative.maximumWaterDepth} cm predicted water accumulation.`
    }
    if (shortestNormal && shortestNormal.id !== recommended?.id) {
      const isUnsafe = shortestNormal.safetyScore < 60 || !shortestNormal.viable || shortestNormal.maximumWaterDepth >= 25
      shortestNormal.name = isUnsafe ? 'SHORTEST BUT UNSAFE' : 'SHORTEST NORMAL ROUTE'
      shortestNormal.status = isUnsafe ? 'UNSAFE' : 'PASSABLE'
      shortestNormal.googleMapsUrl = explicitGoogleMapsUrl
      shortestNormal.source = originCoords ? 'CURRENT LOCATION' : shortestNormal.source
      shortestNormal.reason = isUnsafe
        ? `Shortest direct route reaches ${shortestNormal.maximumWaterDepth} cm predicted flood depth with ${shortestNormal.blockedSegments} blocked road segment(s).`
        : `Direct shortest corridor with ${shortestNormal.travelTime} min ETA.`
    }

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
    return sanitizeFallbackResult(fallbackResult, null, error?.message || 'Google Maps API error')
  }
}

