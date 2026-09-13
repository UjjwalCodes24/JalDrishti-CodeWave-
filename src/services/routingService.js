import { getRegionConfig, DEFAULT_REGION_ID, resolveRegionId } from '../data/regions/index.js'
import { getSafeRouteDataset } from '../data/routes/index.js'
import { getFloodPrediction } from './floodEngine.js'


const statusPenalty = { OPEN: 1, CAUTION: 1.35, FLOODED: 4.5, BLOCKED: Number.POSITIVE_INFINITY }
const modeWeights = {
  'Emergency Vehicle': { safety: 2.2, time: 1.2, access: 1.5, travelMode: 'driving' },
  Car: { safety: 1.8, time: 1.1, access: 1, travelMode: 'driving' },
  Commuter: { safety: 1.8, time: 1.1, access: 1, travelMode: 'driving' },
  'Public Transport': { safety: 1.6, time: 0.9, access: 2.4, travelMode: 'transit' },
  Walking: { safety: 1.9, time: 1.3, access: 1.1, travelMode: 'walking' },
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function getRoadNetwork(regionId = DEFAULT_REGION_ID) {
  return getSafeRouteDataset(regionId).roadNetwork
}

export function getRoadLocations(regionId = DEFAULT_REGION_ID) {
  return getSafeRouteDataset(regionId).locations
}

export function getCrisisCorridors(regionId = DEFAULT_REGION_ID) {
  return getSafeRouteDataset(regionId).crisisCorridors
}

export function getRoutingGeocodeSuffix(regionId = DEFAULT_REGION_ID) {
  const config = getRegionConfig(regionId)
  return config.geocodeSuffix || config.shortName || config.name || 'India'
}

export function resolveRoadLocationIds(origin, destination, regionId = DEFAULT_REGION_ID) {
  const network = getRoadNetwork(regionId)
  const nodes = network.nodes || []
  const normalizedOrigin = (origin || '').trim().toLowerCase()
  const normalizedDestination = (destination || '').trim().toLowerCase()

  const defaultStart = nodes[0]?.id || 'START'
  const defaultDest = nodes[1]?.id || nodes[0]?.id || 'DEST'

  const startId = nodes.find((node) => node.name.toLowerCase() === normalizedOrigin || node.id.toLowerCase() === normalizedOrigin)?.id || defaultStart
  const destinationId = nodes.find((node) => node.name.toLowerCase() === normalizedDestination || node.id.toLowerCase() === normalizedDestination)?.id || defaultDest

  return { startId, destinationId }
}

export function getSegmentStatus(waterDepth) {
  if (waterDepth > 30) return 'BLOCKED'
  if (waterDepth >= 15) return 'FLOODED'
  if (waterDepth >= 5) return 'CAUTION'
  return 'OPEN'
}

export function getFloodAwareSegments(prediction, roadNet) {
  const activeNetwork = roadNet || getRoadNetwork(prediction?.regionId || DEFAULT_REGION_ID)
  const segments = activeNetwork.segments || activeNetwork.edges || []
  return segments.map((segment) => {
    // Check if segment has linked street or directly calculate from proximity/name
    const street = prediction.streets?.find((item) => item.id === segment.floodStreetId || item.id === segment.id || item.name.toLowerCase().includes(segment.name?.toLowerCase()))
    const waterDepth = street ? Number((street.waterDepth * (segment.floodFactor || 1)).toFixed(1)) : (segment.baseDepth || 0)
    const risk = street ? street.risk : (waterDepth >= 30 ? 'CRITICAL' : waterDepth >= 15 ? 'HIGH' : 'LOW')
    return {
      id: segment.id,
      name: segment.name,
      source: segment.source || segment.from,
      target: segment.target || segment.to,
      distance: segment.distance,
      travelTime: segment.travelTime || segment.baseTimeMin || 5,
      floodDepth: waterDepth,
      risk,
      status: getSegmentStatus(waterDepth),
    }
  })
}

function buildAdjacency(segments) {
  return segments.reduce((graph, segment) => {
    const forward = { ...segment, from: segment.source, to: segment.target }
    const reverse = { ...segment, from: segment.target, to: segment.source }
    graph[segment.source] = [...(graph[segment.source] || []), forward]
    graph[segment.target] = [...(graph[segment.target] || []), reverse]
    return graph
  }, {})
}

function enumeratePaths(start, destination, segments) {
  const adjacency = buildAdjacency(segments)
  const paths = []
  function visit(node, path, visited) {
    if (node === destination) {
      paths.push(path)
      return
    }
    if (path.length >= 8) return
    for (const segment of adjacency[node] || []) {
      if (!visited.has(segment.to)) visit(segment.to, [...path, segment], new Set([...visited, segment.to]))
    }
  }
  visit(start, [], new Set([start]))
  return paths
}

function buildNavigationUrl(originName, destName, mode, cityName = 'India') {
  const modeKey = modeWeights[mode]?.travelMode || 'driving'
  const params = new URLSearchParams({
    api: '1',
    origin: originName ? `${originName}, ${cityName}` : cityName,
    destination: destName ? `${destName}, ${cityName}` : cityName,
    travelmode: modeKey,
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function buildRouteHighlights(type, blockedCount, floodedCount, roadsAvoided, maxDepth, surcharge = 0) {
  if (type === 'recommended') {
    return [
      `Avoids ${roadsAvoided || 0} predicted flood zones`,
      `${blockedCount} blocked roads`,
      surcharge > 40 ? 'Moderate drainage exposure' : 'Low drainage exposure',
    ]
  }
  if (type === 'alternative') {
    return [
      'Secondary passable corridor',
      `Max water depth: ${maxDepth} cm`,
      floodedCount > 0 ? `${floodedCount} road(s) with standing water` : 'Passable under caution',
    ]
  }
  return [
    blockedCount > 0 ? `${blockedCount} critical blocked segment(s)` : `${floodedCount} flooded segment(s)`,
    `Severe predicted depth: ${maxDepth} cm`,
    'High vehicle stalling / submersion risk',
  ]
}

function summarizePath(path, mode, startNode, destNode, roadNet, includeBlocked = false, regionId = DEFAULT_REGION_ID) {
  const config = modeWeights[mode] || modeWeights.Commuter
  const distance = path.reduce((sum, segment) => sum + segment.distance, 0)
  const travelTime = path.reduce((sum, segment) => sum + segment.travelTime * (Number.isFinite(statusPenalty[segment.status]) ? statusPenalty[segment.status] : 3), 0)
  const maximumWaterDepth = Math.max(...path.map((segment) => segment.floodDepth), 0)
  const exposure = path.reduce((sum, segment) => sum + segment.floodDepth * segment.distance, 0) / Math.max(distance, 1)
  const blockedItems = path.filter((segment) => segment.status === 'BLOCKED')
  const floodedItems = path.filter((segment) => segment.status === 'FLOODED')
  const cautionItems = path.filter((segment) => segment.status === 'CAUTION')
  const blockedCount = blockedItems.length
  const floodedCount = floodedItems.length
  const cautionCount = cautionItems.length
  const roadsAvoided = blockedCount + floodedCount

  const safetyScore = Math.round(clamp(100 - exposure * 2.1 - blockedCount * 28 - floodedCount * 12 - cautionCount * 3, 0, 100))
  const routeCost = distance * 1.1 + travelTime * config.time + exposure * config.safety + floodedCount * config.access * 12 + blockedCount * 1000
  const viable = blockedCount === 0 && maximumWaterDepth < 30

  // Coordinates array for mapping
  const nodeLookup = Object.fromEntries((roadNet.nodes || []).map((node) => [node.id, node]))
  const coordinates = []
  path.forEach((segment) => {
    const s = nodeLookup[segment.from || segment.source]
    const t = nodeLookup[segment.to || segment.target]
    if (s && !coordinates.some((p) => p.lat === s.latitude && p.lng === s.longitude)) {
      coordinates.push({ lat: s.latitude, lng: s.longitude })
    }
    if (t) {
      coordinates.push({ lat: t.latitude, lng: t.longitude })
    }
  })

  return {
    distance: Number(distance.toFixed(1)),
    travelTime: Math.max(1, Math.round(travelTime)),
    maximumWaterDepth,
    floodDepth: maximumWaterDepth,
    exposureScore: Number(exposure.toFixed(1)),
    safetyScore,
    blockedSegments: blockedCount,
    floodedSegments: floodedCount,
    cautionSegments: cautionCount,
    blockedRoads: blockedCount,
    roadsAvoided,
    routeCost,
    includeBlocked,
    viable,
    floodExposure: maximumWaterDepth >= 30 ? 'CRITICAL' : maximumWaterDepth >= 15 ? 'HIGH' : maximumWaterDepth >= 5 ? 'MODERATE' : 'LOW',
    drainageRisk: maximumWaterDepth > 20 ? 'Elevated' : 'Low',
    risk: maximumWaterDepth >= 30 ? 'CRITICAL' : maximumWaterDepth >= 15 ? 'HIGH' : maximumWaterDepth >= 5 ? 'MODERATE' : 'LOW',
    sourceType: 'simulation',
    coordinates,
    polyline: coordinates,
    routePolyline: coordinates,
    segments: path.map((segment) => ({
      id: segment.id,
      name: segment.name,
      floodDepth: segment.floodDepth,
      status: segment.status,
      risk: segment.risk,
      from: segment.from || segment.source,
      to: segment.to || segment.target,
    })),
    googleMapsUrl: buildNavigationUrl(startNode?.name, destNode?.name, mode, getRoutingGeocodeSuffix(regionId)),
  }
}

function routeReason(route) {
  const blockingRoad = route.segments.find((s) => s.status === 'BLOCKED' || s.status === 'FLOODED')
  if (!blockingRoad) return 'Route remains passable with low predicted water accumulation.'
  const reason = blockingRoad.status === 'BLOCKED' ? 'blocked' : 'unsafe for normal travel'
  return `Route ${reason} because ${blockingRoad.name} is predicted to reach ${blockingRoad.floodDepth} cm water depth.`
}

export function calculateSafeRoute(startId, destinationId, time = 'NOW', mode = 'Emergency Vehicle', regionId = DEFAULT_REGION_ID) {
  const activeRegionId = resolveRegionId(regionId)
  const prediction = typeof time === 'string' ? getFloodPrediction(time, activeRegionId) : time
  const roadNet = getRoadNetwork(activeRegionId)
  const nodes = roadNet.nodes || []

  const regionConfig = getRegionConfig(activeRegionId)
  const [centerLat, centerLng] = regionConfig.center || [20.5937, 78.9629]
  const startNode = nodes.find((node) => node.id === startId) || nodes[0] || { id: 'START', name: 'Origin', latitude: centerLat, longitude: centerLng }
  const destNode = nodes.find((node) => node.id === destinationId) || nodes[1] || nodes[0] || { id: 'DEST', name: 'Destination', latitude: centerLat, longitude: centerLng }

  const segments = getFloodAwareSegments(prediction, roadNet)
  const allPaths = enumeratePaths(startNode.id, destNode.id, segments)
  const safePaths = allPaths.filter((path) => !path.some((segment) => segment.status === 'BLOCKED'))

  const summarizedSafe = safePaths
    .map((path) => summarizePath(path, mode, startNode, destNode, roadNet, false, activeRegionId))
    .sort((a, b) => b.safetyScore - a.safetyScore || a.routeCost - b.routeCost)

  const normalRoute = allPaths
    .map((path) => summarizePath(path, mode, startNode, destNode, roadNet, true, activeRegionId))
    .sort((a, b) => a.distance - b.distance)[0]

  const recommendedRaw = summarizedSafe[0] || null
  const alternativeRaw = summarizedSafe.find((route) => route !== recommendedRaw) || null

  const recommended = recommendedRaw
    ? {
        ...recommendedRaw,
        id: 'sim-route-recommended',
        source: startNode.name,
        target: destNode.name,
        name: 'FLOOD-SAFE ROUTE',
        safetyRating: recommendedRaw.safetyScore >= 80 ? 'SAFE' : 'MODERATE',
        status: 'RECOMMENDED',
        reason: routeReason(recommendedRaw),
        highlights: buildRouteHighlights('recommended', recommendedRaw.blockedSegments, recommendedRaw.floodedSegments, recommendedRaw.roadsAvoided, recommendedRaw.maximumWaterDepth),
      }
    : null

  const alternative = alternativeRaw
    ? {
        ...alternativeRaw,
        id: 'sim-route-alternative',
        source: startNode.name,
        target: destNode.name,
        name: 'ALTERNATIVE ROUTE',
        safetyRating: alternativeRaw.safetyScore >= 65 ? 'MODERATE' : 'HIGH RISK',
        status: 'ALTERNATIVE',
        reason: routeReason(alternativeRaw),
        highlights: buildRouteHighlights('alternative', alternativeRaw.blockedSegments, alternativeRaw.floodedSegments, alternativeRaw.roadsAvoided, alternativeRaw.maximumWaterDepth),
      }
    : null

  const shortestNormal = normalRoute
    ? {
        ...normalRoute,
        id: 'sim-route-shortest',
        source: startNode.name,
        target: destNode.name,
        name: normalRoute.blockedSegments > 0 || normalRoute.maximumWaterDepth >= 30 ? 'SHORTEST BUT UNSAFE' : 'SHORTEST ROUTE',
        safetyRating: normalRoute.blockedSegments > 0 || normalRoute.floodedSegments > 0 ? 'UNSAFE' : normalRoute.cautionSegments > 0 ? 'HIGH RISK' : 'SAFE',
        status: normalRoute.blockedSegments > 0 || normalRoute.maximumWaterDepth >= 30 ? 'UNSAFE' : 'PASSABLE',
        reason: routeReason(normalRoute),
        highlights: buildRouteHighlights('shortest', normalRoute.blockedSegments, normalRoute.floodedSegments, normalRoute.roadsAvoided, normalRoute.maximumWaterDepth),
      }
    : null

  const routes = [recommended, alternative, shortestNormal].filter(Boolean)

  return {
    regionId: activeRegionId,
    start: startNode,
    destination: destNode,
    time: prediction?.time || 'NOW',
    mode,
    segments,
    routes,
    recommended,
    alternative,
    shortestNormal,
    availableSafeRoutes: summarizedSafe.length,
    noSafeRouteAvailable: summarizedSafe.length === 0,
    blockedRoads: segments.filter((segment) => segment.status === 'BLOCKED'),
    googleMapsAvailable: false,
    sourceType: 'simulation',
    notice: `JalDrishti demonstration route for ${regionConfig.shortName || regionConfig.name}. Simulated flood-aware corridors — not live Google routing.`,
    floodHotspots: (prediction?.streets || []).filter((street) => street.waterDepth > 0),
  }
}
