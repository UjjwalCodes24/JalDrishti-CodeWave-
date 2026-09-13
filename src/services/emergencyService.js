import { getFloodPrediction } from './floodEngine.js'
import { calculateSafeRoute, getRoadNetwork } from './routingService.js'
import { getRegionConfig } from './regionService.js'


export function getEmergencySnapshot(time = 'NOW', regionId = 'mumbai') {
  const region = getRegionConfig(regionId)
  const prediction = getFloodPrediction(time, regionId)
  const network = getRoadNetwork(regionId)
  const affected = prediction.streets.filter((street) => street.waterDepth >= 15)
  const critical = prediction.streets.filter((street) => street.risk === 'CRITICAL')
  
  const origin = region?.defaultOrigin || (network.nodes.length > 0 ? network.nodes[0].name : 'Origin')
  const destination = region?.defaultDestination || (network.nodes.length > 1 ? network.nodes[1].name : 'Destination')
  const route = calculateSafeRoute(origin, destination, time, 'Emergency Vehicle', regionId)
  
  return {
    prediction,
    affected,
    critical,
    route,
    network,
    criticalZones: critical.length,
    roadsAffected: affected.length,
    firstImpact: critical.length ? '~45 min' : '~60 min',
    region
  }
}

export function getRoadDecision(street) {
  if (street.waterDepth >= 60) return { status: 'CLOSE', action: 'Restrict all non-emergency vehicles' }
  if (street.waterDepth >= 30) return { status: 'RESTRICT', action: 'Emergency access only' }
  if (street.waterDepth >= 15) return { status: 'RESTRICT', action: 'Monitor and limit heavy vehicles' }
  return { status: 'OPEN WITH CAUTION', action: 'Monitor continuously' }
}

