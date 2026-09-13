import { DEFAULT_REGION_ID, resolveRegionId } from '../regions/index.js'
import delhiRoutes from './delhi.js'
import mumbaiRoutes from './mumbai.js'
import chennaiRoutes from './chennai.js'

export const ROUTES_BY_REGION = {
  delhi: delhiRoutes,
  mumbai: mumbaiRoutes,
  chennai: chennaiRoutes,
}

function normalizeRoadNetwork(roadNetwork) {
  const network = roadNetwork || { nodes: [], edges: [], segments: [] }
  const edges = network.edges || network.segments || []
  return {
    ...network,
    nodes: network.nodes || [],
    edges,
    segments: network.segments || edges,
  }
}

export function getSafeRouteDataset(regionId = DEFAULT_REGION_ID) {
  const resolved = resolveRegionId(regionId)
  const dataset = ROUTES_BY_REGION[resolved] || ROUTES_BY_REGION[DEFAULT_REGION_ID]
  const roadNetwork = normalizeRoadNetwork(dataset.roadNetwork)

  return {
    ...dataset,
    regionId: dataset.regionId,
    roadNetwork,
    locations: roadNetwork.nodes,
    crisisCorridors: dataset.crisisCorridors || [],
  }
}

export { delhiRoutes, mumbaiRoutes, chennaiRoutes }
